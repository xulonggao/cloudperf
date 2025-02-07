# CloudPerf 是一个自动的网络质量分析工具

核心功能：

* 根据asn数据进行ip段更新
* asn+city为粒度进行可ping ip发现
* 定期采集可ping ip之间质量
* 提供基于国家/城市/asn进行延迟数据查询

## 部署

* 底层资源部署

```
cdk bootstrap
npm run build
cdk synth
cdk deploy
```

* 如果遇到版本不兼容情况，参考：

```bash
rm package-lock.json 

npm install -g aws-cdk@latest
npm install aws-cdk-lib@latest
```

* 创建数据表

数据库的创建是通过cdk部署中的CustomResource部署的，使用 {"action": "exec_sql", "param": "init_db"} 调用 admin Lambda 完成。

数据表的创建是通过 默认上传到 cloudperfstack-data 桶的 init.sql 创建的

新更新的数据，本地数据处理，参考 data/import-tools.py 实现，处理输入的csv文件，输出sql

可以直接把sql文件（zip文件）上传到 cloudperfstack-data 开头的 s3 的 import-sql 目录中，程序会自动导入

平时数据库维护操作，也可以通过 admin Lambda运行，参考local_test.sh，如：
{"action": "exec_sqlfile", "param": "s3://my-bucket/sql/updates.zip"}
{"action": "exec_sql", "param": "insert into xxx"}
{"action": "exec_sql", "param": "select * from asn"}

```
aws lambda invoke --function-name ${ADMIN_LAMBDA} --payload '{"action":"exec_sql","param":"select * from user"}' --region us-east-1 --cli-binary-format raw-in-base64-out --log-type Tail --output text --query 'LogResult' /dev/stderr | base64 -d
```

* 创建管理员账号

```bash
ADMIN_LAMBDA=$(aws cloudformation describe-stacks --stack-name CloudperfStack --query 'Stacks[0].Outputs[?OutputKey==`adminLambda`].OutputValue' --output text --region us-east-1)
# --query '{StatusCode: StatusCode, Payload: Payload, LogResult: LogResult}'
aws lambda invoke --function-name ${ADMIN_LAMBDA} --payload '{"action":"create_user","param":"admin"}' --region us-east-1 --cli-binary-format raw-in-base64-out --log-type Tail --output text --query 'LogResult' /dev/stderr | base64 -d
# sample output is:
process action: create_user param: admin
general password for admin: xxxx
```

也可以在Lambda控制台上，找到adminLambda，创建测试事件 {"action":"create_user","param":"admin"} 来创建admin账号，密码在输出中显示

* 安装客户端

```bash
# 部署可用ip探测的客户端，集中部署即可，部署多个节点可以加速刷新可用ip列表
./src/deploy_detector.sh aws ap-southeast-1 fping-pingable
# 部署探测节点，在需要监测网络质量的地方部署，如在aws的32个区域上部署
./src/deploy_detector.sh aws us-east-1
```

部署客户端后，可以在网页 /status 页面上看到，由于aws region和城市名字不一样，状态页面看到的地区会和region不一样，可以自行进行修改。

## 扩展使用

* 创建Lambda Layer

部署中用到的一些资源，如fping layer，pythonlib layer 是提前通过脚本生成，使用 src/layer/build-layer.sh 进行创建

* 编译网站为静态文件

```bash
cd src/web && rm -rf lambda/app/public/* && npm run build -- --mode production && cd ../../
cdk deploy
```

* 编译调试客户端

```bash
dnf -y install glibc-static libstdc++-static git automake g++
cd /usr/local/src;git clone https://github.com/tansoft/fping;cd fping;
./autogen.sh;./configure --enable-centralmode='http://cloudperf.tansoft.org/job' --enable-debug
make
./src/fping
```

* 批量升级客户端

参考 src/update_detector.sh

## 源码解释

```
src
├── admin
│   └── lambda_function.py      # 管理使用的工具，无对外接口可以直接调用
├── api
│   └── lambda_function.py      # 对外API接口
├── cron
│   └── lambda_function.py      # 计划任务
├── data/import-sql             # 建表数据
│   ├── init.sql                # 创建MySQL表
│   └── range.sql or zip        # 数据更新逻辑
├── fping-queue
│   └── lambda_function.py      # 对外探测任务队列
├── layer                       # lambda 函数层
│   ├── datalayer/python        # 数据层，给多个lambda使用
│   │   ├── data_layer.py       # 数据库操作函数
│   │   └── settings.py         # 数据库配置
│   ├── build-layer.sh          # 创建各个层并打包，创建fping-layer和pythonlib-layer
│   ├── fping-layer.zip         # fping 程序层
│   └── pythonlib-layer.zip     # python 类库层
├── local_test.sh               # 本地调试和管理脚本
└── web
    ├── lambda/app/public       # 网站静态发布页
    └── src                     # 网站代码
```

## web 前端构建

提示词参考 src/web/MakeProject.md

```txt
npm create vite@latest . -- --template react && npm install
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material react-router-dom recharts
npm install axios
npm install miragejs
#图组件使用OpenStreetMap
```