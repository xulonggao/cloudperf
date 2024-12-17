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

def mysql_select(sql:str, obj = None):
    conn = pymysql.connect(host=settings.DB_READ_HOST, user=settings.DB_USER, passwd=settings.DB_PASS, db=settings.DB_DATABASE, charset='utf8mb4', port=settings.DB_PORT)
    cursor = conn.cursor()
    cursor.execute(sql, obj)
    row_all = cursor.fetchall()
    cursor.close()
    conn.close()
    return row_all

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
