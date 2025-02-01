#!/bin/bash
# 用法：
#  ./deploy_detector.sh [部署类型] [部署地点] [探测器类型，默认为空]
# 部署探测可ping ip探测器，数量越多处理越快
#  ./deploy_detector.sh aws ap-southeast-1 fping-pingable
# 部署不同地区的工作节点
#  ./deploy_detector.sh aws ap-southeast-1
# 部署到普通服务器
#  ./deploy_detector.sh ssh root@1.2.3.4
# 依赖：
#  aws cli & configure
#  curl

deploy_type=${1:-aws}
deploy_location=${2:-us-east-1}
detector_type=${3:-fping-job}

echo "start deploy ${deploy_type} ${deploy_location} ${detector_type} ..."

if [ "${deploy_type}" == "aws" ]; then
    # aws部署
    # https://docs.aws.amazon.com/zh_cn/AWSEC2/latest/UserGuide/finding-an-ami.html
    # aws ec2 describe-images --owners amazon --filters "Name=name,Values=amzn2-ami-hvm-2.0.20200619.0-x86_64-gp2" --region ap-southeast-1
    # --security-group-ids sg-0b1b2c3d4e5f6g7h --subnet-id subnet-0a1b2c3d4e5f6g7h --key-name 'barry@localhost'
    instance=`aws ec2 run-instances \
        --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
        --instance-type t3.nano \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${detector_type}},{Key=CostCenter,Value=cloudperf-stack}]" \
        --user-data "#!/bin/bash
curl -sSL https://raw.githubusercontent.com/tansoft/fping/refs/heads/develop/setup/install-linux.sh | bash" \
        --query 'Instances[0].InstanceId' \
        --output json \
        --region ${deploy_location}`
    echo "instance id: ${instance}"
elif [ "${deploy_type}" == "ssh" ]; then
    echo "deploy to ssh"
    # ssh部署
else
    echo "do not support deploy type ${deploy_type}"
    exit 1
fi

exit 0