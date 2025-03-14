#!/bin/bash

sql=${1:-select * from country limit 10}

ADMIN_LAMBDA=$(aws cloudformation describe-stacks --stack-name CloudperfStack --query 'Stacks[0].Outputs[?OutputKey==`adminLambda`].OutputValue' --output text --region us-east-1)
aws lambda invoke --function-name ${ADMIN_LAMBDA} --payload "{\"action\":\"exec_sql\",\"param\":\"${sql}\"}" \
    --region us-east-1 --cli-binary-format raw-in-base64-out --log-type Tail --output text \
    --query 'LogResult' /dev/stderr | base64 -d
# sample output is:
# 列名: code | name | continent_code | continent_name | update_time
# AD | Andorra | EU | Europe | 2025-01-04 03:46:39
# AE | United Arab Emirates | AS | Asia | 2025-01-04 03:46:39
# AF | Afghanistan | AS | Asia | 2025-01-04 03:46:40
# AG | Antigua and Barbuda |  | North America | 2025-01-05 15:08:09
