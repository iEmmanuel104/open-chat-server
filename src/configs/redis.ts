// src/config/redis.ts
import Redis from 'ioredis';
import { config } from './config';

export const createRedisClient = () => {
    const redisClient = new Redis(config.REDIS_URL, {
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        reconnectOnError: (err) => {
            const targetError = 'READONLY';
            return err.message.includes(targetError);
        }
    });

    redisClient.on('connect', () => {
        console.log('Connected to Redis successfully');
    });

    redisClient.on('error', (error) => {
        console.error('Redis Client Error:', error);
    });

    redisClient.on('ready', () => {
        console.log('Redis client is ready');
    });

    return redisClient;
};
