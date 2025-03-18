import json
import os
import io
import sys
import zipfile
import subprocess
import tempfile
import boto3
from boto3.s3.transfer import TransferConfig
from urllib.parse import urlparse
import data_layer
from datetime import datetime
import settings
import secrets
import string

def mysql_dump_table_to_zipfile(table_name, zip_entry, batch_size=1000):
    conn = data_layer.get_mysql_connect()
    zip_entry.write(f'''
-- MySQL dump by Python
-- 创建时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
-- 服务器版本: {conn.get_server_info()}
-- Python 版本: {sys.version}

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

'''.encode('utf-8'))

    cursor = conn.cursor()
    cursor.execute(f"SHOW CREATE TABLE `{table_name}`".encode('utf-8'))
    create_table = cursor.fetchone()[1]
    zip_entry.write(f"\n--\n-- 表结构 `{table_name}`\n--\n\n".encode('utf-8'))
    zip_entry.write(f"DROP TABLE IF EXISTS `{table_name}`;\n".encode('utf-8'))
    zip_entry.write((create_table + ";\n\n").encode('utf-8'))

    cursor.execute(f"SELECT * FROM `{table_name}`")
    rows = cursor.fetchall()
    if not rows:
        return
    zip_entry.write(f"\n--\n-- 表数据 `{table_name}`\n--\n\n".encode('utf-8'))
    zip_entry.write("LOCK TABLES `{}` WRITE;\n".format(table_name).encode('utf-8'))
    zip_entry.write("/*!40000 ALTER TABLE `{}` DISABLE KEYS */;\n".format(table_name).encode('utf-8'))

    # 获取列名
    cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
    columns = [column[0] for column in cursor.fetchall()]
    column_names = "`, `".join(columns)
    
    # 分批处理数据，避免生成过大的 INSERT 语句
    total_rows = len(rows)
    for i in range(0, total_rows, batch_size):
        batch = rows[i:i + batch_size]
        values_list = []
        
        for row in batch:
            values = []
            for value in row:
                if value is None:
                    values.append("NULL")
                elif isinstance(value, (int, float)):
                    values.append(str(value))
                elif isinstance(value, bytes):
                    values.append("_binary '{}'".format(value.hex()))
                elif isinstance(value, datetime):
                    values.append("'{}'".format(value.strftime('%Y-%m-%d %H:%M:%S')))
                else:
                    # 转义字符串中的特殊字符
                    escaped_value = str(value).replace("'", "''").replace("\\", "\\\\")
                    values.append("'{}'".format(escaped_value))
            values_list.append("(" + ", ".join(values) + ")")
        
        if values_list:
            zip_entry.write(f"INSERT INTO `{table_name}` (`{column_names}`) VALUES\n".encode('utf-8'))
            zip_entry.write((",\n".join(values_list) + ";\n").encode('utf-8'))
    
    zip_entry.write("/*!40000 ALTER TABLE `{}` ENABLE KEYS */;\n".format(table_name).encode('utf-8'))
    zip_entry.write("UNLOCK TABLES;\n".encode('utf-8'))

def mysql_dump_table(s3_bucket, s3_key, dump_tables = []):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', compression=zipfile.ZIP_DEFLATED) as zip_file:
        for table in dump_tables:
            with zip_file.open(table + '.sql', 'w') as zip_entry:
                mysql_dump_table_to_zipfile(table, zip_entry)
    # 将缓冲区内容上传到 S3
    zip_buffer.seek(0)
    s3 = boto3.client('s3')
    config = TransferConfig(
        multipart_threshold=1024 * 25,  # 25MB
        max_concurrency=10,
        multipart_chunksize=1024 * 25,  # 25MB
        use_threads=True
    )
    s3.upload_fileobj(zip_buffer, s3_bucket, s3_key, Config=config)
    return {
        'statusCode': 200,
        'body': f'successfully exported to s3://{s3_bucket}/{s3_key}'
    }

def mysql_dump(tables):
    timestr = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    return mysql_dump_table(settings.S3_BUCKET, f"export-sql/{timestr}.zip", tables.split(','))

def download_from_s3(s3_path):
    """
    Download file from S3
    Args:
        s3_path: S3 URL (s3://bucket-name/path/to/file)
    Returns:
        str: Path to downloaded file
    """
    parsed = urlparse(s3_path)
    bucket = parsed.netloc
    key = parsed.path.lstrip('/')
    
    # Create temp directory if it doesn't exist
    temp_dir = '/tmp/s3_files'
    os.makedirs(temp_dir, exist_ok=True)
    
    # Download file
    local_path = os.path.join(temp_dir, os.path.basename(key))
    s3_client = boto3.client('s3')
    print(f'download file form s3://{bucket}/{key} to {local_path}')
    s3_client.download_file(bucket, key, local_path)
    
    return local_path

