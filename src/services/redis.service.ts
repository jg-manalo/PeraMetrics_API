import redisClient from '../config/redis.js';
import type { SetOptions } from 'redis';
import { RedisError } from '../errors/errors.js';
import logger from '../config/logger.js';

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

export const revokeCache = async (key: string): Promise<void> => {
  const result = await redisClient.del(key);

  if (result === 0) {
    logger.error(`Failed to revoke cache for key: ${key}`);
    throw new RedisError('Failed to revoke cache');
  }
};

export const lookupCache = async (key: string): Promise<string | null> => {
  const value = await redisClient.get(key);
  return value;
};

export const getCachedValue = async (key: string): Promise<string | null> => {
  const value = await redisClient.getDel(key);

  if (!value) {
    logger.error(`Cached value for key: ${key} is expired or not found`);
    throw new RedisError('Cached value is expired or not found');
  }

  return value;
};
