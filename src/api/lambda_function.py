import json
import settings
import data_layer
import ipaddress
from urllib.parse import unquote_plus

def webapi_status(requests):
    return {
        'statusCode': 200,
        'result': {
            "activeNodes": 214,
            "avgLatency": 31,
            "uptime": "97.9",
            "lastUpdate": "2025-01-04T01:53:37.308Z"
        }
    }

def webapi_statistics(requests):
    data = data_layer.query_statistics_data()
    return {
        'statusCode': 200,
        'result': data
    }

# //fixme，由于相同asn在同一个城市有多个asn号码，会造成选择cityid时少了，如：RU,Moscow,PJSC Rostelecom
# //fixme, city名字中有空格，貌似搜索有问题，如：DE,Frankfurt am Main 出不来16509，测试ip：63.176.70.29
# ?src=US-NYC-7922,US-NYC-3356&dist=US-SFO-16509,US-SFO-15169
def webapi_performance(requests):
    if 'src' not in requests['query'] or 'dist' not in requests['query']:
        return {'statusCode': 400, 'result': 'param src and dist not found!'}
    src = unquote_plus(requests['query']['src'])
    dist = '2228836286,922075495,2265478952,2498629220' #unquote_plus(requests['query']['dist'])
    latencyData = data_layer.get_latency_data_cross_city(src, dist)
    print(latencyData)
    # [{'src': 1395638387, 'dist': 922075495, 'samples': Decimal('10'), 'min': 19600, 'max': 22200, 'avg': Decimal('20700.0000'), 'p50': Decimal('20000.0000'), 'p70': Decimal('21300.0000'), 'p90': Decimal('22000.0000'), 'p95': Decimal('22000.0000')},{},{}]
    # src,dist,samples,min,max,avg,p50,p70,p90,p95",
    # "1395638387,2228836286,10,23900,25500,24600.0000,24600.0000,24800.0000,25100.0000,25100.0000",
    if latencyData == None:
        return {'statusCode': 400, 'result': 'param src and dist invalid!'}
    data = {
        'srcCityIds': {},
        'distCityIds': {}
    }
    for item in latencyData:
        if item['src'] not in data['srcCityIds']:
            data['srcCityIds'][item['src']] = {'samples':0, 'data':0}
        data['srcCityIds'][item['src']]['samples'] += item['samples']
        data['srcCityIds'][item['src']]['data'] += item['p70'] * item['samples']
        if item['dist'] not in data['distCityIds']:
            data['distCityIds'][item['dist']] = {'samples':0, 'data':0}
        data['distCityIds'][item['dist']]['samples'] += item['samples']
        data['distCityIds'][item['dist']]['data'] += item['p70'] * item['samples']
    '''
    样本所在延迟的区间
    samples / latency
    样本数量饼图
    p70最大的五个src，p70最大的五个dist
    聚合完所有数据后得出：
        p70最大的五个asn，p70最大的五个asn
        p70最大的五个city，p70最大的五个city
    '''
    return {
        'statusCode': 200,
        'result': {
            "samples": 1000,
            "srcCityIds": src.count(','),
            "distCityIds": dist.count(','),
            "avgLatency": 45,
            "p70Latency": 50,
            "p90Latency": 42,
            "p95Latency": 42,
            "latencySeriesData": [
                {"latency": 50, "samples": 100},
                {"latency": 60, "samples": 10},
                {"latency": 80, "samples": 20},
                {"latency": 60, "samples": 30},
                {"latency": 65, "samples": 15},
            ],
            "timeSeriesData": [
                {"date": "2025-01-04","avgLatency": 50},
                {"date": "2025-01-03","avgLatency": 52},
                {"date": "2025-01-02","avgLatency": 48},
                {"date": "2025-01-01","avgLatency": 39},
                {"date": "2024-12-31","avgLatency": 48},
                {"date": "2024-12-30","avgLatency": 45},
                {"date": "2024-12-29","avgLatency": 51}
            ],
            "asnData": [
                {"asn": "AS7922","avgLatency": 42},
                {"asn": "AS3356","avgLatency": 48}
            ],
            "cityData": [
                {"city": "New York","avgLatency": 45},
                {"city": "San Francisco","avgLatency": 55}
            ],
            "sourceLocations": [
                {"cityId": "US-NYC-7922","asn": "7922","latitude": 45.68122565778718,"longitude": -116.72670125958872},
                {"cityId": "US-NYC-3356","asn": "3356","latitude": 45.905292481682665,"longitude": -114.04344943278507}
            ],
            "destLocations": [
                {"cityId": "US-SFO-16509","asn": "16509","latitude": 42.24565280543524,"longitude": -65.55765414750672},
                {"cityId": "US-SFO-15169","asn": "15169","latitude": 45.52876173811771,"longitude": -73.46462807876824}
            ],
            "latencyData": [
                {"sourceCityId": "US-NYC-7922","sourceAsn": "7922","sourceLat": 45.68122565778718,"sourceLon": -116.72670125958872,
                "destCityId": "US-SFO-16509","destAsn": "16509","destLat": 42.24565280543524,"destLon": -65.55765414750672,"latency": 69},
                {"sourceCityId": "US-NYC-7922","sourceAsn": "7922","sourceLat": 45.68122565778718,"sourceLon": -116.72670125958872,
                "destCityId": "US-SFO-15169","destAsn": "15169","destLat": 45.52876173811771,"destLon": -73.46462807876824,"latency": 23},
                {"sourceCityId": "US-NYC-3356","sourceAsn": "3356","sourceLat": 45.905292481682665,"sourceLon": -114.04344943278507,
                "destCityId": "US-SFO-16509","destAsn": "16509","destLat": 42.24565280543524,"destLon": -65.55765414750672,"latency": 33},
                {"sourceCityId": "US-NYC-3356","sourceAsn": "3356","sourceLat": 45.905292481682665,"sourceLon": -114.04344943278507,
                "destCityId": "US-SFO-15169","destAsn": "15169","destLat": 45.52876173811771,"destLon": -73.46462807876824,"latency": 63}
            ]
        }
    }

