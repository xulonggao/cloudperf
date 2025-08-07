# CDK部署的原理和这个项目的部署逻辑。

## CDK部署原理

### 1. CDK基本概念
AWS CDK (Cloud Development Kit) 是一个基础设施即代码(IaC)框架，它允许你使用熟悉的编程语言来定义云基础设施。CDK的工作原理是：

• **代码转换**: TypeScript/Python等代码 → CloudFormation模板
• **资源编排**: 通过CloudFormation管理AWS资源的创建、更新和删除
• **依赖管理**: 自动处理资源间的依赖关系

### 2. CloudPerf项目的CDK架构

这个项目使用TypeScript编写CDK代码，核心文件结构：

cloudperf/
├── bin/cloudperf.ts          # CDK应用入口点
├── lib/cloudperf-stack.ts    # 主要的Stack定义
├── cdk.json                  # CDK配置文件
└── package.json              # 依赖管理


## 部署逻辑和执行顺序

### 第一阶段：环境准备
1. 依赖安装: npm install 安装CDK依赖
2. 环境初始化: cdk bootstrap 创建CDK工具链资源
3. 模板生成: cdk synth 生成CloudFormation模板

### 第二阶段：基础设施部署 (cdk deploy)

根据lib/cloudperf-stack.ts的定义，资源创建顺序如下：

#### 1. 网络基础设施
typescript
// VPC创建 - 最先创建，其他资源依赖它
const vpc = new ec2.Vpc(this, stackPrefix + 'vpc', {
  ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
  maxAzs: 2,
  natGateways: 1
});


#### 2. 安全组
typescript
// 内网访问安全组
const sg = new ec2.SecurityGroup(this, 'int-sg', {
  vpc,
  allowAllOutbound: true
});


#### 3. 存储资源
typescript
// S3存储桶 - 用于日志和数据交换
const logBucket = new s3.Bucket(this, 'log-');
const s3Bucket = new s3.Bucket(this, 'data-');


#### 4. 数据库和缓存
typescript
// Aurora Serverless V2 数据库集群
const db = new rds.DatabaseCluster(this, 'db-', {
  engine: rds.DatabaseClusterEngine.auroraMysql(),
  serverlessV2MinCapacity: 0.5,
  serverlessV2MaxCapacity: 128,
  vpc,
  securityGroups: [sg]
});

// ElastiCache Serverless 缓存
const cacheCluster = new elasticache.CfnServerlessCache(this, stackPrefix + 'cache');


#### 5. Lambda层和函数
typescript
// Lambda层 - 包含Python依赖库
const pythonLayer = new lambda.LayerVersion(this, stackPrefix + 'layer-pythonlib');
const dataLayer = new lambda.LayerVersion(this, stackPrefix + 'layer-data');

// Lambda函数
const apiLambda = new lambda.Function(this, 'api');      // API接口
const adminLambda = new lambda.Function(this, 'admin');  // 管理功能
const webLambda = new lambda.Function(this, 'web');      // Web前端


#### 6. 负载均衡器和路由
typescript
// Application Load Balancer
const alb = new elbv2.ApplicationLoadBalancer(this, stackPrefix + 'api-alb');

// 监听器和路由规则
const listener = alb.addListener(stackPrefix + 'api-listener', { port: 80 });
listener.addTargets('web-target', { targets: [new targets.LambdaTarget(webLambda)] });
listener.addTargets('api-target', { targets: [new targets.LambdaTarget(apiLambda)] });


#### 7. DNS和SSL证书（可选）
typescript
if (props.domainName && props.hostedZoneId) {
  // ACM证书申请
  const certificate = new acm.Certificate(this, stackPrefix + 'Certificate');
  
  // Route53 DNS记录
  new route53.ARecord(this, stackPrefix + 'AliasRecord');
}


### 第三阶段：应用初始化

部署完成后，需要手动执行初始化脚本：

#### 1. 数据库初始化
bash
# 创建数据库结构
./script/admin_exec.sh exec_sql init_db

# 上传初始化SQL
./script/upload_sql.sh src/data/import-sql/init.sql


#### 2. 管理员账号创建
bash
./script/admin_exec.sh create_user admin


#### 3. 监控节点部署
bash
# 部署性能监控节点到多个AWS区域
./script/deploy_detector.sh aws "us-east-1 us-west-2 eu-west-1"


## 关键脚本文件详解

### 1. script/admin_exec.sh
• **功能**: 调用admin Lambda函数执行管理任务
• **用途**: 数据库操作、用户管理、数据导入等

### 2. script/deploy_detector.sh
• **功能**: 在AWS各区域部署EC2监控节点
• **原理**: 使用AWS CLI创建EC2实例，安装fping监控程序

