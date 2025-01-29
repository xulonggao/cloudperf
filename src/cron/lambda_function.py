import json
import os
import data_layer
#import ipaddress

# Example usage:
# event = {"action":"exec_sqlfile","param":"update.sql"}
# event = {"action":"exec_sqlfile","param":"updates.zip"}
# event = {"action":"exec_sqlfile","param":"s3://my-bucket/sql/update.sql"}
# event = {"action":"exec_sqlfile","param":"s3://my-bucket/sql/updates.zip"}
# event = {"action":"exec_sql","param":"init_db"}
# event = {"action":"exec_sql","param":"select * from asn;"}
# or s3 notify message
def lambda_handler(event, context):
    # 定时 1 分钟
    # 如果 queue 中队列数超过 100 了，退出本次刷新
    queue_url = os.environ.get('FPING_QUEUE')
    if not queue_url:
        return {
            'status': 400,
            'msg': 'FPING_QUEUE environment variable is not set'
        }
    # 获取队列大小
    result = data_layer.get_sqs_queue_size(queue_url)
    print(result)
    if result['statusCode'] != 200:
        return {
            'status': result['statusCode'],
            'msg': result['error']
        }
    if result['queue_size']['visible_messages'] >= 100:
        return {
            'status': 200,
            'msg': 'Queue is busy, skip this round'
        }
    # 检查 iprange 表，根据 lastcheck_time 排序，找出 lastcheck_time < now - 7days 的数据，准备进行更新
    datas = data_layer.check_expired_iprange(days=14, limit=2)

    print(datas)

    # 通过 start_ip end_ip city_id 来更新对应 pingable 表的数据，更新 lastresult 右移1位高位为0，表示这个ip最新数据没有更新了
    # 检查 pingable 表，删除 lastresult 全为 0 的条目，因为该ip已经连续不可ping了（就算新的任务他又可ping了，重新插入就是）
    messages = []
    for data in datas:
        print(data)
        data_layer.update_pingable_result(data['city_id'], data['start_ip'], data['end_ip'])
        subnets = data_layer.split_ip_range(data['start_ip'], data['end_ip'])
        for subnet in subnets:
            messages.append({"type": "pingable", "start_ip": subnet[0], "end_ip": subnet[1], "city_id": data['city_id']})
    # 提交 start_ip end_ip city_id 的 ping 探测任务到 queue 中，queue 陆续完成探测任务时，会去更新对应 ip 的 lastresult 值，把新移位的值置为1000b，不存在的会插入
    result = data_layer.send_sqs_messages_batch(queue_url, messages)
    print(result)

    # 定时 1 分钟
    # statistics 只记录最新数据
    # 每日通过 update_time 把增量变化部分落 s3
    # 通过 athena 查历史数据
    # Handle S3 notifications

# local test
if __name__ == "__main__":
    import sys
    print(sys.argv[1])
    ret = lambda_handler(json.loads(sys.argv[1]), None)
    print(ret)