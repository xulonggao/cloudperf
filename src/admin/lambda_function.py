import json
import os
import io
import zipfile
import subprocess
import tempfile
import boto3
from urllib.parse import urlparse
import data_layer
from datetime import datetime
import settings
import secrets
import string

def mysql_restore(sqlfile):
    # 设置环境变量，确保可以找到库文件
    os.environ['LD_LIBRARY_PATH'] = os.path.join(os.environ['LAMBDA_TASK_ROOT'], 'lib')
    try:
        options = event.get('options', [])
        # 记录开始时间
        start_time = time.time()
        print(f"Starting database restore from {sqlfile}")
        # 设置环境变量以避免在命令行中显示密码
        env = os.environ.copy()
        env['MYSQL_PWD'] = db_password
        # 构建 mysql 命令
        mysql_path = os.path.join(os.environ['LAMBDA_TASK_ROOT'], 'bin', 'mysql')
        cmd = [
            mysql_path,
            '-h', settings.DB_WRITE_HOST,
            '-u', settings.DB_USER,
            '-P', str(settings.DB_PORT),
            '--default-character-set=utf8mb4',
            settings.DB_DATABASE,
        ]        
        # 执行 mysql 命令
        print(f"Executing mysql restore command: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdin=open(temp_file.name, 'r'),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env
        )
        stdout, stderr = process.communicate()
        if process.returncode != 0:
            error_msg = stderr.decode('utf-8')
            print(f"MySQL restore failed: {error_msg}")
            return {
                'statusCode': 500,
                'body': f'Database restore failed: {error_msg}'
            }
        # 计算执行时间
        execution_time = time.time() - start_time
        print(f"Database restore completed successfully in {execution_time:.2f} seconds")
        return {
            'statusCode': 200,
            'body': f'Database successfully restored from {sqlfile}',
            'executionTime': f'{execution_time:.2f} seconds'
        }
    except subprocess.SubprocessError as e:
        print(f"Subprocess error: {str(e)}")
        return {
            'statusCode': 500,
            'body': f'Error executing mysql command: {str(e)}'
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'body': f'Unexpected error: {str(e)}'
        }

def mysql_dump_table(s3_bucket, s3_key, dump_tables = []):
    # 设置环境变量，确保可以找到库文件
    os.environ['LD_LIBRARY_PATH'] = os.path.join(os.environ['LAMBDA_TASK_ROOT'], 'lib')
    # 创建临时文件
    with tempfile.NamedTemporaryFile(suffix='.sql') as temp_file:
        # 设置环境变量以避免在命令行中显示密码
        env = os.environ.copy()
        env['MYSQL_PWD'] = settings.DB_PASS
        # 构建 mysqldump 命令
        mysqldump_path = os.path.join(os.environ['LAMBDA_TASK_ROOT'], 'bin', 'mysqldump')
        cmd = [
            mysqldump_path,
            '-h', settings.DB_READ_HOST,
            '-u', settings.DB_USER,
            '-P', str(settings.DB_PORT),
            '--single-transaction',
            '--databases', settings.DB_DATABASE
        ]
        if len(dump_tables) > 0:
            cmd.extend(dump_tables)
        try:
            dump_process = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        env=env
                    )
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
                with zipf.open('export.zip', 'w') as f:
                    while True:
                        chunk = dump_process.stdout.read(4096)
                        if not chunk:
                            break
                        f.write(chunk)

            _, stderr = dump_process.communicate()
            if dump_process.returncode != 0:
                error_msg = stderr.decode('utf-8')
                print(f"mysqldump failed: {error_msg}")
                return {
                    'statusCode': 500,
                    'body': f'Database export failed: {error_msg}'
                }
            # 将缓冲区内容上传到 S3
            zip_buffer.seek(0)
            s3 = boto3.client('s3')
            s3.upload_fileobj(zip_buffer, s3_bucket, s3_key)
            return {
                'statusCode': 200,
                'body': f'Database {db_name} successfully exported to s3://{s3_bucket}/{s3_key}'
            }
        except subprocess.CalledProcessError as e:
            return {
                'statusCode': 500,
                'body': f'Error executing mysqldump: {str(e)}'
            }
        except Exception as e:
            return {
                'statusCode': 500,
                'body': f'Error: {str(e)}'
            }

def mysql_dump(tables):
    timestr = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    return mysql_dump_table(settings.S3_BUCKET, f"export-sql/{timestr}-base.zip", tables.split(','))

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
                        mysql_restore(sql_path)
                        # with open(sql_path, 'r') as f:
                        #    sql_content = f.read()
                        # data_layer.mysql_batch_execute(sql_content)
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
            mysql_restore(sql_file)
            # with open(sql_file, 'r') as f:
            #    sql_content = f.read()
            # data_layer.mysql_batch_execute(sql_content)
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