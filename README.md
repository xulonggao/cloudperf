# CloudPerf 是一个自动网络质量分析工具

CloudPerf是一个网络性能监控系统，提供跨多个地理位置的实时延迟测量和性能可视化。它使组织能够通过直观的web仪表板监控网络性能、分析链路延迟并优化路由决策。

该系统通过使用分布式节点的fping收集网络性能数据、基于AWS无服务器架构构建的集中式数据处理以及用于数据可视化和分析的web查询界面组成。

核心功能包括：

* IP/ASN 查询
* 提供基于 国家/城市/asn 延迟数据查询
* 自定义分组统计
* 用户权限管理

## 部署

### 环境准备
- Node.js >= 20.x
- [AWS CLI](https://docs.aws.amazon.com/zh_cn/cli/latest/userguide/getting-started-install.html) (并 [配置](https://docs.aws.amazon.com/zh_cn/cli/latest/userguide/cli-chap-configure.html) AWS 部署权限)
- AWS CDK CLI (`npm install -g aws-cdk`)
- Python 3.12 (非必须，运行本地脚本测试时使用)
- Docker (非必须，制作fping二进制程序和python依赖包时使用)

### 资源部署

代码准备：

```bash
git clone https://github.com/tansoft/cloudperf.git
cd cloudperf
cdk bootstrap
npm run build
cdk synth
```

最后部署可以有两种选择：

* 只使用alb http接口，直接部署

```bash
cdk deploy
```

* 如果想使用自定义域名和https，指定以下参数部署：

  ```domainName``` 指定最终上线的域名

  ```hostedZoneId``` 上级域名在Route53上的ZoneId，用于自动申请acm证书和开通域名解释（如：customer.com 的 ZoneId 为 Zxxxxx）

```bash
cdk deploy -c domainName=ping.customer.com -c hostedZoneId=Zxxxxx
```

> 如果遇到版本不兼容情况，尝试重新安装依赖：
> ```bash
> rm package-lock.json 
> npm install -g aws-cdk@latest
> npm install aws-cdk-lib@latest
> ```

### 系统设置

* 创建数据库

> 在cdk deploy时会创建数据库，使用CustomResource部署的，实质是使用参数 {"action": "exec_sql", "param": "init_db"} 调用 admin Lambda 完成。
>
> 数据表是通过BucketDeployment上传 src/data/import-sql/init.sql 到 cloudperfstack-data 桶执行创建的，sql和zip文件上传到桶中后会自动触发 admin Lambda 执行。

* 创建管理账号

可以使用命令行脚本调用 admin Lambda 完成管理员账号的创建，用户名已存在则重置密码。

```bash
# 参数为用户名，不指定为admin
./script/create_admin_user.sh myusername
# 执行完成可以看到 账号: 密码
# general password for myusername: xxxx
```

也可以在Lambda控制台上，找到adminLambda，创建测试事件 {"action":"create_user","param":"myusername"} 来创建管理员账号，密码在输出日志中显示

* 修改账号密码

通过上述账号密码登录系统后，点击右上方的 用户名，可以进行密码修改。

* 导入数据（如果有）

导入数据的方法是把sql文件或打包的zip文件放到 cloudperfstack-data 开头的 s3 的 import-sql 目录中，程序会自动导入。

由于导入 Lambda 函数有15分钟执行时间限制，因此如果导入数据太多，建议拆分sql文件再上传，参考以下代码：

```bash
# 由于 lambda 15分钟执行时间限制，大概可以处理14万行Insert，因此建议大的sql文件进行最多10万行的切割，注意sql文件中每一行为一条完整的语句，避免切割后sql断开
split -l 100000 range.sql range_split_
for file in range_split_*; do mv "${file}" "${file}.sql" && zip "${file}.zip" "${file}.sql" && rm "${file}.sql"; done
# 如果sql有前后关系，建议顺序放置拆分文件 range_split_*.zip 到s3执行
```

如果单条的SQL操作，可以直接在维护网页 /maintenance 中操作

或在 lambda 控制台调用 admin Lambda，以下是测试事件参考：
{"action": "exec_sqlfile", "param": "s3://my-bucket/sql/updates.zip"}
{"action": "exec_sql", "param": "insert into xxx"}
{"action": "exec_sql", "param": "select * from asn"}

也可以使用以下脚本执行：

```bash
./script/exec_sql.sh "select * from country limit 10"
# 返回结果如下：
# 列名: code | name | continent_code | continent_name | update_time
# AD | Andorra | EU | Europe | 2025-01-04 03:46:39
# AE | United Arab Emirates | AS | Asia | 2025-01-04 03:46:39
# AF | Afghanistan | AS | Asia | 2025-01-04 03:46:40
# AG | Antigua and Barbuda |  | North America | 2025-01-05 15:08:09
```

* 配置采集端

主要有两种不同的采集端：

1. 发现可ping ip，进行可ping ip维护，服务名字 fping-pingable：

```bash
# 部署可用ip探测的客户端，集中部署即可，部署多个节点可以加速刷新可用ip列表
./src/deploy_detector.sh aws ap-southeast-1 fping-pingable
```

2. 采集端进行延迟数据测试、取样并上报，服务名字 fping-job：

```bash
# 部署探测节点，在需要监测网络质量的地方部署，如在aws的32个区域上部署：
# 部署到单个地区
./src/deploy_detector.sh aws ap-southeast-1
# 部署到多个地区
./src/deploy_detector.sh aws "ap-southeast-1 us-east-1"
# 部署到所有region
./src/deploy_detector.sh aws all
# 部署到普通服务器
./src/deploy_detector.sh ssh ec2-user@1.2.3.4
```

部署客户端完成后，可以在网页 /status 页面上看到，由于aws region和城市名字不一样，状态页面看到的地区会和region不一样，可以自行进行修改。

## 附录

### 高级设置

在文件 src/layer/datalayer/python/settings.py 中，可以按实际业务情况选择进行测试：

```bash
# 常规缓存过期时间，如 SQL 语句的缓存
CACHE_BASE_TTL=3600
# 常规较长缓存过期时间
CACHE_LONG_TTL=86400
# 每个cityid只保存最新的n条记录，默认7次；增加该值，数据更丰富
MAX_RECORDS_PER_CITYID = 7
```

### 客户端维护

* 升级客户端二进制程序

```bash
# 升级所有region的fping-job
./script/update_detector.sh aws
# 升级 us-east-1 的 fping-pingable
./script/update_detector.sh aws us-east-1 fping-pingable
```

* 卸载客户端程序

```bash
# 卸载 us-east-1 的 fping-pingable
./remove_detector.sh aws us-east-1 fping-pingable
```

* 终止实例

```bash
# 卸载所有region中部署了的fping-job
./script/terminate_aws_detector.sh
# 卸载美东一的fping-pingable
./script/terminate_aws_detector.sh us-east-1 fping-pingable
```

### 源码编译

* 制作 lambda layer：

```bash
# 分别使用 x86_64 和 arm64 的Linux环境，并安装Docker，运行以下脚本，得到对应版本的python依赖库 pythonlib-layer-{ARCH}.zip
cd src/layer
./build-layer.sh
```

* 发布网页修改：

```bash
./script/build_web.sh
#生成新网页文件后，需要重新进行部署：
cdk deploy
```

* 制作 fping 二进制程序：

详细参考 fping 项目的 [build-package.sh](https://github.com/tansoft/fping/blob/develop/setup/build-package.sh)

### 源码解释

```
├── bin
│   └── cloudperf.ts                # CDK 入口和传参设置
├── lib
│   └── cloudperf-stack.ts          # 整个系统的 CDK 部署代码 (VPC, Lambda, RDS 等)
├── script                          # 管理维护常用脚本
│   ├── build_web.sh                # 发布网页修改
│   ├── create_admin_user.sh        # 创建管理员账号
│   ├── deploy_detector.sh          # 部署采集客户端
│   ├── exec_sql.sh                 # 执行数据库SQL
│   ├── local_test.sh               # 本地测试环境
│   ├── remove_detector.sh          # 卸载采集客户端
│   ├── terminate_aws_detector.sh   # 终止采集ec2实例
│   └── update_detector.sh          # 更新采集客户端
└── src                             # 源代码
    ├── admin
    │   └── lambda_function.py      # 管理使用的工具，无对外接口可以直接调用
    ├── api
    │   └── lambda_function.py      # 对外API接口
    ├── data/import-sql             # 建表数据
    │   ├── init.sql                # 创建 MySQL 基础表
    │   └── data.sql or zip         # 已有采集好的数据（如果有）
    ├── layer                       # lambda 函数层
    │   ├── datalayer/python        # 数据层，给多个lambda使用
    │   │   ├── data_layer.py       # 数据库操作函数
    │   │   └── settings.py         # 系统参数配置
    │   ├── build-layer.sh          # 创建pythonlib-layer
    │   └── pythonlib-layer-{ARCH}.zip  # python 类库层（python里的依赖库，如：PyMysql，redis，requests）
    └── web
       ├── lambda/app/public       # 网站静态发布页
       └── src                     # 网站代码
```

### web 前端构建

提示词参考 [docs/MakeProject.md](docs/MakeProject.md)

```txt
npm create vite@latest . -- --template react && npm install
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material react-router-dom recharts
npm install axios
npm install miragejs
```
