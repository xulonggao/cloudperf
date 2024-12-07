CREATE TABLE `country` (
    `code` varchar(2) NOT NULL PRIMARY KEY COMMENT '国家代码',
    `name` varchar(128) DEFAULT NULL COMMENT '国家名称',
    `continent_code` varchar(2) NOT NULL COMMENT '洲代码',
    `continent_name` varchar(128) DEFAULT NULL COMMENT '洲名',
    `update_time` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT '国家信息';

CREATE TABLE `asn` (
    `asn` INT UNSIGNED NOT NULL PRIMARY KEY COMMENT 'ASN号码',
    `country_code` varchar(2) NOT NULL COMMENT 'ASN所属国家',
    `type` varchar(16) DEFAULT NULL COMMENT 'ASN类型：hosting,education,isp,government,country',
    `ipcounts` INT UNSIGNED DEFAULT 0 COMMENT 'ASN IP总数量',
    `name` varchar(128) DEFAULT NULL COMMENT 'ASN名字',
    `domain` varchar(128) DEFAULT NULL COMMENT 'ASN域名',
    `update_time` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `country_code` (`country_code`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT 'ASN基本信息';

CREATE TABLE `city` (
    `id` INT UNSIGNED NOT NULL PRIMARY KEY COMMENT '唯一标识',
    `asn` INT UNSIGNED NOT NULL COMMENT 'ASN号码',
    `country_code` varchar(2) NOT NULL COMMENT '国家代码',
    `name` varchar(128) DEFAULT NULL COMMENT '城市名称',
    `friendly_name` varchar(128) DEFAULT NULL COMMENT '自定义名字',
    `region` varchar(128) DEFAULT NULL COMMENT '省',
    `latitude` double DEFAULT NULL COMMENT '经度',
    `longitude` double DEFAULT NULL COMMENT '纬度',
    `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY `citykey` (`asn`, `country_code`, `name`),
    KEY `asn` (`asn`),
    KEY `country_code` (`country_code`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '城市基本信息';

CREATE TABLE `iprange` (
    `start_ip` INT UNSIGNED NOT NULL COMMENT 'IP段开始',
    `end_ip` INT UNSIGNED NOT NULL COMMENT 'IP段结束',
    `city_id` INT UNSIGNED NOT NULL COMMENT '唯一标识',
    `update_time` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    `lastcheck_time` timestamp NOT NULL DEFAULT 0 COMMENT '最后更新时间',
    PRIMARY KEY (`start_ip`, `end_ip`),
    KEY `city_id` (`city_id`),
    KEY `lastcheck_time` (`lastcheck_time`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT 'ASN IP范围';

CREATE TABLE `pingable` (
    `ip` INT UNSIGNED NOT NULL PRIMARY KEY COMMENT 'ip',
    `city_id` INT UNSIGNED NOT NULL COMMENT '唯一标识',
    `lastresult` INT UNSIGNED NOT NULL COMMENT '最近结果',
    `update_time` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `city_id` (`city_id`),
    KEY `lastresult` (`lastresult`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT '可ping ip列表';

CREATE TABLE `statistics` (
    `id` INT UNSIGNED NOT NULL PRIMARY KEY COMMENT 'id',
    `src_city_id` INT UNSIGNED NOT NULL COMMENT '源侧',
    `dist_city_id` INT UNSIGNED NOT NULL COMMENT '目标侧',
    `country_code` varchar(2) NOT NULL COMMENT '源国家代码，该字段冗余，用于加速',
    `asn` INT UNSIGNED NOT NULL COMMENT 'ASN号码，该字段冗余，用于加速',
    `samples` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '样本数',
    `latency_min` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '最小延时us',
    `latency_max` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '最大延时us',
    `latency_avg` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '平均延时us',
    `latency_p50` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'p50延时us',
    `latency_p70` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'p70延时us',
    `latency_p90` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'p90延时us',
    `latency_p95` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'p95延时us',
    `update_time` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY `src_city_id` (`src_city_id`),
    KEY `dist_city_id` (`dist_city_id`),
    KEY `country_code` (`country_code`),
    KEY `asn` (`asn`),
    KEY `update_time` (`update_time`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT '统计数据';
