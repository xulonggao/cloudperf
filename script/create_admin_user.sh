#!/bin/bash

user_name=${1:-admin}

ADMIN_LAMBDA=$(aws cloudformation describe-stacks --stack-name CloudperfStack --query 'Stacks[0].Outputs[?OutputKey==`adminLambda`].OutputValue' --output text --region us-east-1)
aws lambda invoke --function-name ${ADMIN_LAMBDA} --payload "{\"action\":\"create_user\",\"param\":\"${user_name}\"}" \
    --region us-east-1 --cli-binary-format raw-in-base64-out --log-type Tail --output text \
    --query 'LogResult' /dev/stderr | base64 -d | grep "generate password"
# sample output is:
# general password for admin: xxxx
