import boto3
import json
import os

CACHE_HOST='redis.int.cloudperf.org'
CACHE_PORT=6379
CACHE_BASE_TTL=3600

DB_READ_HOST='r.rds.int.cloudperf.org'
DB_WRITE_HOST='w.rds.int.cloudperf.org'
DB_PORT=3306
DB_USER='admin'
DB_PASS='xxxxx'
DB_DATABASE='cloudperf'

CACHE_HOST = os.environ.get('CACHE_HOST', CACHE_HOST)
CACHE_PORT = os.environ.get('CACHE_PORT', CACHE_PORT)

DB_READ_HOST = os.environ.get('DB_READ_HOST', DB_READ_HOST)
DB_WRITE_HOST = os.environ.get('DB_WRITE_HOST', DB_WRITE_HOST)
DB_PORT = os.environ.get('DB_PORT', DB_PORT)
DB_SECRET = os.environ.get('DB_SECRET', '')
if DB_SECRET != '':
    secrets_manager = boto3.client('secretsmanager')
    valobj = secrets_manager.get_secret_value(SecretId=DB_SECRET)
    secret_dict = json.loads(valobj['SecretString'])
    DB_USER = secret_dict['username']
    DB_PASS = secret_dict['password']
