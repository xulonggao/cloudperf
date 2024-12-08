import json
import os
import zipfile
import boto3
from urllib.parse import urlparse
from data_layer import mysql_runsql

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
    s3_client.download_file(bucket, key, local_path)
    
    return local_path

def init_database():
    """Initialize the database with base schema"""
    with open('init.sql', 'r') as f:
        sql_content = f.read()
    mysql_runsql(sql_content)
    return {'status': 'success', 'message': 'Database initialized'}

def exec_sql(sql_file):
    """
    Execute SQL from a file or zip archive, supporting both local and S3 files
    Args:
        sql_file: Path to .sql file or .zip containing SQL files
                 Can be local path or S3 URL (s3://bucket-name/path/to/file)
    Returns:
        dict: Execution result
    """
    try:
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
                    if file.endswith('.sql'):
                        sql_path = os.path.join(root, file)
                        with open(sql_path, 'r') as f:
                            sql_content = f.read()
                        mysql_runsql(sql_content)
                        results.append(f'Executed {file}')
            
            # Cleanup
            os.system(f'rm -rf {temp_dir}')
            return {
                'status': 'success',
                'message': 'Executed all SQL files from zip',
                'details': results
            }
        
        # Handle SQL files
        elif sql_file.endswith('.sql'):
            with open(sql_file, 'r') as f:
                sql_content = f.read()
            mysql_runsql(sql_content)
            return {
                'status': 'success',
                'message': f'Executed SQL file: {sql_file}'
            }
        
        else:
            return {
                'status': 'error',
                'message': 'Invalid file type. Must be .sql or .zip'
            }
            
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }
    finally:
        # Cleanup any downloaded S3 files
        if sql_file.startswith('/tmp/s3_files/'):
            try:
                os.remove(sql_file)
            except:
                pass

# Example usage:
# event = {'action': 'init_database'}
# event = {'action': 'exec_sql', 'param': 'update.sql'}
# event = {'action': 'exec_sql', 'param': 'updates.zip'}
# event = {'action': 'exec_sql', 'param': 's3://my-bucket/sql/update.sql'}
# event = {'action': 'exec_sql', 'param': 's3://my-bucket/sql/updates.zip'}
def lambda_handler(event, context):
    ret = {"status":404, "msg":"not found"}
    # s3 notify
    if 'Records' in event:
        for record in event['Records']:
            # 获取S3事件信息
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']
            event_name = record['eventName']
            print(f"Processing event {event_name} for {bucket}/{key}")
            exec_sql(f's3://{bucket}/{key}')
    else:
        action = event.get('action')
        param = event.get('param')
        func = getattr(globals(), action)
        if param:
            func(param)
        else:
            func(event)
    return ret
