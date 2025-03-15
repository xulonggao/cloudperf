#!/bin/bash
# 用法：
#  ./deploy_detector.sh [部署类型] [部署地点] [探测器类型，默认为空]
# 部署探测可ping ip探测器，数量越多处理越快
#  ./deploy_detector.sh aws ap-southeast-1 fping-pingable
# 部署不同地区的工作节点
#  ./deploy_detector.sh aws ap-southeast-1
# 部署到多个region
#  ./deploy_detector.sh aws "ap-southeast-1 us-east-1"
# 部署到所有region
#  ./deploy_detector.sh aws all
# 部署到普通服务器
#  ./deploy_detector.sh ssh ec2-user@1.2.3.4
# 依赖：
#  aws cli & configure
#  curl

alb_host=$(aws cloudformation describe-stacks --stack-name CloudperfStack --query 'Stacks[0].Outputs[?OutputKey==`albHost`].OutputValue' --output text --region us-east-1)
if [ "${alb_host}"  == "" ]; then
    echo "can not get alb host from CloudperfStack"
    exit 1
fi
# http://my-fping-job.com/api/install
install_script_url="http://${alb_host}/api/install"

deploy_type=${1:-aws}
deploy_location=${2:-all}
detector_type=${3:-fping-job}

echo "start deploy ${deploy_type} ${deploy_location} ${detector_type} ..."

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
        instance=`aws ec2 run-instances \
            --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-${arch} \
            --instance-type ${instance_type} \
            --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${detector_type}},{Key=CostCenter,Value=cloudperf-stack}]" \
            --user-data "#!/bin/bash
curl -sSL "${install_script_url}?type=${detector_type}" | bash" \
        --query 'Instances[0].InstanceId' \
        --output json \
        --region ${deploy_region}`
        echo "instance id: ${instance} in region ${deploy_region}"
    done
elif [ "${deploy_type}" == "ssh" ]; then
    # ssh部署
    echo "deploy by ssh ${deploy_location} ..."
    ssh ${deploy_location} "curl -sSL "${install_script_url}?type=${detector_type}" | sudo bash"
else
    echo "do not support deploy type ${deploy_type}"
    exit 1
fi

exit 0