### 3. script/build_web.sh
• **功能**: 构建React前端应用
• **输出**: 静态文件打包到Lambda部署包中

### 4. script/upload_sql.sh
• **功能**: 上传SQL文件到S3触发自动导入
• **机制**: S3事件通知触发admin Lambda执行SQL

## 系统架构特点

### 1. 无服务器架构
• **Lambda函数**: 处理API请求、管理任务、Web服务
• **Aurora Serverless**: 按需扩缩容的数据库
• **ElastiCache Serverless**: 按需扩缩容的缓存

### 2. 多层架构
• **表示层**: React前端 + ALB负载均衡
• **业务层**: Lambda函数处理业务逻辑
• **数据层**: Aurora MySQL + ElastiCache + S3

### 3. 分布式监控
• **中央控制**: AWS Lambda处理数据收集和分析
• **边缘节点**: 多区域EC2实例执行网络测试
• **数据流**: 监控节点 → API → 数据库 → 前端展示

### 4. 安全设计
• **网络隔离**: VPC私有子网部署数据库和缓存
• **访问控制**: 安全组限制网络访问
• **身份验证**: 用户登录和权限管理
• **数据加密**: S3和RDS启用加密

## 部署依赖关系

VPC → 安全组 → 数据库/缓存
  ↓
Lambda层 → Lambda函数
  ↓
ALB → 监听器 → 目标组
  ↓
Route53 + ACM (可选)


这个项目展示了现代云原生应用的典型架构模式，通过CDK实现了基础设施即代码，通过无服务器技术实现了高可用性和弹性扩展，通过分布式监控实现了全球网络性能监控能力。


# CloudPerf 项目 AWS 美东1区域部署指南

本文档详细说明如何将CloudPerf网络性能监控系统部署到AWS美东1区域（us-east-1）。

## 🎉 部署状态

**✅ 部署完全成功！** (2025-08-05 14:24:43 UTC)

### 🔑 管理员登录信息
- **用户名**: `admin`
- **密码**: `Gbvh595^`
- **登录地址**: http://Cloudp-cloud-uciQQ9PuVsxJ-885971817.us-east-1.elb.amazonaws.com/?query=login

### 📊 部署输出信息
- **访问地址**: http://Cloudp-cloud-uciQQ9PuVsxJ-885971817.us-east-1.elb.amazonaws.com/?query=login
- **ALB主机**: Cloudp-cloud-uciQQ9PuVsxJ-885971817.us-east-1.elb.amazonaws.com
- **数据库主机**: cloudperfstack-db0125568d-ok1im7qzqqzw.cluster-cfd5l6btde0p.us-east-1.rds.amazonaws.com
- **缓存主机**: cloudperf-cache-hejkhx.serverless.use1.cache.amazonaws.com
- **S3存储桶**: cloudperfstack-dataf0aee641-vdlyljxh5y9l
- **管理Lambda**: CloudperfStack-admin81D8EBF0-1DDLcLMhnabV
- **内部安全组**: sg-00b474d394c0803b0

### ⏱️ 部署时间统计
- **总部署时间**: 14分12秒
- **资源创建**: 70个AWS资源
- **部署区域**: us-east-1 (美东1)

### ✅ 部署验证结果
- ✅ 基础设施部署成功
- ✅ 数据库初始化完成
- ✅ 管理员账号创建成功
- ✅ 系统访问验证通过
- ✅ Lambda函数运行正常
- ✅ ALB负载均衡器工作正常
- ✅ **IP地址库数据导入完成**
- ✅ **探测器部署完成**

### 📊 数据库数据统计
| 表名 | 记录数 | 说明 |
|------|--------|------|
| `country` | 247 | 国家信息表 |
| `city` | 179,166 | 城市信息表 |
| `asn` | 70,632 | ASN(自治系统)信息表 |
| `iprange` | 781,336 | IP地址段信息表 |
| `cityset` | 41 | 城市集合信息表 |

### 🔍 探测器部署状态
| 区域 | IP可达性探测器 | 延迟测量探测器 | 状态 |
|------|----------------|----------------|------|
| us-east-1 | i-0ea6ba64f56615601 | i-0a16fd894d1252a04 | ✅ 运行中 |
| us-west-2 | i-064c53a5b03a62ce2 | i-0bf5c65194e7c0663 | ✅ 运行中 |
| eu-central-1 | i-03a29fa03f24f940e | i-047d5193379c3ff3a | ✅ 运行中 |
| ap-southeast-1 | i-0f40f68f95edb103d | i-0b4463f22cbea1be9 | ✅ 运行中 |

