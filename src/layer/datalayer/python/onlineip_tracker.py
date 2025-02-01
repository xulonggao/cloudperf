import redis
import time

class OnlineIPTracker:
    def __init__(self, redis_pool, cache_key:str):
        self.redis = redis.StrictRedis(connection_pool=redis_pool)
        self.key = cache_key
        self.expire_seconds = 86400 # 300  # 5分钟

    def update_ip(self, ip):
        """更新IP的最后访问时间"""
        current_time = time.time()
        self.redis.zadd(self.key, {ip: current_time})

    def batch_update_ips(self, ips):
        """批量更新IP"""
        current_time = time.time()
        mapping = {ip: current_time for ip in ips}
        self.redis.zadd(self.key, mapping)

    def cleanup_expired(self):
        """清理超过2分钟未更新的IP"""
        cutoff_time = time.time() - self.expire_seconds
        self.redis.zremrangebyscore(self.key, 0, cutoff_time)

    def get_online_ips(self):
        """获取所有在线IP，按最后更新时间排序"""
        self.cleanup_expired()
        return self.redis.zrange(self.key, 0, -1, withscores=True)

    def get_online_ips_count(self):
        """获取在线IP数量"""
        self.cleanup_expired()
        return self.redis.zcard(self.key)

    def get_recent_ips(self, limit=10):
        """获取最近更新的IP"""
        return self.redis.zrevrange(self.key, 0, limit-1, withscores=True)

    def get_metrics(self):
        return {
            'total_ips': self.redis.zcard(self.key),
            'oldest_timestamp': self.redis.zrange(self.key, 0, 0, withscores=True),
            'newest_timestamp': self.redis.zrange(self.key, -1, -1, withscores=True)
        }