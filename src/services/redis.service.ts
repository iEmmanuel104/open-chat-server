// src/services/redis.service.ts
import { Redis } from 'ioredis';

export class RedisService {
    constructor(private redisClient: Redis) { }

    // General cache methods
    async get(key: string): Promise<string | null> {
        return await this.redisClient.get(key);
    }

    async set(key: string, value: string, ttl?: number): Promise<'OK'> {
        if (ttl) {
            return await this.redisClient.set(key, value, 'EX', ttl);
        }
        return await this.redisClient.set(key, value);
    }

    async del(key: string): Promise<number> {
        return await this.redisClient.del(key);
    }

    // Group-related methods
    async addUserToGroup(groupId: string, socketId: string, userAddress: string) {
        const key = `group:${groupId}:users`;
        return await this.redisClient.hset(key, socketId, userAddress);
    }

    async removeUserFromGroup(groupId: string, socketId: string) {
        const key = `group:${groupId}:users`;
        await this.redisClient.hdel(key, socketId);
        const remaining = await this.redisClient.hlen(key);
        if (remaining === 0) {
            await this.redisClient.del(key);
        }
    }

    async getGroupUsers(groupId: string) {
        const key = `group:${groupId}:users`;
        return await this.redisClient.hgetall(key);
    }

    // User connection methods
    async addUserConnection(socketId: string, userAddress: string) {
        return await this.redisClient.hset('user_connections', socketId, userAddress);
    }

    async removeUserConnection(socketId: string) {
        return await this.redisClient.hdel('user_connections', socketId);
    }

    async cleanup(socketId: string) {
        const groupKeys = await this.redisClient.keys('group:*:users');

        for (const key of groupKeys) {
            await this.redisClient.hdel(key, socketId);
            const remaining = await this.redisClient.hlen(key);
            if (remaining === 0) {
                await this.redisClient.del(key);
            }
        }

        await this.redisClient.hdel('user_connections', socketId);
    }

    // Cache invalidation helpers
    async invalidatePattern(pattern: string) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
            return await this.redisClient.del(...keys);
        }
        return 0;
    }

    async invalidateGroupCache(groupId: string) {
        return await this.invalidatePattern(`group:${groupId}:*`);
    }

    async invalidateUserCache(userId: string) {
        return await this.invalidatePattern(`user:${userId}:*`);
    }
}

