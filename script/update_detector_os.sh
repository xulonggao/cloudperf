#!/bin/bash
# ./update_detector.sh [部署类型] [部署地点] [探测器类型，默认为空]
# ./update_detector.sh aws all
# ./update_detector.sh aws us-east-1
# ./update_detector.sh aws us-east-1 fping-pingable
# ./update_detector.sh ssh ec2-user@1.2.3.4

deploy_type=${1:-aws}
deploy_location=${2:-all}
detector_type=${3:-fping-job}

# 是否等待系统更新完成，等待会比较慢
WAIT_RESULT="0"

echo "start update ${deploy_type} ${deploy_location} ${detector_type} ..."

if [ "${deploy_type}" == "aws" ]; then
    if [ "${deploy_location}" == "all" ]; then
        deploy_location=$(aws ec2 describe-regions --query 'Regions[].RegionName' --output text)
    fi
    for deploy_region in ${deploy_location}; do
        INSTANCE_IDS=$(aws ec2 describe-instances --region ${deploy_region} --output text \
            --filters Name=tag:CostCenter,Values=cloudperf-stack Name=tag:Name,Values=${detector_type} --query 'join(`,`,Reservations[].Instances[].InstanceId)')
        INSTANCE_IDS=${INSTANCE_IDS//,/ }
        echo "Process ${deploy_region} ${INSTANCE_IDS} ..."

        # --targets "Key=tag:CostCenter,Values=cloudperf-stack"
        COMMAND_ID=$(aws ssm send-command \
            --instance-ids ${INSTANCE_IDS} \
            --document-name "AWS-RunShellScript" \
            --parameters "commands=[\"sudo dnf -y update && sudo needs-restarting -r || sudo reboot\"]" \
            --region ${deploy_region} \
            --query "Command.CommandId" \
            --output text)

        if [ "${WAIT_RESULT}" == "1" ]; then
            for INSTANCE_ID in ${INSTANCE_IDS}; do
                echo "Waiting Command ID: ${COMMAND_ID} Instance: ${INSTANCE_ID} ..."
                # 等待命令完成
                while true; do
                    STATUS=$(aws ssm get-command-invocation \
                        --command-id "${COMMAND_ID}" \
                        --instance-id "${INSTANCE_ID}" \
                        --region "${deploy_region}" \
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
                    --region "${deploy_region}" \
                    --query "StandardOutputContent" \
                    --output text
            done
        fi
    done
elif [ "${deploy_type}" == "ssh" ]; then
    # ssh部署
    echo "update by ssh ${deploy_location} ..."
    ssh ${deploy_location} "sudo dnf -y update && sudo needs-restarting -r || sudo reboot"
else
    echo "do not support deploy type ${deploy_type}"
    exit 1
fi

exit 0
