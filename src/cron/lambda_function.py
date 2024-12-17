import json
import os
import zipfile
import boto3
from urllib.parse import urlparse
import data_layer

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

# Example usage:
# event = {"action":"exec_sqlfile","param":"update.sql"}
# event = {"action":"exec_sqlfile","param":"updates.zip"}
# event = {"action":"exec_sqlfile","param":"s3://my-bucket/sql/update.sql"}
# event = {"action":"exec_sqlfile","param":"s3://my-bucket/sql/updates.zip"}
# event = {"action":"exec_sql","param":"init_db"}
# event = {"action":"exec_sql","param":"select * from asn;"}
# or s3 notify message
def lambda_handler(event, context):
    try:
        # 定时 1 分钟
        # 如果 queue 中队列数超过 xxx 了，退出本次刷新
        # 检查 iprange 表，根据 lastcheck_time 排序，找出 lastcheck_time < now - 7days 的数据，准备进行更新
        # 通过 start_ip end_ip city_id 来更新对应 pingable 表的数据，更新 lastresult 左移1位并填充0，表示这个ip最新数据没有更新了
        # 检查 pingable 表，删除 lastresult 全为 0 的条目，因为该ip已经连续不可ping了（就算新的任务他又可ping了，重新插入就是）
        # 提交 start_ip end_ip city_id 的 ping 探测任务到 queue 中，queue 陆续完成探测任务时，会去更新对应 ip 的 lastresult 值，把新移位的值置为1，不存在的会插入

        # 定时 1 分钟
        # 

        # statistics 只记录最新数据
        # 每日通过 update_time 把增量变化部分落 s3
        # 通过 athena 查历史数据
        # Handle S3 notifications
        ret = {"status":404, "msg":"not found"}
        if 'Records' in event:
            for record in event['Records']:
                bucket = record['s3']['bucket']['name']
                key = record['s3']['object']['key']
                event_name = record['eventName']
                print(f"Processing event {event_name} for {bucket}/{key}")
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