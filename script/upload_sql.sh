#!/bin/bash

sqlfile=$1
if [ "${sqlfile}" == "" ]; then
    echo './upload_sql.sh [sqlfile]'
    echo './upload_sql.sh init.sql'
    exit 1
fi

S3_BUCKET=$(aws cloudformation describe-stacks --stack-name CloudperfStack --query 'Stacks[0].Outputs[?OutputKey==`s3Bucket`].OutputValue' --output text --region us-east-1)
FILENAME=$(basename "${sqlfile}")
aws s3 cp s3://${S3_BUCKET}/import-sql/${FILENAME} ${sqlfile}
