import ipaddress
import pymysql
import redis
import re
import json
import time
import hashlib
import settings
import boto3
from onlineip_tracker import OnlineIPTracker
from typing import List, Dict, Any
from botocore.exceptions import ClientError
from password_validator import EnhancedPasswordValidator
from speed_counter import SpeedCounter

import pymysql
from pymysql.constants import FIELD_TYPE

# 自定义转换器
def decimal_to_float(value):
    return float(value)

# 注册转换器，避免结果中有Decimal对象，无法json格式化问题
conv = pymysql.converters.conversions.copy()
conv[FIELD_TYPE.DECIMAL] = decimal_to_float
conv[FIELD_TYPE.NEWDECIMAL] = decimal_to_float

redis_pool = redis.ConnectionPool(
    host=settings.CACHE_HOST,
    port=settings.CACHE_PORT,
    decode_responses=True,
    connection_class=redis.SSLConnection,
    socket_timeout=5,
    socket_connect_timeout=5)

def myhash(text):
    if not isinstance(text, str):
        text = str(text)
    text_bytes = text.encode('utf-8')
    sha256_hash = hashlib.sha256(text_bytes)
    return sha256_hash.hexdigest()[:32]

def get_mysql_connect(need_write = False, need_multi = False, db = settings.DB_DATABASE):
    host = settings.DB_WRITE_HOST if need_write else settings.DB_READ_HOST
    client_flag = pymysql.constants.CLIENT.MULTI_STATEMENTS if need_multi else 0
    return pymysql.connect(host=host, user=settings.DB_USER, passwd=settings.DB_PASS, db=db, charset='utf8mb4', port=settings.DB_PORT, client_flag=client_flag, conv=conv)

def mysql_create_database(database:str = None):
    if database == None:
        database = settings.DB_DATABASE
    conn = get_mysql_connect(need_write = True, db = None)
    cursor = conn.cursor()
    try:
        sql = "CREATE DATABASE IF NOT EXISTS `" + database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
        cursor.execute(sql)
        ret = cursor.fetchall()
    except Exception as e:
        print(f"Error executing SQL script: {e}")
        conn.rollback()
        ret = False
    finally:
        cursor.close()
        conn.close()
    return ret

def safe_like_pattern(search:str):
    return search.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")
    # return search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_').replace('"','').replace("'",'')

def fetch_all_to_dict(cursor: pymysql.cursors.Cursor) -> List[Dict[str, Any]]:
    """
    将 cursor.fetchall() 的结果转换为字典列表
    参数：
    cursor: PyMySQL 游标对象
    返回：
    List[Dict[str, Any]]: 包含查询结果的字典列表
    """
    # 获取列名
    columns = [col[0] for col in cursor.description]
    # 获取所有行
    rows = cursor.fetchall()
    # 转换为字典列表
    return [dict(zip(columns, row)) for row in rows]

# 执行写
def mysql_execute(sql:str, obj = None):
    #pymysql.connections.DEBUG = True
    conn = get_mysql_connect(True)
    cursor = conn.cursor()
    cursor.execute(sql, obj)
    results = cursor.fetchall()
    conn.commit()
    cursor.close()
    conn.close()
    return results

def mysql_select(sql:str, obj = None, fetchObject = True):
    conn = get_mysql_connect(False)
    cursor = conn.cursor()
    cursor.execute(sql, obj)
    if fetchObject:
        results = fetch_all_to_dict(cursor)
    else:
        results = cursor.fetchall()
    cursor.close()
    conn.close()
    return results

# 会打印结果
def mysql_batch_execute(sql: str):
    results = []
    try:
        conn = get_mysql_connect(need_write = True, need_multi = True)
        cursor = conn.cursor()
        # 分割SQL语句
        sql_statements = sql.strip().split(";")
        affected_rows = 0
        # 执行每条SQL语句
        for sql in sql_statements:
            sql = sql.strip()
            if sql:  # 忽略空语句
                cursor.execute(sql)
                keyaction = sql[:4].lower()
                # 如果是 select/with/explain/show 开头的命令，需要获取详细数据
                readaction = {'sele', 'with', 'expl', 'show'}
                if keyaction in readaction:
                    # 查询语句
                    rows = cursor.fetchall()
                    if rows:
                        columns = [desc[0] for desc in cursor.description]
                        print("列名:", " | ".join(columns))
                        for row in rows:
                            print(" | ".join(map(str, row)))
                        results.append({
                            'sql': sql,
                            'type': 'query',
                            'columns': ','.join(columns), #columns,
                            'rows': [','.join(map(str, row)) for row in rows] # [list(map(str, row)) for row in rows]
                        })
                    else:
                        print('无结果返回')
                        results.append({
                            'sql': sql,
                            'type': 'query',
                            'message': '无结果返回'
                        })
                else:
                    affected_rows += cursor.rowcount
                    # print(f"影响行数: {cursor.rowcount}")
                    # 非查询语句
                    results.append({
                        'sql': sql,
                        'type': 'update',
                        'affected_rows': cursor.rowcount
                    })
                conn.commit()
        if affected_rows > 0:
            print(f"共影响行数: {affected_rows}")

    except Exception as e:
        print(f"{sql}\n错误: {str(e)}")
        results.append({'error': str(e)})

    finally:
        if 'conn' in locals():
            conn.close()
    return results