### 🔧 部署过程中解决的问题
1. **AWS CLI版本兼容性**: 升级到AWS CLI v2以支持脚本中的`--cli-binary-format`参数
2. **区域配置**: 确保CDK正确部署到us-east-1区域
3. **Lambda冷启动**: 等待Lambda函数完全启动后系统正常响应
4. **数据导入**: 成功上传并导入78万+条IP地址库数据

## 项目概述

CloudPerf是一个基于AWS无服务器架构的网络性能监控系统，提供：
- 跨多个地理位置的实时延迟测量
- 网络性能可视化仪表板
- IP/ASN查询功能
- 基于国家/城市/ASN的延迟数据查询
- 自定义分组统计
- 用户权限管理

## 系统架构

- **前端**: React + Vite构建的Web应用
- **后端**: AWS Lambda (Python 3.12)
- **数据库**: Aurora Serverless V2 MySQL
- **缓存**: ElastiCache Serverless (Valkey)
- **存储**: S3存储桶
- **网络**: VPC + ALB + Route53
- **部署**: AWS CDK (TypeScript)

## 前置条件

### 1. 开发环境要求
- **Node.js**: >= 22.x
- **Python**: 3.12 (可选，用于本地测试)
- **Docker**: 最新版本 (可选，用于构建依赖包)

### 2. AWS环境准备
- AWS CLI 已安装并配置
- AWS账号具有以下权限：
  - CloudFormation完整权限
  - EC2完整权限
  - Lambda完整权限
  - RDS完整权限
  - ElastiCache完整权限
  - S3完整权限
  - IAM完整权限
  - Route53完整权限
  - ACM完整权限

### 3. 工具安装
```bash
# 安装AWS CDK CLI
npm install -g aws-cdk

# 验证安装
aws --version
cdk --version
node --version
```

## 部署步骤

### 第一步：代码准备

1. **克隆项目代码**
```bash
git clone https://github.com/tansoft/cloudperf.git
cd cloudperf
```

2. **安装依赖**
```bash
npm install
```

3. **设置部署区域**
```bash
# 设置部署区域为美东1
export CDK_DEFAULT_REGION=us-east-1
```

4. **CDK环境初始化**
```bash
# 初始化CDK环境（首次部署时需要）
cdk bootstrap

# 生成CloudFormation模板
cdk synth
```

### 第二步：基础设施部署

根据您的需求选择以下部署方式之一：

#### 选项A：HTTP访问部署（推荐用于测试）（不选这个）
```bash
cdk deploy
```

#### 选项B：HTTPS自定义域名部署（推荐用于生产）（选择B）
```bash
# 替换为您的实际域名和Route53 Zone ID
cdk deploy -c domainName=cloudper-beta.xlgao.vip -c hostedZoneId=Z0825693H0BOI8OOPEWD
```

**部署过程说明：**
- 部署时间约15-20分钟
- 会创建VPC、子网、安全组、RDS集群、ElastiCache、Lambda函数、ALB等资源
- 部署完成后会输出重要的访问信息

### 第三步：数据库初始化

1. **创建数据库结构**
```bash
./script/admin_exec.sh exec_sql init_db
```

2. **上传初始化SQL**
```bash
./script/upload_sql.sh src/data/import-sql/init.sql
```

3. **验证数据库创建**
```bash
./script/admin_exec.sh exec_sql "SHOW TABLES"
```

### 第四步：创建管理员账号

```bash
# 创建管理员账号（用户名：admin）
./script/admin_exec.sh create_user admin
```

执行后会显示生成的密码：
```
general password for admin: [随机密码]
```

**请妥善保存此密码！**

### 第五步：系统访问验证

1. **获取访问地址**
   - 在CDK部署输出中查找 `customHost` 的值
   - HTTP部署：`http://[ALB-DNS-NAME]/login`
   - HTTPS部署：`https://[YOUR-DOMAIN]/login`

2. **首次登录**
   - 使用创建的管理员账号和密码登录
   - 登录后建议立即修改密码（点击右上角用户名）

### 第六步：部署监控节点

#### 6.1 部署IP发现节点（可选）
```bash
# 部署可ping IP探测节点，用于维护可用IP列表
./script/deploy_detector.sh aws us-east-1 fping-pingable
```

#### 6.2 部署性能监控节点
```bash
# 部署到美东1区域
./script/deploy_detector.sh aws us-east-1

# 部署到多个区域（推荐）
./script/deploy_detector.sh aws "us-east-1 us-west-2 eu-west-1 ap-southeast-1"

# 部署到所有AWS区域
./script/deploy_detector.sh aws all

# 部署到自定义服务器
./script/deploy_detector.sh ssh ec2-user@your-server-ip
```

### 第七步：数据导入（可选）

如果您有现有的网络数据需要导入：

