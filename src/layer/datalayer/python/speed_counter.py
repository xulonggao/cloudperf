import redis
import time

# 这里想实现最近一个小时的速度统计，实现方法通过每分钟一个key，更新数值直接在key上增加，key在新建时设置了过期时间，下一周期自动失效
# 获取时直接读取60个分钟的总值，进行显示
class SpeedCounter:
    def __init__(self, redis_pool, cache_key:str):
        self.redis = redis.StrictRedis(connection_pool=redis_pool)
        self.key = "{" + cache_key + "}:"
        # 进行最近一小时统计，一分钟精度
        self.accuracy = 60 # 多少秒可并都一个计数单元，这里表示一分钟精度使用一个计数单元
        self.bucket = 60 # 分为多少个单元
        self.expire = self.accuracy * self.bucket # 每个单元过期时间
        # 如果想进行最近一分钟统计，一秒精度
        # accuracy = 1, bucket = 60, expire = 60

    def update_count(self, count:int):
        key = self.key + str(int(time.time() / self.accuracy) % self.bucket)
        try:
            # 以下逻辑可以避免每次incr都刷新ttl
            # 如果key不存在，直接设置并设置过期时间和本次增加值
            ret = self.redis.set(key, count, ex=self.expire, nx=True)
            if not ret:
                # 如果key已存在，进行count增加
                self.redis.incr(key, count)
        except Exception as e:
            print('update_count failed.', repr(e), key)

    def get_count(self):
        keys = [f"{self.key}{i:d}" for i in range(self.bucket)]
        try:
            # 以下逻辑可以避免每次incr都刷新ttl
            # 如果key不存在，直接设置并设置过期时间和本次增加值
            ret = self.redis.mget(keys)
            return sum(int(x) for x in ret if x is not None)
        except Exception as e:
            print('update_count failed.', repr(e), keys)
        return 0
