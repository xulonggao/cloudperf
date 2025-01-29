import os
import json
import boto3
import requests
import ipaddress
import subprocess
from urllib.parse import urlencode

sqs = boto3.client('sqs')

def lambda_handler(event, context):
    queue_url = os.environ.get('FPING_QUEUE');
    post_url = os.environ.get('API_URL');
    print(event)
    #response = sqs.receive_message(
    #    QueueUrl=queue_url,
    #    MaxNumberOfMessages=2,
    #    VisibilityTimeout=60,    # 消息可见性超时时间(秒)
    #    WaitTimeSeconds=20       # 长轮询等待时间(秒)
    #)
    messages = event['Records']

    # 处理消息
    for message in messages:
        message_body = message['body']
        print(f'Processing message: {message_body}')

        # 处理消息的逻辑...
        obj = json.loads(message_body)
        if obj['type'] == 'pingable':
            stip = ipaddress.IPv4Address(obj['start_ip'])
            etip = ipaddress.IPv4Address(obj['end_ip'])
            try:
                # 执行命令并捕获输出
                result = subprocess.run(
                    f"/opt/bin/fping-lambda -g {stip} {etip} -r 2 -a -q", shell=True,
                    check=True,  # 如果命令返回非零退出码则抛出异常
                    capture_output=True,  # 捕获标准输出和错误
                    text=True  # 将输出解码为字符串
                )
                # 按行分割结果
                json_data = {
                    "jobid": obj['city_id'],
                    "stdout": result.stdout.strip(),
                    "stderr": result.stderr.strip(),
                    "status": result.returncode
                }
                print(json_data)
                response = requests.post(url=post_url + "?" + urlencode(obj), json=json_data, headers={'Content-Type': 'application/json'}, timeout=90)
                response.raise_for_status()
                print(response.json())
            except requests.exceptions.RequestException as e:
                print(f"Error sending request: {e}")
                #raise
            except subprocess.CalledProcessError as e:
                print(f"Error executing command: {e}")
                print(f"Error output: {e.stderr}")
                #raise
            except Exception as e:
                print(f"Unexpected error: {e}")
                #raise

        # 删除已处理的消息
        sqs.delete_message(
            QueueUrl=queue_url,
            ReceiptHandle=message['receiptHandle']
        )
        print(f'Deleted message: {message_body}')

    return {
        'statusCode': 200,
        'body': 'Message processing complete'
    }