def get_city_id(ip:str):
    cityid = data_layer.get_cityid_by_ip(ip)
    return cityid

def exec_sql(sql):
    if sql == 'init_db':
        return data_layer.mysql_create_database()
    ret = data_layer.mysql_batch_execute(sql)
    return {
        "status": 200,
        "msg": ret
    }

def exec_sqlfile(sql_file):
    """
    Execute SQL from a file or zip archive, supporting both local and S3 files
    Args:
        sql_file: Path to .sql file or .zip containing SQL files
                 Can be local path or S3 URL (s3://bucket-name/path/to/file)
    Returns:
        dict: Execution result
    """
    try:
        print(f'exec_sql {sql_file}')
        # Handle S3 files
        if sql_file.startswith('s3://'):
            local_file = download_from_s3(sql_file)
            sql_file = local_file

        # Handle zip files
        if sql_file.endswith('.zip'):
            temp_dir = '/tmp/sql_files'
            os.makedirs(temp_dir, exist_ok=True)
            
            with zipfile.ZipFile(sql_file, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            
            results = []
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    print(f'exec_sql zipfile {file}')
                    if file.endswith('.sql'):
                        sql_path = os.path.join(root, file)
                        with open(sql_path, 'r') as f:
                            sql_content = f.read()
                        data_layer.mysql_batch_execute(sql_content)
                        print(f'exec_sql zipfile {file} finish.')
                        results.append(f'Executed {file}')
            
            # Cleanup
            os.system(f'rm -rf {temp_dir}')
            return {
                'status': 200,
                'msg': 'Executed all SQL files from zip',
                'details': results
            }
        
        # Handle SQL files
        elif sql_file.endswith('.sql'):
            with open(sql_file, 'r') as f:
                sql_content = f.read()
            data_layer.mysql_batch_execute(sql_content)
            print(f'exec_sql {sql_file} finish.')
            return {
                'status': 200,
                'msg': f'Executed SQL file: {sql_file}'
            }
        
        else:
            return {
                'status': 404,
                'msg': 'Invalid file type. Must be .sql or .zip'
            }
            
    except Exception as e:
        return {
            'status': 500,
            'msg': str(e)
        }
    finally:
        # Cleanup any downloaded S3 files
        if sql_file.startswith('/tmp/s3_files/'):
            try:
                os.remove(sql_file)
            except:
                pass

def create_user(username):
    password = secrets.choice(string.ascii_uppercase) + ''.join(secrets.choice(string.ascii_lowercase) for _ in range(3)) + ''.join(secrets.choice(string.digits) for _ in range(3)) + secrets.choice(".,;@#$%^!")
    print(f'generate password for {username}: {password}')
    ret = data_layer.create_user(username, password, settings.AUTH_ADMIN)
    print(ret)
    return ret

# Example usage:
# event = {"action":"exec_sqlfile","param":"update.sql"}
# event = {"action":"exec_sqlfile","param":"updates.zip"}
# event = {"action":"exec_sqlfile","param":"s3://my-bucket/sql/update.sql"}
# event = {"action":"exec_sqlfile","param":"s3://my-bucket/sql/updates.zip"}
# event = {"action":"exec_sql","param":"init_db"}
# event = {"action":"exec_sql","param":"select * from asn;"}
# event = {"action":"create_user","param":"myuser"}
# event = {"action":"mysql_dump","param":"country,city,asn,iprange,cityset"}
# or s3 notify message
def lambda_handler(event, context):
    try:
        # Handle S3 notifications
        ret = {"status":404, "msg":"not found"}
        if 'Records' in event:
            for record in event['Records']:
                bucket = record['s3']['bucket']['name']
                key = record['s3']['object']['key']
                event_name = record['eventName']
                print(f"Processing event {event_name} exec_sql for {bucket}/{key}")
                ret = exec_sqlfile(f's3://{bucket}/{key}')
            return ret

        # Handle direct function calls
        action = event.get('action')
        if not action:
            return ret

        # Get the function from current module's globals
        func = globals().get(action)
        if not func or not callable(func):
            return {"status": 404, "msg": f"Action '{action}' not found or not callable"}

        param = event.get('param')
        print(f'process action: {action} param: {param}')
        if param:
            ret = func(param)
        else:
            ret = func()
        return ret

    except Exception as e:
        return {
            "status": 500,
            "msg": f"Error processing request: {str(e)}"
        }

# local test
if __name__ == "__main__":
    import sys
    print(sys.argv[1])
    ret = lambda_handler(json.loads(sys.argv[1]), None)
    print(ret)