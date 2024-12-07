import os
import json
import boto3
import data_layer

sqs = boto3.client('sqs')

'''
requests: {
    version: "apigw-httpapi2.0",
    srcip: "72.21.198.64",
    useragent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    next: "qwedewf",
    method: "GET",
    body: "",
    path: "/"
}
'''
def fping_logic(requests):
    ret = {"job":[],"next":"","interval":3600,"status":200}
    if requests['method'] == 'POST':
        jobResult = json.loads(requests['body'])
    if requests['useragent'].startswith('fping-watchmen'):
        # get ping job here
        pass
    else:
        pass
    cityid = data_layer.get_cityid_by_ip(requests['srcip'])
    if cityid != 0:
        print(cityid)
    ret["job"].append({
        "jobid": "123-1",
        "command": "fping -g 8.8.8.5 8.8.8.10 -r 2 -a -q",
    })
    ret["job"].append({
        "jobid": "123-2",
        "command": "fping -g 1.1.1.0 1.1.1.3 -r 2 -a -q",
    })
    ret["job"].append({
        "jobid": "123-3",
        "command": "fping -g 110.242.68.1 110.242.68.10 -r 2 -a -q",
    })
    ret["next"] = "sfkR1xjer"
    ret["interval"] = 10
    return {
        'statusCode': 200,
        'result': ret
    }

def lambda_handler(event, context):
    queue_url = os.environ.get('FPING_QUEUE');
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
        message_body = message['Body']
        print(f'Processing message: {message_body}')

        # 处理消息的逻辑...

        # 删除已处理的消息
        sqs.delete_message(
            QueueUrl=queue_url,
            ReceiptHandle=message['ReceiptHandle']
        )
        print(f'Deleted message: {message_body}')

    return {
        'statusCode': 200,
        'body': 'Message processing complete'
    }
