#!/bin/bash
# ./local_test.sh admin '{"action":"exec_sql","param":"init_db"}'
# ./local_test.sh admin '{"action":"exec_sqlfile","param":"data/import-sql/range.zip"}'
# ./local_test.sh admin '{"action":"exec_sqlfile","param":"data/import-sql/country.zip"}'
# ./local_test.sh admin '{"action":"exec_sql","param":"select * from asn;"}'
# ./local_test.sh api job GET '/job' 'a=b&c=d' 'body'
# ./local_test.sh api job POST '/job' 'a=b&c=d' 'body'
# ./local_test.sh admin '{"action":"get_city_id","param":"3.13.0.254"}'
# ./local_test.sh admin '{"action":"create_user","param":"admin"}'

DB_WRITE_HOST=127.0.0.1
DB_READ_HOST=127.0.0.1
DB_USER=xxx
DB_PASS=xxx

if [ "$1" == "api" ]; then
    json='{"headers":{"x-forwarded-for":"127.0.0.1","user-agent":"cli"},"httpMethod":"'$3'","path":"'$4'","queryStringParameters":"'$5'","body":"'$6'"}'
    echo ${json}
    DB_WRITE_HOST=${DB_WRITE_HOST} DB_READ_HOST=${DB_READ_HOST} DB_USER=${DB_USER} DB_PASS=${DB_PASS} PYTHONPATH=layer/datalayer/python/ \
        python3 $1/lambda_function.py "${json}"
else
    fn=$1
    shift
    DB_WRITE_HOST=${DB_WRITE_HOST} DB_READ_HOST=${DB_READ_HOST} DB_USER=${DB_USER} DB_PASS=${DB_PASS} PYTHONPATH=layer/datalayer/python/ \
        python3 ${fn}/lambda_function.py "$*"
fi