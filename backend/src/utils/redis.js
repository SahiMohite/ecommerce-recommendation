const redis = require('redis');

let redisClient = null;

const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    redisClient.on('connect', () => console.log('✅ Redis connected successfully'));

    await redisClient.connect();
  } catch (error) {
    console.error('❌ Redis connection error:', error);
  }
};

const getCache = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) return null;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

const setCache = async (key, value, ttl = 3600) => {
  try {
    if (!redisClient || !redisClient.isOpen) return;
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Redis set error:', error);
  }
};

const deleteCache = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) return;
    await redisClient.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
};

module.exports = { initRedis, getCache, setCache, deleteCache };