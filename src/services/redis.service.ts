import redisClient from '../config/redis.js';
import type { SetOptions } from 'redis';
import { RedisError } from '../errors/errors.js';

export const cache = async (
  key: string,
  value: string,
  options?: SetOptions | undefined
): Promise<void> => {
  const result = await redisClient.set(key, value, options);
  if (!result) {
    throw new RedisError('Failed to cache to Redis');
  }
};

// TODO: implement a flexible custom error that states the cached value is expired or not found in redis
export const getCachedValue = async (key: string): Promise<string | null> => {
  const value = await redisClient.getDel(key);
  return value;
};
