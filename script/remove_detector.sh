#!/bin/bash
# ./remove_detector.sh [部署类型] [部署地点] [探测器类型，默认为空]
# ./remove_detector.sh aws
# ./remove_detector.sh aws us-east-1
# ./remove_detector.sh aws us-east-1 fping-pingable
# ./remove_detector.sh ssh ec2-user@1.2.3.4

deploy_type=${1:-aws}
deploy_location=${2:-all}
detector_type=${3:-fping-job}

echo "start remove ${deploy_type} ${deploy_location} ${detector_type} ..."

if [ "${deploy_type}" == "aws" ]; then
    #instance_type="t3.nano"
    #arch="x86_64"
    instance_type="t4g.nano"
    arch="arm64"
    if [ "${deploy_location}" == "all" ]; then
        deploy_location=$(aws ec2 describe-regions --query 'Regions[].RegionName' --output text)
    fi
    # 探测的机器，会最多固定使用10MB带宽和100K的包量，cpu 最高 30%，10任务并发，最小的机型就足够
    # aws部署
    # https://docs.aws.amazon.com/zh_cn/AWSEC2/latest/UserGuide/finding-an-ami.html
    # aws ec2 describe-images --owners amazon --filters "Name=name,Values=amzn2-ami-hvm-2.0.20200619.0-x86_64-gp2" --region ap-southeast-1
    # --security-group-ids sg-0b1b2c3d4e5f6g7h --subnet-id subnet-0a1b2c3d4e5f6g7h --key-name 'barry@localhost'
    for deploy_region in ${deploy_location}; do
        INSTANCE_IDS=$(aws ec2 describe-instances --region ${deploy_region} --output text \
            --filters Name=tag:CostCenter,Values=cloudperf-stack Name=tag:Name,Values=${detector_type} --query 'join(`,`,Reservations[].Instances[].InstanceId)')
        INSTANCE_IDS=${INSTANCE_IDS//,/ }
        echo "Process ${deploy_region} ${INSTANCE_IDS} ..."

        # --targets "Key=tag:CostCenter,Values=cloudperf-stack"
        COMMAND_ID=$(aws ssm send-command \
            --instance-ids ${INSTANCE_IDS} \
            --document-name "AWS-RunShellScript" \
            --parameters "commands=[\"curl -sSL https://raw.githubusercontent.com/tansoft/fping/refs/heads/develop/setup/uninstall-linux.sh | sed 's/fping-job/${detector_type}/g' | bash\"]" \
            --region ${deploy_region} \
            --query "Command.CommandId" \
            --output text)

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

    done
elif [ "${deploy_type}" == "ssh" ]; then
    # ssh部署
    echo "uninstall by ssh ${deploy_location} ..."
    ssh ${deploy_location} "curl -sSL https://raw.githubusercontent.com/tansoft/fping/refs/heads/develop/setup/uninstall-linux.sh | sed 's/fping-job/${detector_type}/g' | sudo bash"
else
    echo "do not support deploy type ${deploy_type}"
    exit 1
fi

exit 0
