## CloudPerf /status 页面指标详解

### 基础数据统计

1. Total Countries (247)
• **含义**：系统中包含的国家总数
• **统计逻辑**：SELECT COUNT(1) FROM country
• **数据来源**：country表，包含全球各国的基本信息

2. Total Cities (29257)
• **含义**：系统中不重复的城市总数
• **统计逻辑**：SELECT COUNT(1) FROM (SELECT country_code,name FROM city GROUP BY country_code,name) AS a
• **数据来源**：city表，按国家代码和城市名称去重统计

3. Total ASNs (70632)
• **含义**：系统中包含的自治系统号码(ASN)总数
• **统计逻辑**：SELECT COUNT(1) FROM asn
• **数据来源**：asn表，包含全球各ISP和组织的ASN信息

4. Total Cityids (179166)
• **含义**：系统中城市ID的总数（包含ASN+城市的组合）
• **统计逻辑**：SELECT COUNT(1) FROM city
• **数据来源**：city表，每个ASN在每个城市的组合都有唯一的city_id

### 网络探测相关指标

5. Pingable CityIds (7034)
• **含义**：有可达IP地址的城市ID数量
• **统计逻辑**：SELECT COUNT(DISTINCT city_id) FROM pingable WHERE lastresult > '0'
• **数据来源**：pingable表，统计有活跃可ping IP的城市数量
• **业务意义**：表示系统能够进行网络测量的有效城市节点数

6. Valid CityId Pairs (23798)
• **含义**：有延迟测量数据的城市对数量
• **统计逻辑**：SELECT COUNT(DISTINCT src_city_id, dist_city_id) FROM statistics
• **数据来源**：statistics表，统计有测量数据的源-目标城市对
• **业务意义**：表示系统已建立的网络连通性测量路径数

### Ping状态统计

7. Stable Pings (0)
• **含义**：稳定可达的IP数量
• **统计逻辑**：SELECT COUNT(1) FROM pingable WHERE lastresult >= '15'
• **判断标准**：lastresult >= 15 (二进制1111，表示最近4次ping都成功)
• **业务意义**：网络连接非常稳定的IP地址数量

8. New Discovery Pings (896855)
• **含义**：新发现的可ping IP数量
• **统计逻辑**：SELECT COUNT(1) FROM pingable WHERE lastresult >= '8'
• **判断标准**：lastresult >= 8 (二进制1000，表示至少有一次ping成功)
• **业务意义**：系统发现的所有可达IP总数

9. Lost Pings (0)
• **含义**：丢失连接的IP数量
• **统计逻辑**：SELECT COUNT(1) FROM pingable WHERE lastresult <= '7'
• **判断标准**：lastresult <= 7 (表示最近一次ping失败)
• **业务意义**：网络连接不稳定或已断开的IP数量

### CIDR管理统计

10. Ready Cidr (24094)
• **含义**：最近检查过的IP段数量（14天内）
• **统计逻辑**：SELECT COUNT(1) FROM iprange WHERE lastcheck_time >= DATE_SUB(NOW(), INTERVAL 14 DAY)
• **数据来源**：iprange表的lastcheck_time字段
• **业务意义**：保持活跃扫描状态的IP段数量

11. Outdated Cidr (757242)
• **含义**：过期未检查的IP段数量（超过14天）
• **统计逻辑**：SELECT COUNT(1) FROM iprange WHERE lastcheck_time < DATE_SUB(NOW(), INTERVAL 14 DAY)
• **业务意义**：需要重新扫描的IP段数量

12. Cidr Queue (97)
• **含义**：待处理的IP段扫描任务队列长度
• **统计逻辑**：Redis列表长度 LLEN ping
• **数据来源**：Redis缓存中的任务队列
• **业务意义**：当前排队等待扫描的IP段任务数

## 系统工作流程

根据源代码分析，CloudPerf系统的工作流程如下：

1. 数据初始化：从IP地理位置数据库导入国家、城市、ASN、IP段信息
2. IP发现阶段：fping-pingable探测器扫描IP段，发现可达IP并存入pingable表
3. 延迟测量阶段：fping-job探测器对可达IP进行延迟测量，结果存入statistics表
4. 状态维护：系统持续更新IP的可达性状态(lastresult字段使用位运算记录最近几次ping结果)