def mysql_select_onevalue(sql:str, obj = None, default = 0):
    row = mysql_select(sql, obj, False)
    if row == None or len(row) == 0:
        return default
    return row[0][0]

def cache_get(key:str):
    try:
        r = redis.StrictRedis(connection_pool=redis_pool)
        ret = r.get(key)
        if ret:
            ret = json.loads(ret)
        return ret
    except Exception as e:
        print('cache get failed.', repr(e))
        return None

def cache_set(key:str, value, ttl:int = settings.CACHE_BASE_TTL):
    try:
        r = redis.StrictRedis(connection_pool=redis_pool)
        if ttl == 0:
            return r.set(key, json.dumps(value))
        return r.setex(key, ttl, json.dumps(value))
    except Exception as e:
        print('cache set failed.', repr(e) , key, ttl, value)
        return None

def cache_delete(key:str):
    try:
        r = redis.StrictRedis(connection_pool=redis_pool)
        return r.delete(key)
    except Exception as e:
        print('cache delete failed.', repr(e), key)
        return None

def cache_zadd(key:str, value):
    try:
        r = redis.StrictRedis(connection_pool=redis_pool)
        return r.zadd(key, value)
    except Exception as e:
        print('cache zadd failed.', repr(e), key, value)
        return None

def cache_push(key:str, value, ttl:int = settings.CACHE_BASE_TTL):
    try:
        r = redis.StrictRedis(connection_pool=redis_pool)
        return r.rpush(key, json.dumps(value))
    except Exception as e:
        print('cache push failed.', repr(e), key, value)
        return None

def cache_pop(key:str):
    try:
        r = redis.StrictRedis(connection_pool=redis_pool)
        ret = r.lpop(key)
        if ret:
            ret = json.loads(ret)
        return ret
    except Exception as e:
        print('cache pop failed.', repr(e), key)
        return None

def cache_listlen(key:str):
    try:
        r = redis.StrictRedis(connection_pool=redis_pool)
        return r.llen(key)
    except Exception as e:
        print('cache list len failed.', repr(e), key)
        return 0

def cache_dump(key:str):
    try:
        r = redis.StrictRedis(connection_pool=redis_pool)
        key_type = r.type(key)
        details = {
            'type': key_type,
            'exists': r.exists(key),
            'ttl': r.ttl(key)
        }
        if key_type == 'string':
            details['value'] = r.get(key)
        elif key_type == 'list':
            details['length'] = r.llen(key)
            details['value'] = r.lrange(key, 0, -1)
        elif key_type == 'set':
            details['length'] = r.scard(key)
            details['value'] = r.smembers(key)
        elif key_type == 'hash':
            details['length'] = r.hlen(key)
            details['value'] = r.hgetall(key)
        elif key_type == 'zset':
            details['length'] = r.zcard(key)
            details['value'] = r.zrange(key, 0, -1, withscores=True)
        return details
    except Exception as e:
        print('cache dump failed.', repr(e), key)
        return None

def cache_mysql_get_onevalue(sql:str, default = 0, ttl:int = settings.CACHE_BASE_TTL):
    key = settings.CACHEKEY_SQL + 'ov_' + myhash(sql)
    val = cache_get(key)
    if val != None:
        return val
    ret = mysql_select_onevalue(sql, default = default)
    cache_set(key, ret, ttl)
    return ret

def delete_mysql_select_cache(sql:str, obj = None, fetchObject = True):
    key = settings.CACHEKEY_SQL + 'sl_' + myhash(sql + str(obj) + str(fetchObject))
    return cache_delete(key)

def cache_mysql_select(sql:str, obj = None, fetchObject = True, ttl:int = settings.CACHE_BASE_TTL):
    key = settings.CACHEKEY_SQL + 'sl_' + myhash(sql + str(obj) + str(fetchObject))
    val = cache_get(key)
    if val != None:
        return val
    ret = mysql_select(sql, obj, fetchObject)
    cache_set(key, ret, ttl)
    return ret

