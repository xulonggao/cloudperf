import json
import os
import data_layer
import settings
#import ipaddress

# Example usage:
# event = {"action":"cron","param":"update by exec"}
def lambda_handler(event, context):
    # 定时 1 分钟
    # 如果 queue 中队列数超过 100 了，退出本次刷新
    queue_url = os.environ.get('FPING_QUEUE')
    if not queue_url:
        return {
            'status': 400,
            'msg': 'FPING_QUEUE environment variable is not set'
        }
    data_layer.refresh_iprange_check(queue_url)

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