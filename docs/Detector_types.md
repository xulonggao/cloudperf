## 📋 CloudPerf探测器类型详解

CloudPerf系统有两种不同类型的探测器：

### 🔍 1. IP可达性探测器 (fping-pingable)
用途: 探测和维护可ping的IP地址列表
命令: ./deploy_detector.sh aws us-east-1 fping-pingable

工作原理:
• 使用fping-pingable作为User-Agent标识
• 从系统获取IP段范围任务
• 执行命令: fping -g [起始IP] [结束IP] -r 2 -a -q -X 100
• 扫描IP段，找出可ping通的IP地址（最多100个）
• 将可ping的IP地址上报给系统，更新pingable表
• **作用**: 为延迟探测器提供有效的目标IP列表

### ⏱️ 2. 延迟测量探测器 (fping-job)
用途: 测量网络延迟性能数据
命令: ./deploy_detector.sh aws us-east-1 (默认类型)

工作原理:
• 使用默认User-Agent（不包含fping-pingable）
• 从系统获取已知可ping的IP列表
• 执行命令: fping -a -q -C 11 [IP列表]
• 对每个IP进行11次ping测试，收集延迟数据
• 计算统计指标：最小值、最大值、平均值、P50、P70、P90、P95
• 将延迟数据上报给系统，更新statistics表

### 🔄 工作流程关系

1. IP可达性探测器 → 扫描IP段 → 发现可ping的IP → 存储到pingable表
                                                    ↓
2. 延迟测量探测器 ← 获取可ping的IP列表 ← 从pingable表读取 ← 
   ↓
   测量延迟 → 上报统计数据 → 存储到statistics表 → 前端展示


### 📊 部署建议

推荐部署策略:

1. 先部署IP可达性探测器 (数量可以多一些，处理速度更快):
bash
export PATH="/usr/local/bin:$PATH"
# 在多个区域部署IP探测器
./script/deploy_detector.sh aws "us-east-1 us-west-2 eu-central-1 ap-southeast-1" fping-pingable


2. 再部署延迟测量探测器 (每个区域1-2个即可):
bash
# 在各个区域部署延迟探测器
./script/deploy_detector.sh aws "us-east-1 us-west-2 eu-central-1 ap-southeast-1"


### 🎯 关键区别总结

| 特性 | IP可达性探测器 | 延迟测量探测器 |
|------|----------------|----------------|
| 参数 | fping-pingable | 默认(无参数) |
| 任务类型 | ping jobs | data jobs |
| 执行命令 | fping -g (扫描IP段) | fping -C 11 (测量延迟) |
| 数据输出 | 可ping的IP列表 | 延迟统计数据 |
| 存储表 | pingable | statistics |
| 部署数量 | 多个(提高扫描速度) | 少量(每区域1-2个) |
| 工作频率 | 较低频率 | 持续高频 |


# ping阶段和data阶段的任务结构和内容：

## Ping阶段和Data阶段任务详解

### Ping阶段任务（IP发现阶段）

#### 任务结构
每个ping任务包含：
json
{
    "jobid": "ping12345",
    "command": "fping -g 192.168.1.1 192.168.1.254 -r 2 -a -q -X 100"
}


#### 任务内容详解
• **jobid**: ping + city_id，例如 ping12345
• **command**: fping命令，参数含义：
  • -g 192.168.1.1 192.168.1.254: 扫描IP范围（从start_ip到end_ip）
  • -r 2: 重试2次
  • -a: 只显示可达的IP
  • -q: 安静模式，不显示每个ping的详细信息
  • -X 100: 最多找到100个可达IP就停止

#### 任务来源
• 从Redis队列 CACHEKEY_PINGABLE 中获取
• 队列中的数据来自数据库表 iprange，选择超过14天未检查的IP段
• 每次最多分发20个任务给探测器

#### 任务示例
json
{
    "jobid": "ping15678",
    "command": "fping -g 203.208.60.1 203.208.60.255 -r 2 -a -q -X 100"
}

这个任务要求探测器扫描Google DNS服务器所在的IP段，寻找可达的IP地址。

#### 结果提交
探测器完成后提交：
json
{
    "jobid": "ping15678",
    "status": 0,
    "stdout": "203.208.60.1\n203.208.60.2\n203.208.60.3\n...",
    "stderr": ""
}

系统从stdout中提取可达IP列表，更新到 pingable 表。

### Data阶段任务（延迟测量阶段）

#### 任务结构
每个data任务包含：
json
{
    "jobid": "data98765",
    "command": "fping -a -q -C 11 8.8.8.8 8.8.4.4 1.1.1.1 1.0.0.1"
}


#### 任务内容详解
• **jobid**: data + target_city_id，例如 data98765
• **command**: fping命令，参数含义：
  • -a: 只显示可达的IP
  • -q: 安静模式
  • -C 11: 对每个IP进行11次连续ping测量
  • 后面跟着具体的IP地址列表（最多100个）

#### 任务来源
• 通过 get_pingjob_by_cityid(src_city_id) 函数获取
• 从 pingable 表中选择有可达IP的目标城市
• 每个目标城市随机选择最多100个可达IP
• 使用Redis缓存机制，避免重复查询数据库

#### 任务分配逻辑
1. 探测器根据自己的city_id请求任务
2. 系统为该探测器分配其他城市的IP进行测量
3. 实现全网格化的延迟测量（每个城市测量到其他所有城市的延迟）

#### 任务示例
json
{
    "jobid": "data23456",
    "command": "fping -a -q -C 11 74.125.224.72 74.125.224.73 74.125.224.74 172.217.164.110"
}

这个任务要求探测器对Google服务器的4个IP地址各进行11次ping测量。

#### 结果提交
探测器完成后提交：
json
{
    "jobid": "data23456",
    "status": 0,
    "stdout": "[DEBUG] CPU time used: 0.083289 sec",
    "stderr": "74.125.224.72 : 45.2 46.1 45.8 45.5 46.0 45.7 45.9 46.2 45.6 45.8 46.0\n74.125.224.73 : 47.1 47.3 46.9 47.2 47.0 46.8 47.1 47.4 46.7 47.0 47.2\n..."
}


系统从stderr中解析延迟数据：
• 每行包含一个IP的11次ping结果
• 提取所有数值，计算统计指标（min, max, avg, p50, p70, p90, p95）
• 存储到 statistics 表

### 工作流程对比

| 阶段 | Ping阶段 | Data阶段 |
|------|----------|----------|
| 目的 | 发现可达IP | 测量网络延迟 |
| 输入 | IP段范围 | 具体IP列表 |
| 输出 | 可达IP列表 | 延迟统计数据 |
| 频率 | 14天一次 | 持续进行 |
| 任务大小 | 一个IP段(可能数百个IP) | 最多100个IP |
| 测量次数 | 每IP最多3次 | 每IP 11次 |
| 数据量 | 少量(发现的IP数) | 大量(所有测量样本) |

### 实际运行示例

某个fping-pingable探测器的工作循环：
1. 请求任务 → 获得20个ping任务
2. 执行扫描 → 发现1000个可达IP
3. 提交结果 → r计数+20，w计数+1000

某个fping-job探测器的工作循环：
1. 请求任务 → 获得10个data任务
2. 执行测量 → 对1000个IP各ping 11次，产生11000个样本
3. 提交结果 → r计数+10，w计数+11000