# {username: "admin", password: "admin"}
def webapi_login(requests):
    return {
        'statusCode': 200,
        'result': {
            "token": "mock-jwt-token"
        }
    }

# country=US&city=US-NYC
def webapi_asn(requests):
    asns = []
    if 'country' in requests['query'] and len(requests['query']['country']) >= 2:
        if 'city' in requests['query'] and len(requests['query']['city']) >= 2:
            asns = data_layer.get_asns_by_country_city(requests['query']['country'], requests['query']['city'])
    return {
        'statusCode': 200,
        'result': asns
    }

def webapi_country(requests):
    countrys = data_layer.get_countrys()
    return {
        'statusCode': 200,
        'result': countrys
    }

# country=CN
def webapi_city(requests):
    result = []
    if 'country' in requests['query'] and len(requests['query']['country']) >= 2:
        result = data_layer.get_citys_by_country_code(requests['query']['country'])
    return {
        'statusCode': 200,
        'result': result
    }

# get
# post {name: "aws_temp", cityIds: ["1395638387", "1494300631", "2690672425", "2957825709"]}
# put {id: 1, name: "US East Coast1", cityIds: ["US-NYC-7922", "US-NYC-3356"]}
# delete /api/cityset?id=2
# return [{"id": 1,"name": "US","cityIds": ["1494300631", "2690672425"]},{"id": 2,"name": "USA","cityIds": ["2957825709", "2690672425"]}]
def webapi_cityset(requests):
    ret = []
    if requests['method'] == 'GET':
        ret = data_layer.get_citysets()
        ret = [
            {**item, 'cityIds': item['cityIds'].split(',') if item.get('cityIds') else []}
            for item in ret
        ]
    elif requests['method'] == 'POST':
        data = json.loads(requests['body'])
        ret = data_layer.add_cityset(data['name'], data['cityIds'])
    elif requests['method'] == 'PUT':
        data = json.loads(requests['body'])
        ret = data_layer.edit_cityset(int(data['id']), data['name'], data['cityIds'])
    elif requests['method'] == 'DELETE':
        ret = data_layer.del_cityset(int(requests['query']['id']))
    return {
        'statusCode': 200,
        'result': ret
    }

def webapi_runsql(requests):
    sql = json.loads(requests['body'])
    ret = data_layer.mysql_batch_execute(sql['sql'])
    return {
        "statusCode": 200,
        "result": ret
    }

# GET /api/redis?key=test
# PUT /api/redis {key: "get", value: "val2"}
# DELETE /api/redis?key=test
def webapi_redis(requests):
    if requests['method'] == 'PUT':
        data = json.loads(requests['body'])
        data_layer.cache_set(data['key'], data['value'])
        return {
            'statusCode': 200,
            'result': data['value']
        }
    elif requests['method'] == 'GET':
        if 'key' in requests['query']:
            value = data_layer.cache_get(requests['query']['key'])
            return {
                'statusCode': 200,
                'result': value
            }
    elif requests['method'] == 'DELETE':
        if 'key' in requests['query']:
            data_layer.cache_delete(requests['query']['key'])
            return {
                'statusCode': 200,
                'result': "ok"
            }
    return {
        'statusCode': 400,
        'result': "not support method."
    }

