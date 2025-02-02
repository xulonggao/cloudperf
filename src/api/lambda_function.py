import json
import settings
import data_layer
import ipaddress
from urllib.parse import unquote_plus
from itertools import chain

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
    src = '2771369315' #unquote_plus(requests['query']['src'])
    dist = '219826751,1246289398,1466233068,2099884446,2321641805' #unquote_plus(requests['query']['dist'])
    latencyData = data_layer.get_latency_data_cross_city(src, dist)
    print(latencyData)
    # [{'src': 1395638387, 'dist': 922075495, 'samples': Decimal('10'), 'min': 19600, 'max': 22200, 'avg': Decimal('20700.0000'), 'p50': Decimal('20000.0000'), 'p70': Decimal('21300.0000'), 'p90': Decimal('22000.0000'), 'p95': Decimal('22000.0000')},{},{}]
    # src,dist,samples,min,max,avg,p50,p70,p90,p95",
    # "1395638387,2228836286,10,23900,25500,24600.0000,24600.0000,24800.0000,25100.0000,25100.0000",
    if latencyData == None:
        return {'statusCode': 400, 'result': 'param src and dist invalid!'}
    srclist = src.split(',')
    distlist = dist.split(',')
    outdata = {
        "samples": 0,
        "srcCityIds": len(srclist),
        "distCityIds": len(distlist),
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
        "asnData": [],
        "cityData": [],
        "latencyData": []
    }
    # 找到所有相关的city_id对应对象
    cityobjs = {}
    for city_id in chain(srclist, distlist):
        city_id = int(city_id)
        city_obj = data_layer.get_cityobject_by_id(city_id)
        if city_obj and len(city_obj) > 0:
            cityobjs[city_id] = city_obj[0]
    data = {
        'asn': {},
        'city': {}
    }
    for item in latencyData:
        # samples数据汇总
        outdata['samples'] += item['samples']
        # 各种Latency数据汇总
        for key in ('min','max','avg','p50','p70','p90','p95'):
            if key not in outdata[key+'Latency']:
                outdata[key+'Latency'] = {'samples':0, 'data':0}
            outdata[key+'Latency']['samples'] += item['samples']
            outdata[key+'Latency']['data'] += item[key] * item['samples']
        if src in cityobjs and dist in cityobjs:
            srcobj = cityobjs[src]
            distobj = cityobjs[dist]
            # 分cityid的延迟数据分列，取p70
            outdata['latencyData'].append({
                'sourceCityName': srcobj['name'],
                'sourceAsn': srcobj['asn'],
                'sourceLat': srcobj['latitude'],
                'sourceLon': srcobj['longitude'],
                'destCityName': distobj['name'],
                'destAsn': distobj['asn'],
                'destLat': distobj['latitude'],
                'destLon': distobj['longitude'],
                'latency': item['p70']
            })
            # 分asn/city的延迟数据汇总，取p70
            for key,obj in (('asn','asn'),('city','name')):
                for subkey in (srcobj[obj],distobj[obj]):
                    if subkey not in data['asnData']:
                        data[key][subkey] = {'samples':0, 'data':0}
                    data[key][subkey]['samples'] += item['samples']
                    data[key][subkey]['data'] += item['p70'] * item['samples']

    # 各种Latency数据汇总
    for key in ('min','max','avg','p50','p70','p90','p95'):
        outdata[key+'Latency'] = int(outdata[key+'Latency']['data'] / outdata[key+'Latency']['samples'])

    # 分asn/city的延迟数据汇总，取p70
    for key in ('asn','city'):
        for k, v in data[key].items():
            outdata[key+'Data'].append({
                key: k,
                'avgLatency': int(data[key][k]['data'] / data[key][k]['samples'])
            })

    '''
    p70最大的五个src，p70最大的五个dist
    聚合完所有数据后得出：
        p70最大的五个asn，p70最大的五个asn
        p70最大的五个city，p70最大的五个city
    '''
    return {
        'statusCode': 200,
        'result': outdata
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
    cityset = 0
    if 'cityset' in requests['query']:
        cityset = int(requests['query']['cityset'])
    asns = []
    if 'country' in requests['query'] and len(requests['query']['country']) >= 2:
        if 'city' in requests['query'] and len(requests['query']['city']) >= 2:
            asns = data_layer.get_asns_by_country_city(requests['query']['country'], requests['query']['city'], cityset)
    return {
        'statusCode': 200,
        'result': asns
    }

def webapi_country(requests):
    cityset = 0
    if 'cityset' in requests['query']:
        cityset = int(requests['query']['cityset'])
    countrys = data_layer.get_countrys(cityset)
    return {
        'statusCode': 200,
        'result': countrys
    }

# country=CN
def webapi_city(requests):
    result = []
    cityset = 0
    if 'cityset' in requests['query']:
        cityset = int(requests['query']['cityset'])
    if 'country' in requests['query'] and len(requests['query']['country']) >= 2:
        result = data_layer.get_citys_by_country_code(requests['query']['country'], cityset)
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

def is_ip_address(ip_string):
    try:
        ipaddress.ip_address(ip_string)
        return True
    except ValueError:
        return False

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
    city_id = data_layer.get_cityid_by_ip(requests['srcip'])
    if requests['method'] == 'POST':
        jobResult = json.loads(requests['body'])
        if 'next' in requests['query']:
            next = requests['query']['next']
        else:
            next = ''
        for obj in jobResult:
            jobtype = obj['jobid'][:4]
            jobid = int(obj['jobid'][4:])
            if jobtype == 'ping':
                # obj['status'] = 0 success 256 partial success or not found any pingable ip
                # obj['stderr'] -> 1.6.81.7 : duplicate for [0], 64 bytes, 468 ms
                stdout = obj['stdout'].split('\n')
                ips = []
                for out in stdout:
                    # Enough hosts reachable (required: 100, reachable: 100)
                    if out == '' or out.startswith('[DEBUG]'):
                        continue
                    if is_ip_address(out):
                        ips.append(out)
                print(f"pingjob: {jobid} status: {obj['status']} ips: {len(ips)}")
                print(ips)
                if len(ips) > 0:
                    data_layer.update_pingable_ip(jobid, ips)
            elif jobtype == 'data':
                print(f"datajob: {jobid} status: {obj['status']}")
                print(obj['stdout'])
                print(obj['stderr'])
                # stdout:
                # [DEBUG] CPU time used: 0.083289 sec
                # stderr:
                # 2.17.168.71 : 370 370 370 370 373 370 370 370 370 370 370
                # 2.17.168.93 : 358 358 358 358 363 358 358 358 358 358 358
                # 2.17.168.76 : 358 358 358 358 358 359 358 358 358 358 358
                samples = []
                for stderr in obj['stderr'].split('\n'):
                    for data in stderr.split(' '):
                        try:
                            samples.append(float(data))
                        except ValueError:
                            pass
                n = len(samples)
                if len(samples)>0:
                    # numpy 库太大了，这里简单实现一下
                    # arr = np.array(samples)
                    sorted_data = sorted(samples)
                    datas = {
                        'src_city_id': city_id,
                        'dist_city_id': jobid,
                        'samples': n,
                        'latency_min': int(sorted_data[0] * 1000), #min(samples), #np.min(arr),
                        'latency_max': int(sorted_data[n-1] * 1000), #max(samples), #np.max(arr),
                        'latency_avg': int(sum(sorted_data) * 1000 / n), #np.mean(arr),
                        'latency_p50': int(data_layer.np_percentile(sorted_data, 50) * 1000), #np.percentile(arr, 50),
                        'latency_p70': int(data_layer.np_percentile(sorted_data, 70) * 1000), #np.percentile(arr, 70),
                        'latency_p90': int(data_layer.np_percentile(sorted_data, 90) * 1000), #np.percentile(arr, 90),
                        'latency_p95': int(data_layer.np_percentile(sorted_data, 95) * 1000), #np.percentile(arr, 95),
                    }
                    data_layer.update_statistics_data(datas)
    if requests['useragent'].startswith('fping-pingable'):
        data_layer.update_client_status(requests['srcip'], 'ping')
        # get ping job here, ensure buffer data enough
        data_layer.refresh_iprange_check()
        for i in range(0, 10):
            obj = data_layer.cache_pop(settings.CACHEKEY_PINGABLE)
            if obj:
                stip = ipaddress.IPv4Address(obj['start_ip'])
                etip = ipaddress.IPv4Address(obj['end_ip'])
                print(f"fetch ping job: {stip} {etip} {obj['city_id']}")
                ret["job"].append({
                    "jobid": 'ping' + str(obj['city_id']),
                    # disable stderr log here with 2> /dev/null , but it will cause error
                    # only found 100 max pingable ip to save time
                    "command": f"fping -g {stip} {etip} -r 2 -a -q -X 100",
                })
            else:
                break
        if len(ret["job"]) > 0:
            ret["next"] = 'ping'
            ret["interval"] = 1
    else:
        data_layer.update_client_status(requests['srcip'], 'data')
        job = data_layer.get_pingjob_by_cityid(city_id)
        print(job)
        if job != None:
            ips = [str(ipaddress.IPv4Address(x)) for x in job['ips']]
            print(f"fetch data job: {job['city_id']} {len(ips)}")
            ret["job"].append({
                "jobid": 'data' + str(job['city_id']),
                "command": "fping -a -q -C 11 " + ' '.join(ips),
            })
            ret["next"] = "data"
            ret["interval"] = 1
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