def get_countrys(cityset:int = 0):
    if cityset != 0:
        # FIND_IN_SET(src_city_id, (SELECT cityids FROM cityset WHERE id = %s)) 无法使用索引，所以先查出cityids再用in
        rows = cache_mysql_select('SELECT cityids FROM cityset WHERE id = %s', (cityset,))
        if rows and len(rows) > 0:
            cityids = rows[0]['cityids']
            return cache_mysql_select('''select code,name from country where code in
(
    select country_code from city where id in (
        select dist_city_id from statistics where src_city_id in (%s) group by dist_city_id
    ) group by country_code
)''', (cityids,))
    return cache_mysql_select('select code,name from country order by code', ttl=settings.CACHE_LONG_TTL)

def get_citys_by_country_code(country_code, cityset:int = 0):
    if cityset != 0:
        # FIND_IN_SET(src_city_id, (SELECT cityids FROM cityset WHERE id = %s)) 无法使用索引，所以先查出cityids再用in
        rows = cache_mysql_select('SELECT cityids FROM cityset WHERE id = %s', (cityset,))
        if rows and len(rows) > 0:
            cityids = rows[0]['cityids']
            return cache_mysql_select('''SELECT name as id,name,latitude,longitude FROM city WHERE country_code = %s and id in
(
    select dist_city_id from statistics where src_city_id in (%s) group by dist_city_id
) group by name''', (country_code,cityids))
    return cache_mysql_select(
        'SELECT name as id,name,latitude,longitude FROM city WHERE country_code = %s group by name', (country_code,))

def get_cityobject(filter:str, obj = None, limit:int = 50):
    return cache_mysql_select('''
select c.id as cityId,a.asn as asn,c.country_code as country,
COALESCE(c.friendly_name, c.name) as name,c.region as region,
a.name as asnName, a.domain as domain,
c.latitude as latitude, c.longitude as longitude,
a.type as asnType,a.ipcounts as ipcounts,
INET_NTOA(i.start_ip) as startIp, INET_NTOA(i.end_ip) as endIp from city as c, asn as a,iprange as i
 where c.id = i.city_id and c.asn=a.asn and ''' + filter + f' limit {limit}', obj)

def get_asns_by_country(country_code, cityset:int = 0):
    if cityset != 0:
        # FIND_IN_SET(src_city_id, (SELECT cityids FROM cityset WHERE id = %s)) 无法使用索引，所以先查出cityids再用in
        rows = cache_mysql_select('SELECT cityids FROM cityset WHERE id = %s', (cityset,))
        if rows and len(rows) > 0:
            cityids = rows[0]['cityids']
            return get_cityobject('''c.country_code = %s and c.id in
(
    select dist_city_id from statistics where src_city_id in (%s) group by dist_city_id
) group by c.id,c.asn''',(country_code,cityids)) #这里加了 ,c.asn 为了把多条cidr记录合并
    return get_cityobject("c.country_code = %s group by c.id,c.asn",(country_code,))

def get_asns_by_country_city(country_code, city_name, cityset:int = 0):
    if cityset != 0:
        # FIND_IN_SET(src_city_id, (SELECT cityids FROM cityset WHERE id = %s)) 无法使用索引，所以先查出cityids再用in
        rows = cache_mysql_select('SELECT cityids FROM cityset WHERE id = %s', (cityset,))
        if rows and len(rows) > 0:
            cityids = rows[0]['cityids']
            return get_cityobject('''c.country_code = %s and c.name = %s and c.id in
(
    select dist_city_id from statistics where src_city_id in (%s) group by dist_city_id
) group by c.id,c.asn''',(country_code,city_name,cityids)) #这里加了 ,c.asn 为了把多条cidr记录合并
    return get_cityobject("c.country_code = %s and c.name = %s group by c.id,c.asn",(country_code,city_name,))

def get_cityobject_by_ip(ip:str):
    ipno = ipaddress.IPv4Address(ip)._ip
    return get_cityobject("i.start_ip<=%s and i.end_ip>=%s group by c.id", (ipno,ipno))

def get_cityid_by_ip(ip:str):
    cityobj = get_cityobject_by_ip(ip)
    if cityobj == None or len(cityobj) == 0:
        return 0
    return cityobj[0]['cityId']

def get_cityobject_by_id(id:int):
    return get_cityobject("c.id=%s group by c.id",(id,),limit=1)

