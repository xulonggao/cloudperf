#!/bin/bash
# ./terminate_detector.sh all
# ./terminate_detector.sh us-east-1
# ./terminate_detector.sh us-east-1 fping-pingable

deploy_location=${1:-all}
detector_type=${2:-fping-job}

if [ "${deploy_location}" == "all" ]; then
    deploy_location=$(aws ec2 describe-regions --query 'Regions[].RegionName' --output text)
fi

for deploy_region in ${deploy_location}; do
    INSTANCE_IDS=$(aws ec2 describe-instances --region ${deploy_region} --output text \
        --filters Name=tag:CostCenter,Values=cloudperf-stack Name=tag:Name,Values=${detector_type} --query 'join(`,`,Reservations[].Instances[].InstanceId)')
    INSTANCE_IDS=${INSTANCE_IDS//,/ }

    read -p "确认终止 ${deploy_region} ${detector_type} 实例 ${INSTANCE_IDS} (y/n) " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Terminate ${deploy_region} ${INSTANCE_IDS} ..."

        aws ec2 terminate-instances --instance-ids ${INSTANCE_IDS}
        aws ec2 wait instance-terminated --instance-ids ${INSTANCE_IDS}
    else
        echo "Canceled."
    fi
done
