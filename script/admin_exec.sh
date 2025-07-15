#!/bin/bash

action=$1
param=$2

# cdk 部署的区域，如果使用了 export CDK_DEFAULT_REGION 进行指定，请确保这个指向是正确的
DEPLOY_REGION="${CDK_DEFAULT_REGION:-us-east-1}"

if [ "${action}" == "" ]; then
    echo './admin_exec.sh [action] [param]'
    echo './admin_exec.sh create_user admin'
    echo './admin_exec.sh exec_sql "select * from country limit 10"'
    echo './admin_exec.sh mysql_dump "country,city,asn,iprange,cityset"'
    exit 1
fi

ADMIN_LAMBDA=$(aws cloudformation describe-stacks --stack-name CloudperfStack --query 'Stacks[0].Outputs[?OutputKey==`adminLambda`].OutputValue' --output text --region ${DEPLOY_REGION})
aws lambda invoke --function-name ${ADMIN_LAMBDA} --payload "{\"action\":\"${action}\",\"param\":\"${param}\"}" \
    --region us-east-1 --cli-binary-format raw-in-base64-out --log-type Tail --output text \
    --query 'LogResult' /dev/stderr | base64 -d

if [ "${action}" == "mysql_dump" ]; then
    S3_BUCKET=$(aws cloudformation describe-stacks --stack-name CloudperfStack --query 'Stacks[0].Outputs[?OutputKey==`s3Bucket`].OutputValue' --output text --region ${DEPLOY_REGION})
    echo 'check file in s3://'${S3_BUCKET}'/export-sql/'
    aws s3 ls s3://${S3_BUCKET}/export-sql/
fi

# action: create_user
#   general password for admin: xxxx
# action: exec_sql
#   列名: code | name | continent_code | continent_name | update_time
#   AD | Andorra | EU | Europe | 2025-01-04 03:46:39
#   AE | United Arab Emirates | AS | Asia | 2025-01-04 03:46:39
#   AF | Afghanistan | AS | Asia | 2025-01-04 03:46:40
#   AG | Antigua and Barbuda |  | North America | 2025-01-05 15:08:09