def get_cityobject_by_keyword(keyword:str, limit=200):
    if keyword.lower().startswith('as'):
        keyword = keyword.lower().replace('asn','').replace('as','')

    if keyword.isdecimal():
        filter = f'a.asn={keyword} group by c.id '
        obj = None
    else:
        filter = """ CONCAT_WS('',c.name, c.friendly_name, c.region, a.name, a.domain) LIKE %s ESCAPE '\\\\' group by c.id """
        keyword = safe_like_pattern(keyword)
        obj = (f"%{keyword}%",)
    return get_cityobject(filter, obj, limit)

def get_latency_rawdata_cross_city(sourceCityId:str, destCityId:str, limit:int):
    pattern = r'^[\d,]+$'
    print('rawdata query with:', sourceCityId, destCityId, limit)
    if not bool(re.match(pattern, sourceCityId)) or not bool(re.match(pattern, destCityId)):
        return None
    return cache_mysql_select(f'''
select src_city_id as src, dist_city_id as dist, samples, latency_min as min, latency_max as max,
latency_avg as avg,latency_p50 as p50,latency_p70 as p70,latency_p90 as p90,latency_p95 as p95,
UNIX_TIMESTAMP(update_time) as update_time from statistics where src_city_id in ({sourceCityId})
 and dist_city_id in ({destCityId}) order by update_time desc limit {limit}
''')

def get_latency_data_cross_city(sourceCityId:str, destCityId:str):
    pattern = r'^[\d,]+$'
    print('query with:', sourceCityId, destCityId)
    if not bool(re.match(pattern, sourceCityId)) or not bool(re.match(pattern, destCityId)):
        return None
    return cache_mysql_select(f'''
select src_city_id as src, dist_city_id as dist, sum(samples) as samples,
min(latency_min) as min,max(latency_max) as max,avg(latency_avg) as avg,avg(latency_p50) as p50,
avg(latency_p70) as p70,avg(latency_p90) as p90,avg(latency_p95) as p95
from statistics where src_city_id in ({sourceCityId}) and dist_city_id in ({destCityId}) group by src_city_id,dist_city_id
''')

CITYSET_DEFAULT_CACHE_SQL = 'select id,name,cityids as cityIds from `cityset` order by length(cityids) desc, name'

def get_citysets():
    return cache_mysql_select(CITYSET_DEFAULT_CACHE_SQL)

def add_cityset(name:str, city_ids:list):
    ret = mysql_execute('INSERT into `cityset`(`name`,`cityids`) values(%s,%s)', (name, ','.join(city_ids)))
    delete_mysql_select_cache(CITYSET_DEFAULT_CACHE_SQL)
    return ret

def edit_cityset(id:int, name:str, city_ids:list):
    ret = mysql_execute('UPDATE `cityset` set name=%s,cityids=%s where id=' + str(id), (name, ','.join(city_ids)))
    delete_mysql_select_cache(CITYSET_DEFAULT_CACHE_SQL)
    return ret

def del_cityset(id:int):
    ret = mysql_execute('delete from `cityset` where id=' + str(id))
    delete_mysql_select_cache(CITYSET_DEFAULT_CACHE_SQL)
    return ret

def check_expired_iprange(days, limit):
    return mysql_select('select start_ip,end_ip,city_id from iprange where lastcheck_time < date_sub(now(), interval %s day) order by lastcheck_time limit %s', (days, limit))

def update_pingable_result(city_id, start_ip, end_ip):
    # 通过 start_ip end_ip city_id 来更新对应 pingable 表的数据，更新 lastresult 右移1位高位为0，表示这个ip最新数据没有更新了
    mysql_execute('update pingable set lastresult=lastresult>>1 where city_id=%s and ip>=%s and ip<=%s', (city_id, start_ip, end_ip))
    # 检查 pingable 表，删除 lastresult 全为 0 的条目，因为该ip已经连续不可ping了（就算新的任务他又可ping了，重新插入就是）
    mysql_execute('delete from pingable where lastresult=' + settings.DELETE_PINGABLE_IP)
    # 更新 lastcheck_time 时间，避免马上再次检查
    mysql_execute('update iprange set lastcheck_time = CURRENT_TIMESTAMP where city_id=%s and start_ip=%s', (city_id, start_ip))

def update_pingable_ip(city_id, ips):
    for ip in ips:
        ipno = ipaddress.IPv4Address(ip)._ip
        # 128 = 10000000b
        mysql_execute('INSERT INTO `pingable`(`ip`,`city_id`,`lastresult`) VALUES(%s, %s, ' + settings.NEW_PINGABLE_IP + ') ON DUPLICATE KEY UPDATE lastresult=lastresult|' + settings.NEW_PINGABLE_IP, (ipno, city_id))

