# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## 部署

* 底层资源部署

```
cdk bootstrap
npm run build
cdk synth
cdk deploy
```

* 创建数据表

```
```

* 如果遇到版本不兼容情况，参考：

```bash
rm package-lock.json 

npm install -g aws-cdk@latest
npm install aws-cdk-lib@latest
```

## 扩展使用

* 创建Lambda Layer

使用 src/layer/build-layer.sh 进行创建

## 源码解释

```
.
├── cloudperf-api               # 提供对外api接口
│   └── lambda_function.py
├── cloudperf-fping-queue       # 内部逻辑处理队列
├── data                        # 建表数据
│   ├── init.sql                    # 创建MySQL表
│   └── range.sql                   # 数据更新逻辑
├── datalayer                   
└── layer                       # lambda 函数层
    ├── datalayer               # 数据层，给多个lambda使用
    │   ├── data_layer.py
    │   └── settings.py
    ├── build-layer.sh          # 创建各个层并打包
    ├── fping-layer.zip         # fping 程序层
    └── pythonlib-layer.zip     # python 类库层
```