#!/bin/bash
# ./update_detector.sh
# ./update_detector.sh fping-job
# ./update_detector.sh fping-pingable us-east-1

TARGET=${1:-fping-job}
REGIONS=${2:-}

if [ "${REGIONS}" == "" ]; then
    REGIONS=$(aws ec2 describe-regions --query 'Regions[].RegionName' --output text)
fi

for REGION in ${REGIONS}; do
    INSTANCE_IDS=$(aws ec2 describe-instances --region ${REGION} --output text \
        --filters Name=tag:CostCenter,Values=cloudperf-stack Name=tag:Name,Values=${TARGET} --query 'join(`,`,Reservations[].Instances[].InstanceId)')
    INSTANCE_IDS=${INSTANCE_IDS//,/ }
    echo "Process ${REGION} ${INSTANCE_IDS} ..."

    # --targets "Key=tag:CostCenter,Values=cloudperf-stack"
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids ${INSTANCE_IDS} \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[\"systemctl stop ${TARGET}.service; wget -q -O /usr/bin/${TARGET} https://github.com/tansoft/fping/raw/refs/heads/develop/setup/fping.x86_64; chmod +x /usr/bin/${TARGET}; systemctl start ${TARGET}.service; md5sum /usr/bin/${TARGET}; systemctl status ${TARGET}.service\"]" \
        --region ${REGION} \
        --query "Command.CommandId" \
        --output text)

    for INSTANCE_ID in ${INSTANCE_IDS}; do
        echo "Waiting Command ID: ${COMMAND_ID} Instance: ${INSTANCE_ID} ..."
        # 等待命令完成
        while true; do
            STATUS=$(aws ssm get-command-invocation \
                --command-id "${COMMAND_ID}" \
                --instance-id "${INSTANCE_ID}" \
                --region "${REGION}" \
                --query "Status" \
                --output text)
            echo "Status: $STATUS"
            if [ "$STATUS" = "Success" ]; then
                break
            elif [ "$STATUS" = "Failed" ] || [ "$STATUS" = "TimedOut" ]; then
                break
            fi
            sleep 1
        done

        # 获取输出
        aws ssm get-command-invocation \
            --command-id "${COMMAND_ID}" \
            --instance-id "${INSTANCE_ID}" \
            --region "${REGION}" \
            --query "StandardOutputContent" \
            --output text
    done

done