def update_statistics_data(datas):
    return mysql_execute('''INSERT INTO `statistics`(src_city_id,dist_city_id,samples,latency_min,latency_max,latency_avg,
latency_p50,latency_p70,latency_p90,latency_p95)
VALUES(%(src_city_id)s,%(dist_city_id)s,%(samples)s,%(latency_min)s,%(latency_max)s,%(latency_avg)s,
%(latency_p50)s,%(latency_p70)s,%(latency_p90)s,%(latency_p95)s)''',datas)

def delete_oldest_statistics_data(src_city_id, dist_city_id, limit = settings.MAX_RECORDS_PER_CITYID):
    return mysql_execute('''DELETE FROM `statistics`
WHERE (src_city_id = %s AND dist_city_id = %s) 
AND update_time NOT IN (
    SELECT update_time FROM (
        SELECT update_time FROM `statistics` WHERE src_city_id = %s AND dist_city_id = %s
        ORDER BY update_time DESC LIMIT %s) t
);''', (src_city_id, dist_city_id, src_city_id, dist_city_id, limit))

def friendly_intval(sec:int):
    if sec > 86400:
        msg = f"{int(sec / 86400)} days ago"
    elif sec > 3600:
        msg = f"{int(sec / 3600)} hours ago"
    elif sec > 60:
        msg = f"{int(sec / 60)} mins ago"
    elif sec == 0:
        msg = "just now"
    else:
        msg = f"{sec:.1f} secs ago"
    return msg

def friendly_truncate_string(s, max_length=15, cutstr=[' ', ','], append='...'):
    if len(s) <= max_length:
        return s
    for i in range(max_length, 0, -1):
        if s[i-1] in cutstr:
            return s[:i]+append
    return s[:max_length]+append

def friendly_cityname(city):
    if city['asn'] == 16509 or city['asn'] == 14618:
        if city['region']:
            # 总结：新region大部分都用city就好，region变成真正的省了
            region_mapping = {
                'Hesse':'Frankfurt', 'Kuala Lumpur':'Malaysia', 'Querétaro':'Mexico', 'Telangana':'Hyderabad',
                'Western Cape':'Cape Town', 'Victoria':'Melbourne', 'Maharashtra':'Mumbai', 'Incheon':'Seoul',
                'New South Wales':'Sydney', 'Bangkok':'Thailand', 'Quebec':'Canada', 'Alberta':'Calgary',
                'Leinster':'Ireland', 'England':'London', 'Lombardy':'Milan', 'Île-de-France':'Paris',
                'Aragon':'Spain', 'Southern Governorate':'Bahrain', 'Dubai':'UAE',
                # localzone
                'Illinois':'Chicago',
            }
            if city['region'] in region_mapping:
                return region_mapping[city['region']]
            return city['region']
    return city['name']

def friendly_cityandasnno(city):
    return f"{friendly_cityname(city)} (ASN{city['asn']})"

def friendly_cityandasn(city):
    return f"{friendly_cityname(city)} (ASN{city['asn']} {friendly_truncate_string(city['asnName'])})"

def friendly_cityshortasn(city):
    return f"ASN{city['asn']} {friendly_truncate_string(city['asnName'])}"

def friendly_cityasn(city):
    return f"{city['asnName']} (ASN{city['asn']})"

