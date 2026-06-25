import { createClient } from 'redis';
import { logger } from './logger.js';

export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error', { error: err.message }));

export const connectRedis = async () => {
    try {
        await redisClient.connect();
        logger.info('Connected to Redis');
    } catch (error) {
        logger.error('Could not connect to Redis', { error: error.message });
    }
};
