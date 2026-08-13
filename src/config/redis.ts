import { createClient } from 'redis';
import logger from '../config/logger.js';

const redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({
  url: redisUrl,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Connected to Redis');
  } catch (error) {
    logger.error('Error connecting to Redis:', error);
  }
};

export default redisClient;
