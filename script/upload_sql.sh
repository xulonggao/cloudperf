#!/bin/bash

# cdk 部署的区域，如果使用了 export CDK_DEFAULT_REGION 进行指定，请确保这个指向是正确的
DEPLOY_REGION="${CDK_DEFAULT_REGION:-us-east-1}"

sqlfile=$1
if [ "${sqlfile}" == "" ]; then
    echo './upload_sql.sh [sqlfile]'
    echo './upload_sql.sh init.sql'
    exit 1
fi

S3_BUCKET=$(aws cloudformation describe-stacks --stack-name CloudperfStack --query 'Stacks[0].Outputs[?OutputKey==`s3Bucket`].OutputValue' --output text --region ${DEPLOY_REGION})
FILENAME=$(basename "${sqlfile}")
aws s3 cp ${sqlfile} s3://${S3_BUCKET}/import-sql/${FILENAME}