# 已知国家数量，已知city数量，已知asn数量
# 稳定可ping数量，新增可ping数量，最近不可ping数量
# 可用cidr数量，过期cidr数量，cidr队列长度
# 已知cityid数量，可ping的cityid数量，有数据的cityid pair数量
def query_statistics_data(datas = ''):
    if datas == '':
        datas = 'all-country,all-city,all-asn,ping-stable,ping-new,ping-loss,cidr-ready,cidr-outdated,cidr-queue,cityid-all,cityid-ping,cityid-pair,ping-clients,data-clients,speed-ping-get,speed-ping-set,speed-data-get,speed-data-set'
    supports = {
        'all-country':'select count(1) from country',
        'all-city':'select count(1) from (select country_code,name from city group by country_code,name) as a',
        'all-asn':'select count(1) from asn',
        'ping-stable':'select count(1) from pingable where lastresult>=' + settings.STABLE_PINGABLE_IP,
        'ping-new':'select count(1) from pingable where lastresult>=' + settings.NEW_PINGABLE_IP,
        'ping-loss':'select count(1) from pingable where lastresult<=' + settings.LOSS_PINGABLE_IP,

        'cidr-ready':'select count(1) from iprange where lastcheck_time >= date_sub(now(), interval 14 day)',
        'cidr-outdated':'select count(1) from iprange where lastcheck_time < date_sub(now(), interval 14 day)',

        'cityid-all':'select count(1) from city',
        'cityid-ping':'select count(distinct city_id) from pingable where lastresult>' + settings.DELETE_PINGABLE_IP,
        'cityid-pair':'select count(distinct src_city_id, dist_city_id) from statistics',
        # 'select count(1) from (select 1 from statistics group by src_city_id, dist_city_id) as a'
    }
    outs = {}
    for data in datas.split(','):
        if data == 'cidr-queue':
            outs[data] = cache_listlen(settings.CACHEKEY_PINGABLE)
        elif data in {'speed-ping-get','speed-ping-set','speed-data-get','speed-data-set'}:
            speed_counter = SpeedCounter(redis_pool, settings.CACHEKEY_RECENT_TASKS + data)
            outs[data] = speed_counter.get_count()
        elif data in {'ping-clients','data-clients'}:
            ping_tracker = OnlineIPTracker(redis_pool, settings.CACHEKEY_ONLINE_SERVERS + data[:4])
            ping_clients = []
            for ip, timestamp in ping_tracker.get_online_ips():
                city = get_cityobject_by_ip(ip)
                if city and len(city) > 0:
                    msg = friendly_intval(time.time() - timestamp)
                    if data == 'data-clients':
                        msg += ', Queue: ' + str(cache_listlen(settings.CACHEKEY_CITYJOB + str(city[0]['cityId'])))
                    ping_clients.append({
                        'ip': ip,
                        'region': friendly_cityandasnno(city[0]),
                        'status': msg
                    })
            outs[data] = ping_clients
        else:
            outs[data] = mysql_select_onevalue(supports[data])
    return outs

def send_sqs_messages_batch(queue_url: str, messages: List[Dict[str, Any]]) -> Dict:
    """
    批量发送 JSON 消息到 SQS 队列
    Args:
        queue_url (str): SQS 队列的 URL
        messages (List[Dict]): JSON 消息列表
    
    Returns:
        Dict: 发送结果，包含成功和失败的消息
    """
    sqs = boto3.client('sqs')
    # 准备批量发送的条目，将消息转换为 JSON 字符串
    entries = [
        {
            'Id': str(i),  # 批次中消息的唯一标识
            'MessageBody': json.dumps(message)  # 将字典转换为 JSON 字符串
        }
        for i, message in enumerate(messages)
    ]
    # 每批最多发送 10 条消息
    results = {
        'successful': [],
        'failed': []
    }
    # 分批处理
    for i in range(0, len(entries), 10):
        batch = entries[i:i + 10]
        try:
            response = sqs.send_message_batch(
                QueueUrl=queue_url,
                Entries=batch
            )
            # 收集结果
            if 'Successful' in response:
                results['successful'].extend(response['Successful'])
            if 'Failed' in response:
                results['failed'].extend(response['Failed'])                
        except Exception as e:
            # 如果整个批次发送失败，将所有消息标记为失败
            failed_messages = [
                {
                    'Id': entry['Id'],
                    'Error': str(e)
                }
                for entry in batch
            ]
            results['failed'].extend(failed_messages)
    return results


def get_sqs_queue_size(queue_url: str) -> dict:
    """
    获取 SQS 队列的大小信息
    Args:
        queue_url (str): SQS 队列的 URL
    Returns:
        dict: 包含队列大小信息的字典
    """
    try:
        # 创建 SQS 客户端
        sqs = boto3.client('sqs')
        # 获取队列属性
        response = sqs.get_queue_attributes(
            QueueUrl=queue_url,
            AttributeNames=[
                'ApproximateNumberOfMessages',              # 可见消息数
                'ApproximateNumberOfMessagesNotVisible',    # 正在处理的消息数
                'ApproximateNumberOfMessagesDelayed'        # 延迟的消息数
            ]
        )
        # 提取队列大小信息
        queue_size = {
            'visible_messages': int(response['Attributes']['ApproximateNumberOfMessages']),
            'invisible_messages': int(response['Attributes']['ApproximateNumberOfMessagesNotVisible']),
            'delayed_messages': int(response['Attributes']['ApproximateNumberOfMessagesDelayed']),
            'total_messages': int(response['Attributes']['ApproximateNumberOfMessages']) + 
                            int(response['Attributes']['ApproximateNumberOfMessagesNotVisible']) + 
                            int(response['Attributes']['ApproximateNumberOfMessagesDelayed'])
        }
        return {
            'statusCode': 200,
            'queue_size': queue_size
        }
    except ClientError as e:
        return {
            'statusCode': 500,
            'error': str(e),
            'error_code': e.response['Error']['Code']
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'error': str(e)
        }

