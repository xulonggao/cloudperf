#!/bin/bash

# 注意，该脚本需要在 cloudperf vpc 中执行，建议开启 cloudshell 实例来执行，可以直接进行数据库的整体导入导出，以下提供稳定可ping ip的导出例子

DEPLOY_REGION="${CDK_DEFAULT_REGION:-us-east-1}"
DB_SECRET=$(aws cloudformation describe-stacks --stack-name CloudperfStack --query 'Stacks[0].Outputs[?OutputKey==`dbSecret`].OutputValue' --output text --region ${DEPLOY_REGION})
SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id ${DB_SECRET} --query SecretString --output text --region ${DEPLOY_REGION})
DB_USER=$(echo ${SECRET_JSON} | jq -r '.username')
DB_PASS=$(echo ${SECRET_JSON} | jq -r '.password')

mysqldump -h rds.cloudperf.vpc -u admin -p${DB_PASS} cloudperf pingable --where="lastresult>=15" | zip stable_pingable.zip -
