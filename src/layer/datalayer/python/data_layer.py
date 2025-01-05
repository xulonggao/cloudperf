import ipaddress
import pymysql
import redis
import settings
from typing import List, Dict, Any

redis_pool = redis.ConnectionPool(
    host=settings.CACHE_HOST,
    port=settings.CACHE_PORT,
    decode_responses=True,
    connection_class=redis.SSLConnection,
    socket_timeout=5,
    socket_connect_timeout=5)

def mysql_create_database(database:str = None):
    if database == None:
        database = settings.DB_DATABASE
    conn = pymysql.connect(host=settings.DB_WRITE_HOST, user=settings.DB_USER, passwd=settings.DB_PASS, charset='utf8mb4', port=settings.DB_PORT)
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

def mysql_select(sql:str, obj = None, fetchObject = True):
    conn = pymysql.connect(host=settings.DB_READ_HOST, user=settings.DB_USER, passwd=settings.DB_PASS, db=settings.DB_DATABASE, charset='utf8mb4', port=settings.DB_PORT)
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
        conn = pymysql.connect(
            host=settings.DB_WRITE_HOST,
            user=settings.DB_USER,
            passwd=settings.DB_PASS,
            db=settings.DB_DATABASE,
            charset='utf8mb4',
            port=settings.DB_PORT,
            client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS
        )
        cursor = conn.cursor()

        # 分割SQL语句
        sql_statements = sql.strip().split(";")
        
        # 执行每条SQL语句
        for sql in sql_statements:
            sql = sql.strip()
            if sql:  # 忽略空语句
                cursor.execute(sql)
                if sql.lower().startswith("select"):
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
                            'columns': columns,
                            'rows': rows
                        })
                    else:
                        print('无结果返回')
                        results.append({
                            'sql': sql,
                            'type': 'query',
                            'message': '无结果返回'
                        })
                else:
                    print(f"影响行数: {cursor.rowcount}")
                    # 非查询语句
                    results.append({
                        'sql': sql,
                        'type': 'update',
                        'affected_rows': cursor.rowcount
                    })
                conn.commit()

    except Exception as e:
        print(f"{sql}\n错误: {str(e)}")
        results.append({'error': str(e)})

    finally:
        if 'conn' in locals():
            conn.close()
    return results

def mysql_print_results(results):
    """打印执行结果"""
    for result in results:
        if 'error' in result:
            print(f"\n错误: {result['error']}")
            continue
        print(f"\n执行SQL: {result['sql']}")        
        if result['type'] == 'query':
            if 'columns' in result:
                print("列名:", " | ".join(result['columns']))
                for row in result['rows']:
                    print(" | ".join(map(str, row)))
            else:
                print(result['message'])
        else:
            print(f"影响行数: {result['affected_rows']}")   

def mysql_batch_runsql(sql:str):
    ret = True
    # Enable multi-statements in connection
    conn = pymysql.connect(
        host=settings.DB_WRITE_HOST,
        user=settings.DB_USER,
        passwd=settings.DB_PASS,
        db=settings.DB_DATABASE,
        charset='utf8mb4',
        port=settings.DB_PORT,
        client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS
    )
    cursor = conn.cursor()
    try:
        cursor.execute(sql)
        # Handle multiple result sets
        while True:
            try:
                cursor.fetchall()
                if not cursor.nextset():
                    break
            except:
                pass
        conn.commit()
    except Exception as e:
        print(f"Error executing SQL script: {e}")
        conn.rollback()
        ret = False
    finally:
        cursor.close()
        conn.close()
    return ret

def mysql_runsql(sql:str, obj = None):
    conn = pymysql.connect(host=settings.DB_WRITE_HOST, user=settings.DB_USER, passwd=settings.DB_PASS, db=settings.DB_DATABASE, charset='utf8mb4', port=settings.DB_PORT)
    cursor = conn.cursor()
    try:
        cursor.execute(sql, obj)
        ret = cursor.fetchall()
    except Exception as e:
        print(f"Error executing SQL script: {e}")
        conn.rollback()
        ret = False
    finally:
        cursor.close()
        conn.close()
    return ret

def mysql_select_onevalue(sql:str, obj = None, default = 0):
    row = mysql_select(sql, obj, False)
    if row == None or len(row) == 0:
        return default
    return row[0][0]

def cache_get(key:str):
    try:
        r = redis.StrictRedis(connection_pool=redis_pool)
        return r.get(key)
    except Exception as e:
        print('cache get failed.')
        return None

def cache_set(key:str, value, ttl:int = settings.CACHE_BASE_TTL):
    try:
        r = redis.StrictRedis(connection_pool=redis_pool)
        print('cache set:', key, ttl, value)
        return r.setex(key, ttl, value)
    except Exception as e:
        print('cache set failed.', key, ttl, value)
        return None

def cache_mysql_get_onevalue(sql:str, default = 0, ttl:int = settings.CACHE_BASE_TTL):
    key = f'sqlov_{hash(sql)}'
    val = cache_get(key)
    if val != None:
        return val
    ret = mysql_select_onevalue(sql, default = default)
    cache_set(key, ret, ttl)
    return ret

def cache_mysql_select(sql:str, obj = None, fetchObject = True, ttl:int = settings.CACHE_BASE_TTL):
    key = f'sqlsl_{hash(sql)}{hash(obj)}{hash(fetchObject)}'
    val = cache_get(key)
    if val != None:
        return val
    ret = mysql_select(sql, obj, fetchObject)
    cache_set(key, ret, ttl)
    return ret

def get_countrys():
    return cache_mysql_select('select code,name from country order by code', ttl=settings.CACHE_LONG_TTL)

def get_citys_by_country_code(country_code):
    return cache_mysql_select(
        'SELECT name as id,name,latitude,longitude FROM city WHERE country_code = %s GROUP BY name', (country_code,))

def get_asns_by_country_city(country_code, city_name):
    return get_cityobject("c.country_code = %s and c.name = %s",(country_code,city_name,))

def get_cityobject(filter:str, obj = None, limit:int = 50):
    return cache_mysql_select('''
select c.id as cityId,a.asn as asn,c.country_code as country,
COALESCE(c.friendly_name, c.name) as name,c.region as region,
a.name as asnName, a.domain as domain,
c.latitude as latitude, c.longitude as longitude,
a.type as asnType,a.ipcounts as ipcounts,
INET_NTOA(i.start_ip) as startIp, INET_NTOA(i.end_ip) as endIp from city as c, asn as a,iprange as i
 where c.id = i.city_id and c.asn=a.asn and ''' + filter + f' limit {limit}', obj)

def get_cityobject_by_ip(ip:str):
    ipno = ipaddress.IPv4Address(ip)._ip
    return get_cityobject("i.start_ip<=%s and i.end_ip>=%s", (ipno,ipno))

def get_cityobject_by_id(id:int):
    return get_cityobject("c.id=%s",(id,),limit=1)

def get_cityobject_by_keyword(keyword:str, limit=50):
    if keyword.lower().startswith('as'):
        keyword = keyword.lower().replace('asn','').replace('as','')

    if keyword.isdecimal():
        filter = f'a.asn={keyword}'
        obj = None
    else:
        filter = """ CONCAT_WS('',c.name, c.friendly_name, c.region, a.name, a.domain) LIKE %s ESCAPE '\\\\' """
        keyword = safe_like_pattern(keyword)
        obj = (f"%{keyword}%",)
    return get_cityobject(filter, obj, limit)