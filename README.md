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

平时数据库维护操作，也可以通过 admin Lambda运行，如：
{"action": "exec_sqlfile", "param": "s3://my-bucket/sql/updates.zip"}
{"action": "exec_sql", "param": "insert into xxx"}
{"action": "exec_sql", "param": "select * from asn"}

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

cd src/web && npm install axios

cd src/web && npm install miragejs && npm run dev

仪表板现在可以通过以下命令运行：

开发环境：cd src/web && npm run dev
生产环境：cd src/web && npm run build
要切换到实际API，只需在生产环境中配置 VITE_API_URL 环境变量指向实际的API端点。

使用 npm run build 生成优化后的生产版本
构建后的文件位于 src/web/dist 目录
已配置代码分割和资源优化
部署选项（详见 src/web/DEPLOY.md）：

静态 Web 服务器部署（Apache/Nginx）
AWS S3 + CloudFront 云部署
Docker 容器化部署

在 src/web 的网页项目中，在页面右上方的banner条中增加三个下拉框，分别是国家，城市，运营商，可以进行字符串输入快速过滤选择，填充数据分别由三个后端接口返回，增加后端接口 /api/country /api/city /api/asn

在 src/web 的网页项目中，在页面主图的下方增加一个世界地图窗口，根据选择的城市，在图中绘画最多10条世界各地到该城市的延时情况，数据由后端接口/api/latency返回，地图组件使用OpenStreetMap
```