1. **准备SQL文件**
   - 将SQL文件放在本地
   - 大文件建议分割（每个文件不超过10万行）

2. **上传数据**
```bash
# 上传单个SQL文件
./script/upload_sql.sh your-data.sql

# 上传ZIP压缩文件
aws s3 cp your-data.zip s3://[S3-BUCKET-NAME]/import-sql/
```

3. **验证导入**
```bash
./script/admin_exec.sh exec_sql "SELECT COUNT(*) FROM country"
```

## 部署验证

### 1. 检查基础设施状态
```bash
# 检查CloudFormation堆栈状态
aws cloudformation describe-stacks --stack-name CloudperfStack --region us-east-1

# 检查Lambda函数
aws lambda list-functions --region us-east-1 | grep cloudperf

# 检查RDS集群
aws rds describe-db-clusters --region us-east-1 | grep cloudperf
```

### 2. 检查应用功能
- 访问 `/status` 页面查看监控节点状态
- 访问 `/ipsearch` 页面测试IP查询功能
- 访问 `/maintenance` 页面进行系统维护

### 3. 检查监控节点
```bash
# 查看部署的EC2实例
aws ec2 describe-instances --filters "Name=tag:CostCenter,Values=cloudperf-stack" --region us-east-1
```

## 系统配置

### 高级设置调整
编辑 `src/layer/datalayer/python/settings.py`：
```python
# 每个cityid保存的记录数（影响查询性能）
MAX_RECORDS_PER_CITYID = 7

# 缓存过期时间设置
CACHE_BASE_TTL = 3600      # 1小时
CACHE_LONG_TTL = 86400     # 24小时
```

### 用户管理
```bash
# 创建新用户
./script/admin_exec.sh create_user username

# 重置用户密码
./script/admin_exec.sh create_user existing_username
```

## 维护操作

### 更新监控节点
```bash
# 更新所有区域的监控节点
./script/update_detector.sh aws

# 更新特定区域
./script/update_detector.sh aws us-east-1
```

### 数据库维护
```bash
# 执行SQL查询
./script/admin_exec.sh exec_sql "SELECT * FROM country LIMIT 10"

# 导出数据
./script/admin_exec.sh mysql_dump "country,city,asn,iprange"
```

### 卸载监控节点
```bash
# 卸载特定区域的节点
./script/remove_detector.sh aws us-east-1

# 终止所有监控实例
./script/terminate_aws_detector.sh
```

## 故障排除

### 常见问题

1. **CDK部署失败**
   - 检查AWS权限是否充足
   - 确认区域设置正确
   - 重新运行 `cdk bootstrap`

2. **Lambda函数超时**
   - 检查VPC网络配置
   - 确认安全组规则正确
   - 查看CloudWatch日志

3. **数据库连接失败**
   - 检查RDS集群状态
   - 确认Secrets Manager中的凭据
   - 验证VPC内网络连通性

4. **监控节点无法上报数据**
   - 检查EC2实例状态
   - 确认安全组允许出站流量
   - 查看实例系统日志

### 日志查看
```bash
# 查看Lambda函数日志
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/CloudperfStack" --region us-east-1

# 查看特定函数日志
aws logs tail /aws/lambda/CloudperfStack-api --follow --region us-east-1
```

## 成本优化

### 资源配置建议
- **RDS**: Aurora Serverless V2，最小0.5 ACU，最大128 ACU
- **ElastiCache**: Serverless模式，按需扩展
- **Lambda**: ARM64架构，成本更低
- **EC2**: t4g.nano实例，ARM64架构

### 监控成本
- 使用AWS Cost Explorer监控费用
- 设置预算告警
- 定期清理不需要的监控节点

## 安全建议

1. **网络安全**
   - 使用私有子网部署数据库和缓存
   - 配置最小权限安全组规则
   - 启用VPC Flow Logs

2. **访问控制**
   - 定期更换管理员密码
   - 使用强密码策略
   - 限制根目录访问（需要query=login参数）

3. **数据保护**
   - 启用RDS加密
   - 使用S3服务端加密
   - 定期备份重要数据

## 扩展部署

### 多区域部署
如需在其他区域部署：
```bash
# 设置目标区域
export CDK_DEFAULT_REGION=eu-west-1

# 重新部署
cdk bootstrap
cdk deploy
```

### 高可用配置
- 在多个可用区部署监控节点
- 配置RDS多可用区
- 使用多个ALB目标

## 联系支持

如遇到部署问题，请：
1. 检查本文档的故障排除部分
2. 查看项目GitHub Issues
3. 提供详细的错误日志和环境信息

---

**部署完成后，您的CloudPerf系统将在AWS美东1区域正常运行，可以开始监控网络性能数据！**
