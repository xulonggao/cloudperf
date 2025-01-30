import boto3
import json
import os

CACHE_HOST='redis.cloudperf.vpc'
CACHE_PORT=6379
CACHE_BASE_TTL=3600
CACHE_LONG_TTL=86400

CACHEKEY_SQL = 'sql'
CACHEKEY_PINGABLE = 'ping'
CACHEKEY_CITYJOB = 'job'

DB_READ_HOST='rds-r.cloudperf.vpc'
DB_WRITE_HOST='rds.cloudperf.vpc'
DB_PORT=3306
DB_USER=''
DB_PASS=''
DB_DATABASE='cloudperf'

CACHE_HOST = os.environ.get('CACHE_HOST', CACHE_HOST)
CACHE_PORT = os.environ.get('CACHE_PORT', CACHE_PORT)

DB_READ_HOST = os.environ.get('DB_READ_HOST', DB_READ_HOST)
DB_WRITE_HOST = os.environ.get('DB_WRITE_HOST', DB_WRITE_HOST)
STR_DB_PORT = os.environ.get('DB_PORT', '')
if STR_DB_PORT != '':
    DB_PORT = int(STR_DB_PORT)
DB_SECRET = os.environ.get('DB_SECRET', '')
if DB_SECRET != '':
    secrets_manager = boto3.client('secretsmanager')
    valobj = secrets_manager.get_secret_value(SecretId=DB_SECRET)
    secret_dict = json.loads(valobj['SecretString'])
    DB_USER = secret_dict['username']
    DB_PASS = secret_dict['password']
else:
    DB_USER = os.environ.get('DB_USER', '')
    DB_PASS = os.environ.get('DB_PASS', '')
