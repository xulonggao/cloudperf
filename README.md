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

```
```

## 扩展使用

* 创建Lambda Layer

部署中用到的一些资源，是提前通过脚本生成，使用 src/layer/build-layer.sh 进行创建

## 源码解释

```
.
├── admin
│   ├── init.sql                # 创建MySQL表
│   └── lambda_function.py
├── api
│   └── lambda_function.py
├── data                        # 建表数据
│   └── range.sql               # 数据更新逻辑
├── fping-queue
│   └── lambda_function.py
└── layer                       # lambda 函数层
    ├── datalayer               # 数据层，给多个lambda使用
    │   ├── data_layer.py
    │   └── settings.py
    ├── build-layer.sh          # 创建各个层并打包
    ├── fping-layer.zip         # fping 程序层
    └── pythonlib-layer.zip     # python 类库层
```
