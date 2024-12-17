#!/bin/bash
# ./local_test.sh '{"action":"exec_sql","param":"init_db"}'
# ./local_test.sh '{"action":"exec_sqlfile","param":"../data/import-sql/range.zip"}'
# ./local_test.sh '{"action":"exec_sqlfile","param":"../data/import-sql/country.zip"}'
# ./local_test.sh '{"action":"exec_sql","param":"select * from asn;"}'

DB_WRITE_HOST=127.0.0.1 DB_READ_HOST=127.0.0.1 DB_USER=xxxxx DB_PASS=xxxxx python3 lambda_function.py "$*"