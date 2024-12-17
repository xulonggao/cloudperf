#!/bin/bash
# ./local_test.sh '{"action":"exec_sql","param":"init_db"}'
# ./local_test.sh '{"action":"exec_sqlfile","param":"../data/import-sql/range.sql"}'
# ./local_test.sh '{"action":"exec_sql","param":"CREATE DATABASE IF NOT EXISTS `cloudperf` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"}'

DB_WRITE_HOST=127.0.0.1 DB_READ_HOST=127.0.0.1 DB_USER=xxxxx DB_PASS=xxxxx python3 lambda_function.py "$*"