# step = /18 = 2^14
def split_ip_range(start_ip, end_ip, step = 16384):
    subnets = []
    i = start_ip
    while i <= end_ip:
        ei = min(i+step-1,end_ip)
        subnets.append([i, ei])
        #print(ipaddress.IPv4Address(i), ipaddress.IPv4Address(ei))
        i += step
    return subnets

# 由于 lambda 中 运行 fping 权限不够，所以不使用cron运行了，改为本地运行，因此使用redis队列来传递任务，通过api获取任务
def refresh_iprange_check(queue_url = ''):
    max_buffer_cidr = 100
    if queue_url != '':
        # 获取队列大小
        result = get_sqs_queue_size(queue_url)
        # print(result)
        if result['statusCode'] != 200:
            return {
                'status': result['statusCode'],
                'msg': result['error']
            }
        len = result['queue_size']['visible_messages']
    else:
        # 检查 redis 队列长度
        len = cache_listlen(settings.CACHEKEY_PINGABLE)
    if len >= max_buffer_cidr:
        return {
            'status': 200,
            'msg': 'Queue is full, skip this round check'
        }

    # 检查 iprange 表，根据 lastcheck_time 排序，找出 lastcheck_time < now - 7days 的数据，准备进行更新
    datas = check_expired_iprange(days=14, limit=20)
    # print(datas)
    # 通过 start_ip end_ip city_id 来更新对应 pingable 表的数据，更新 lastresult 右移1位高位为0，表示这个ip最新数据没有更新了
    # 检查 pingable 表，删除 lastresult 全为 0 的条目，因为该ip已经连续不可ping了（就算新的任务他又可ping了，重新插入就是）
    messages = []
    for data in datas:
        # print(data)
        update_pingable_result(data['city_id'], data['start_ip'], data['end_ip'])
        subnets = split_ip_range(data['start_ip'], data['end_ip'])
        for subnet in subnets:
            messages.append({"type": "pingable", "start_ip": subnet[0], "end_ip": subnet[1], "city_id": data['city_id']})
    # 提交 start_ip end_ip city_id 的 ping 探测任务到 queue 中，queue 陆续完成探测任务时，会去更新对应 ip 的 lastresult 值，把新移位的值置为1000b，不存在的会插入
    if queue_url != '':
        result = send_sqs_messages_batch(queue_url, messages)
        # print(result)
    else:
        for message in messages:
            result = cache_push(settings.CACHEKEY_PINGABLE, message)
    return {
        'status': 200,
        'msg': result
    }

# 根据不同的source city，获取需要ping的任务
def get_pingjob_by_cityid(src_city_id:int):
    last_city_id = 0
    return_city_id = 0
    if src_city_id == 0:
        return None
    # 在redis中先查找有没有已经缓存的数据
    data = cache_pop(settings.CACHEKEY_CITYJOB + str(src_city_id))
    if data:
        # 先判断 data 是否为 int，如果是，表示需要从数据库找到下一批城市id，然后再次缓存到redis中
        if not isinstance(data, int):
            return_city_id = data['city_id']
        else:
            # 如果是 int，说明缓存中已经没有数据了，需要从数据库中查询，然后再缓存到redis中
            last_city_id = data
    # 如果没有数据了，从数据库中查询，然后缓存到redis中
    if return_city_id == 0:
        sql = 'SELECT city_id FROM pingable where city_id>%s and lastresult>=' + settings.NEW_PINGABLE_IP + ' GROUP BY city_id limit 50'
        ipdatas = mysql_select(sql, (last_city_id,))
        if ipdatas == None or len(ipdatas) == 0:
            # 如果没有数据了，从头开始查询
            if last_city_id != 0:
                ipdatas = mysql_select(sql, (0,))
        # 如果都没有数据，则返回 None
        if ipdatas != None and len(ipdatas)>0:
            for ipdata in ipdatas:
                if return_city_id == 0:
                    return_city_id = ipdata['city_id']
                else:
                    cache_push(settings.CACHEKEY_CITYJOB + str(src_city_id), ipdata)
                last_city_id = ipdata['city_id']
            # 缓存最后一个 city_id，用于缓存取光后，继续下次的查询
            cache_push(settings.CACHEKEY_CITYJOB + str(src_city_id), last_city_id)
            # print(f'got {len(ipdatas)} cityids with {src_city_id} last_id {last_city_id}')
    if return_city_id == 0:
        return None
    # 查找该city_id的可用ip列表
    iplists = mysql_select('SELECT ip FROM pingable where city_id=%s and lastresult>=' + settings.NEW_PINGABLE_IP + ' order by RAND() LIMIT 100;', (return_city_id,), False)
    if iplists == None or len(iplists) == 0:
        return None
    return {
        'city_id': return_city_id,
        'ips': [x[0] for x in iplists]
    }

