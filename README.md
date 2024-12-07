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
    │   ├── data_layer.py       # 数据库操作函数
    │   └── settings.py         # 数据库配置
    ├── build-layer.sh          # 创建各个层并打包，创建fping-layer和pythonlib-layer
    ├── fping-layer.zip         # fping 程序层
    └── pythonlib-layer.zip     # python 类库层
```

## web 前端构建

```txt
cline:
请在src/web 目录下，生成一个静态网站，网站使用react框架mui.com上的material-ui制作，包括左边的导航栏，右边dashboard中，上方有4个主要的数值面板，下方是各种图表展示

cd src/web && npm create vite@latest . -- --template react && npm install

cd src/web && npm install @mui/material @emotion/react @emotion/styled @mui/icons-material react-router-dom recharts

使用 npm run build 生成优化后的生产版本
构建后的文件位于 src/web/dist 目录
已配置代码分割和资源优化
部署选项（详见 src/web/DEPLOY.md）：

静态 Web 服务器部署（Apache/Nginx）
AWS S3 + CloudFront 云部署
Docker 容器化部署
```