# ip=136.227.141.146 2296614290
def webapi_ipinfo(requests):
    if 'ip' not in requests['query']:
        return {'statusCode': 400, 'result':'need param ip.'}
    city = data_layer.get_cityobject_by_ip(requests['query']['ip'])
    if len(city) == 0:
        return {'statusCode': 404, 'result':'not found.'}
    print(city)
    return {
        "statusCode": 200,
        "result": city[0]
    }

# filter=amazon
def webapi_asninfo(requests):
    if 'filter' not in requests['query']:
        return {'statusCode': 400, 'result':'need param filter.'}
    filter = requests['query']['filter']
    if len(filter) <= 2:
        return {'statusCode': 400, 'result':'The keyword length must be greater than 3.'}
    # (38661, 'KR', 'hosting', 405760, 'abcle', '', datetime.datetime(2025, 1, 4, 3, 47, 37))
    citys = data_layer.get_cityobject_by_keyword(filter)
    return {
        'statusCode': 200,
        'result': citys
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
        if 'next' in requests['query']:
            next = requests['query']['next']
        else:
            next = ''
        for obj in jobResult:
            # obj['status'] = 0 success 256 partial success
            # obj['stderr'] -> 1.6.81.7 : duplicate for [0], 64 bytes, 468 ms
            stdout = obj['stdout'].split('\n')
            ips = []
            for out in stdout:
                if out.startswith('[DEBUG]'):
                    continue
                ips.append(out)
            print(f"jobid: {obj['jobid']} status: {obj['status']} ips: {len(ips)}")
            print(ips)
            if len(ips) > 0:
                if obj['jobid'].startswith('ping'):
                    data_layer.update_pingable_result(int(obj['jobid'][4:]), ips)
    if requests['useragent'].startswith('fping-pingable'):
        # get ping job here, ensure buffer data enough
        data_layer.refresh_iprange_check()
        for i in range(0, 3):
            obj = data_layer.cache_pop(settings.CACHEKEY_PINGABLE)
            if obj:
                stip = ipaddress.IPv4Address(obj['start_ip'])
                etip = ipaddress.IPv4Address(obj['end_ip'])
                print(f"fetch job: {stip} {etip} {obj['city_id']}")
                ret["job"].append({
                    "jobid": 'ping' + str(obj['city_id']),
                    # disable stderr log here with 2> /dev/null
                    "command": f"fping -g {stip} {etip} -r 2 -a -q 2> /dev/null",
                })
            else:
                break
        if len(ret["job"]) > 0:
            ret["next"] = 'pingable'
            ret["interval"] = 10
    else:
        cityid = data_layer.get_cityobject_by_ip(requests['srcip'])
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
        # https://docs.aws.amazon.com/zh_cn/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.response
        if event['version'] == '2.0':
            requests = {
                'version': 'apigw-httpapi2.0',
                'srcip': event['requestContext']['http']['sourceIp'],
                'useragent': event['requestContext']['http']['userAgent'],
                'method': event['requestContext']['http']['method'],
                'body': event['body'] if 'body' in event else null,
                'path': event['requestContext']['http']['path'],
                'query': event['queryStringParameters']
            }
        elif event['version'] == '1.0':
            requests = {
                'version': 'apigw-httpapi1.0',
                'srcip': event['requestContext']['identity']['sourceIp'],
                'useragent': event['requestContext']['identity']['userAgent'],
                'method': event['requestContext']['httpMethod'],
                'body': event['body'],
                'path': event['requestContext']['path'],
                'query': event['queryStringParameters']
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
            'path': event['path'],
            'query': event['queryStringParameters']
        }
    requests['next'] = requests['query']['next'] if 'next' in requests['query'] else ''
    print(requests)
    apimapping = {
        '/job':fping_logic,
        '/api/status': webapi_status,
        '/api/ipinfo': webapi_ipinfo,
        '/api/asninfo': webapi_asninfo,
        '/api/cityset': webapi_cityset,
        '/api/country': webapi_country,
        '/api/city': webapi_city,
        '/api/asn': webapi_asn,
        '/api/performance': webapi_performance,
        '/api/login': webapi_login,
        '/api/runsql': webapi_runsql,
        '/api/redis': webapi_redis,
        '/api/statistics': webapi_statistics
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