def update_speed_status(job:str, count:int, isread:bool):
    # 'speed-ping-get','speed-ping-set','speed-data-get','speed-data-set'
    key = 'speed-' + job + ('-get' if isread else '-set')
    speed_counter = SpeedCounter(redis_pool, settings.CACHEKEY_RECENT_TASKS + key)
    speed_counter.update_count(count)

# agent=ping or data, return str(int) for sleep intval, pause the system
def update_client_status(ip:str, agent:str):
    tracker = OnlineIPTracker(redis_pool, settings.CACHEKEY_ONLINE_SERVERS + agent)
    tracker.update_ip(ip)
    return cache_get(settings.CACHEKEY_PAUSE)

# 计算数组的 Pxx 取值
# 该函数可以使用 np.percentile(sorted_data, 75) 代替，只是npmpy库太大
# 要求 sorted_data 是已排序列表，p: 分位数 (0-100)
def np_percentile(sorted_data, p, accurate = False):
    if not sorted_data:
        return None
    n = len(sorted_data)
    rank = p / 100.0 * (n - 1)
    index_floor = int(rank)
    index_ceil = min(index_floor + 1, n - 1)
    if index_floor == index_ceil or accurate == False:
        return float(sorted_data[index_floor])
    # 如果p指向是两个元素之间，进行线性插值精确结果
    fraction = rank - index_floor
    return sorted_data[index_floor] * (1 - fraction) + sorted_data[index_ceil] * fraction

def get_cookie(cookies:str, key:str, default_val=''):
    if cookies == '':
        return default_val
    cookies = ' ' + cookies
    start = cookies.find(f" {key}=")
    if start == -1:
        start = cookies.find(f";{key}=")
        if start == -1:
            return default_val
    start += len(key) + 2
    end = cookies.find(";", start)
    return cookies[start:] if end == -1 else cookies[start:end]

def validate_user_token(auth:int, token:str):
    if auth == settings.AUTH_NOTNEED:
        return True
    if not token:
        return False
    if not token.isalnum():
        return False
    val = cache_get(settings.CACHEKEY_USERAUTH + myhash(token))
    if val != None and (auth & val["auth"]) == auth:
        return True
    return False

def get_user_info_by_token(token:str):
    if not token:
        return None
    if not token.isalnum():
        return None
    return cache_get(settings.CACHEKEY_USERAUTH + myhash(token))

# if ssouser exist, user = ssouser@user
def validate_user(user:str, ssouser:str, password:str, expire:int = settings.CACHE_LONG_TTL):
    if not user.isalnum():
        return None
    if ssouser and not ssouser.isalnum():
        return None
    ret = mysql_select('select password,auth from user where name=%s',(user,))
    if ret == None or len(ret) == 0:
        return None
    if ret[0]['password'] == myhash(myhash(password)+user+'myuserencrpt'):
        if ssouser:
            user = ssouser + '@' + user
        key = myhash(str(time.time()) + user)
        cache_set(settings.CACHEKEY_USERAUTH + myhash(key), {"user":user, "auth":ret[0]['auth']}, expire)
        return {
            "token": key,
            "user": user,
            "auth": ret[0]['auth'],
            "expire": expire
        }
    return None

# is_valid, errors, stats = create_user()
def create_user(user:str, password:str, auth:int=settings.AUTH_BASEUSER):
    # sso user can not change passwd
    if '@' in user:
        return {
            'statusCode': 403,
            'result': "can not modify sso user!"
        }
    if not user.isalnum():
        return {
            'statusCode': 403,
            'result': 'username must only contain letter or number'
        }
    validator = EnhancedPasswordValidator()
    is_valid, errors, stats = validator.validate(password)
    if not is_valid:
        return {
            'statusCode': 403,
            'result': '; '.join(errors)
        }
    if auth not in [settings.AUTH_BASEUSER, settings.AUTH_READONLY, settings.AUTH_ADMIN]:
        return {
            'statusCode': 403,
            'result': 'role error!'
        }
    password = myhash(myhash(password)+user+'myuserencrpt')
    mysql_execute('INSERT INTO `user`(`name`,`password`,`auth`) VALUES(%s, %s, %s) ON DUPLICATE KEY UPDATE password=%s,auth=%s', (user, password, auth, password, auth))
    return {
        'statusCode': 200,
        'result': 'success'
    }
