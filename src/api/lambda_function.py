import json
import data_layer

def webapi_stats(requests):
    return {
        'statusCode': 200,
        'result': {
            "activeNodes": 234,
            "avgLatency": "45ms",
            "networkStatus": "98.5%",
            "regions": 12
        }
    }

def webapi_performance(requests):
    return {
        'statusCode': 200,
        'result': [
            {
                "name": "00:00",
                "latency": 45,
                "throughput": 240
            }
        ]
    }

def webapi_regions(requests):
    return {
        'statusCode': 200,
        'result': [
            {
            "name": "NA",
            "value": 4000
            }
        ]
    }

def webapi_latency(requests):
    return {
        'statusCode': 200,
        'result': [
            {"from": 'Mumbai', "to": 'New York', "latency": 243},
            {"from": 'Australia', "to": 'New York', "latency": 253}
        ]
    }

def webapi_country(requests):
    return {
        'statusCode': 200,
        'result': ['United States', 'China', 'Japan', 'Germany', 'United Kingdom', 'France', 'India', 'Canada', 'Brazil', 'Australia']
    }

def webapi_city(requests):
    return {
        'statusCode': 200,
        'result': ['New York', 'Tokyo', 'London', 'Paris', 'Shanghai', 'Hong Kong', 'Singapore', 'Sydney', 'Mumbai', 'Toronto']
    }

def webapi_asn(requests):
    return {
        'statusCode': 200,
        'result': ['AS7922 Comcast', 'AS3356 Level 3', 'AS701 Verizon', 'AS2914 NTT', 'AS6939 Hurricane Electric', 'AS4134 China Telecom', 'AS9808 China Mobile', 'AS20940 Akamai', 'AS16509 Amazon', 'AS15169 Google']
    }


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
    print(event)
    if 'logic' in event:
        pass
    requests = {'version': '1.0'}
    if 'version' in event:
        if event['version'] == '2.0':
            requests = {
                'version': 'apigw-httpapi2.0',
                'srcip': event['requestContext']['http']['sourceIp'],
                'useragent': event['requestContext']['http']['userAgent'],
                'method': event['requestContext']['http']['method'],
                'body': event['body'] if 'body' in event else null,
                'path': event['requestContext']['http']['path']
            }
        elif event['version'] == '1.0':
            requests = {
                'version': 'apigw-httpapi1.0',
                'srcip': event['requestContext']['identity']['sourceIp'],
                'useragent': event['requestContext']['identity']['userAgent'],
                'method': event['requestContext']['httpMethod'],
                'body': event['body'],
                'path': event['requestContext']['path']
            }
    else:
        # 健康检查字段：
        # {'requestContext': {'elb': {'targetGroupArn': 'arn:aws:elasticloadbalancing:us-east-1:675857233193:targetgroup/Cloudp-cloud-Y6ZDQYYVEO72/ba784127f812d2e6'}},
        # 'httpMethod': 'GET', 'path': '/', 'queryStringParameters': {}, 'headers': {'user-agent': 'ELB-HealthChecker/2.0'}, 
        # 'body': '', 'isBase64Encoded': False}
        requests = {
            'version': 'alb',
            'srcip': event['headers']['x-forwarded-for'] if 'x-forwarded-for' in event['headers'] else '',
            'useragent': event['headers']['user-agent'],
            'method': event['httpMethod'],
            'body': event['body'],
            'path': event['path']
        }
    querys = event['queryStringParameters']
    requests['next'] = querys['next'] if 'next' in querys else ''
    print(requests)
    apimapping = {
        '/job':fping_logic,
        '/api/stats': webapi_stats,
        '/ap1i/performance': webapi_performance,
        '/ap1i/regions': webapi_regions,
        '/ap1i/latency': webapi_latency,
        '/ap1i/country': webapi_country,
        '/ap1i/city': webapi_city,
        '/ap1i/asn': webapi_asn,
    }
    if requests['path'] not in apimapping:
        if requests['useragent'].startswith('ELB-HealthChecker/2.0'):
            ret = {'statusCode':200, 'result':'healthly'}
        else:
            ret = {'statusCode':404, 'result':'not found'}
    else:
        ret = apimapping[requests['path']](requests)
    #ret['result']['debug'] = event;
    #ret['result']['requests'] = requests;
    if requests['version'] == 'apigw-httpapi2.0':
        return {
            'statusCode': ret['statusCode'],
            'body': json.dumps(ret['result'])
        }
    return {
        'statusCode': ret['statusCode'],
        "headers": {
            "Content-Type": "application/json"
        },
        'body': json.dumps(ret['result'])
    }

# local test
if __name__ == "__main__":
    import sys
    print(sys.argv[1])
    ret = lambda_handler(json.loads(sys.argv[1]), None)
    print(ret)