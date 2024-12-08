import ipaddress
import pymysql
import redis
import settings

redis_pool = redis.ConnectionPool(
    host=settings.CACHE_HOST,
    port=settings.CACHE_PORT,
    decode_responses=True,
    connection_class=redis.SSLConnection,
    socket_timeout=5,
    socket_connect_timeout=5)

def mysql_select(sql:str, obj = None):
    conn = pymysql.connect(host=settings.DB_READ_HOST, user=settings.DB_USER, passwd=settings.DB_PASS, db=settings.DB_DATABASE, charset='utf8mb4', port=settings.DB_PORT)
    cursor = conn.cursor()
    cursor.execute(sql, obj)
    row_all = cursor.fetchall()
    cursor.close()
    conn.close()
    return row_all

def mysql_runsql(sql:str, obj = None):
    ret = True
    conn = pymysql.connect(host=settings.DB_WRITE_HOST, user=settings.DB_USER, passwd=settings.DB_PASS, db=settings.DB_DATABASE, charset='utf8mb4', port=settings.DB_PORT)
    cursor = conn.cursor()
    try:
        cursor.execute(sql, obj)
        conn.commit()
    except Exception as e:
        print(f"Error executing SQL script: {e}")
        conn.rollback()
        ret = False
    finally:
        cursor.close()
        conn.close()
    return ret

def mysql_select_onevalue(sql:str, obj = None, default = 0):
    row = mysql_select(sql, obj)
    if row == None or len(row) == 0:
        return default
    return row[0][0]

def cache_get(key:str):
    r = redis.StrictRedis(connection_pool=redis_pool)
    return r.get(key)

def cache_set(key:str, value, ttl:int = settings.CACHE_BASE_TTL):
    r = redis.StrictRedis(connection_pool=redis_pool)
    return r.setex(key, ttl, value)

def cache_mysql_get_onevalue(sql:str, default = 0, ttl:int = settings.CACHE_BASE_TTL):
    key = f'sql{hash(sql)}'
    val = cache_get(key)
    if val != None:
        return val
    ret = mysql_select_onevalue(sql, default = default)
    cache_set(key, ret, ttl)
    return ret

def get_cityid_by_ip(ip:str):
    ipno = ipaddress.IPv4Address(ip)._ip
    row = cache_mysql_get_onevalue(f"select city_id from iprange where start_ip<={ipno} and end_ip>={ipno}", 0)
    return row