## 关键设计特点

• **位运算状态记录**：使用lastresult字段的位来记录最近几次ping的成功/失败状态
• **分层探测**：先发现可达IP，再进行延迟测量，避免无效测量
• **时间窗口管理**：使用14天窗口判断IP段是否需要重新扫描
• **Redis队列**：使用Redis管理任务分发和状态跟踪

这个设计能够有效地管理全球网络性能监控，通过分布式探测器收集大规模网络延迟数据。

## "Ping Clients" 和 "Data Clients" 的 r/w 指标含义

### r/w 数值的具体含义

r (Read) 和 w (Write) 分别表示：
• **r (Read)**：系统**分发给**探测器客户端的任务数量
• **w (Write)**：探测器客户端**提交回**系统的结果数量

### 统计逻辑和实现

#### 1. Ping Clients (4) Last hour r/w 1040/52824

r = 1040 (speed-ping-get)：
• **含义**：最近1小时内分发给fping-pingable探测器的IP段扫描任务数量
• **触发时机**：当fping-pingable探测器请求任务时
• **代码位置**：
python
# 在 lambda_function.py 第507行
data_layer.update_speed_status('ping', len(ret["job"]), True)  # isread=True

• **统计内容**：每次分发给探测器的IP段任务数量

w = 52824 (speed-ping-set)：
• **含义**：最近1小时内fping-pingable探测器提交的可达IP地址数量
• **触发时机**：当探测器完成IP段扫描并提交结果时
• **代码位置**：
python
# 在 lambda_function.py 第439行
data_layer.update_speed_status(jobtype, len(ips), False)  # isread=False

• **统计内容**：探测器发现并提交的可ping通的IP地址总数

#### 2. Data Clients (4) Last hour r/w 3610/2083784

r = 3610 (speed-data-get)：
• **含义**：最近1小时内分发给fping-job探测器的延迟测量任务数量
• **触发时机**：当fping-job探测器请求任务时
• **代码位置**：
python
# 在 lambda_function.py 第530行
data_layer.update_speed_status('data', len(ret["job"]), True)  # isread=True

• **统计内容**：每次分发给探测器的延迟测量任务数量

w = 2083784 (speed-data-set)：
• **含义**：最近1小时内fping-job探测器提交的延迟测量样本数量
• **触发时机**：当探测器完成延迟测量并提交结果时
• **代码位置**：
python
# 在 lambda_function.py 第479行
data_layer.update_speed_status(jobtype, len(samples), False)  # isread=False

• **统计内容**：探测器测量并提交的ping样本总数（每个任务通常包含多个IP的多次ping测量）

### 技术实现细节

#### SpeedCounter 实现机制
python
class SpeedCounter:
    def __init__(self, redis_pool, cache_key:str):
        self.accuracy = 60  # 60秒精度
        self.bucket = 60    # 60个时间桶
        self.expire = 3600  # 1小时过期


• **时间窗口**：使用60个1分钟的时间桶，覆盖最近1小时
• **存储方式**：Redis中每分钟一个key，自动过期
• **统计方法**：读取60个桶的数值总和

#### 数据流向分析

Ping Clients 工作流程：
1. fping-pingable探测器请求任务 → r计数器增加（任务数）
2. 探测器扫描IP段，发现可达IP → w计数器增加（IP数）
3. 比例关系：一个任务可能发现多个可达IP，所以w通常远大于r

Data Clients 工作流程：
1. fping-job探测器请求任务 → r计数器增加（任务数）
2. 探测器对多个IP进行多次ping测量 → w计数器增加（样本数）
3. 比例关系：一个任务包含多个IP的多次测量，所以w远大于r

### 业务意义

• **r/w比例**反映了系统的工作效率：
  • **Ping阶段**：1040个任务发现了52824个可达IP，平均每个任务发现约51个可达IP
  • **Data阶段**：3610个任务产生了2083784个测量样本，平均每个任务产生约577个样本

• **数量级差异**说明了两阶段探测的特点：
  • IP发现阶段：任务少但每个任务覆盖大量IP
  • 延迟测量阶段：任务相对较多，但每个任务产生大量测量数据

这种设计体现了CloudPerf系统的分层探测策略：先高效发现可达IP，再对这些IP进行精确的延迟测量。