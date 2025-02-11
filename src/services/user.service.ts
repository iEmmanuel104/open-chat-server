// src/services/user.service.ts
import User from '../models/User';
import { RedisService } from './redis.service';

export class UserService {
    private readonly CACHE_KEY_PREFIX = 'user:';
    private readonly CACHE_TTL = 3600; // 1 hour

    constructor(private redisService: RedisService) { }

    async initializeUser(address: string) {
        const cacheKey = `${this.CACHE_KEY_PREFIX}${address.toLowerCase()}`;

        try {
            // Check cache first
            const cachedUser = await this.redisService.get(cacheKey);
            if (cachedUser) {
                return JSON.parse(cachedUser);
            }

            // Find or create user
            let user = await User.findOne({ address: address.toLowerCase() });

            if (!user) {
                user = await User.create({
                    address: address.toLowerCase(),
                    tokenBalance: 0,
                    stakingAmount: 0,
                    miningMultiplier: 1,
                    reputation: 0,
                    totalMessages: 0,
                    averageMessageQuality: 0,
                    points: 0
                });
            } else {
                // Update last active
                user.lastActive = new Date();
                await user.save();
            }

            // Cache the user data
            await this.redisService.set(
                cacheKey,
                JSON.stringify(user),
                this.CACHE_TTL
            );

            return user;
        } catch (error) {
            console.error('Error in user initialization:', error);
            throw error;
        }
    }

    async getUserByAddress(address: string) {
        const cacheKey = `${this.CACHE_KEY_PREFIX}${address.toLowerCase()}`;

        try {
            const cachedUser = await this.redisService.get(cacheKey);
            if (cachedUser) {
                return JSON.parse(cachedUser);
            }

            const user = await User.findOne({ address: address.toLowerCase() });
            if (user) {
                await this.redisService.set(
                    cacheKey,
                    JSON.stringify(user),
                    this.CACHE_TTL
                );
            }

            return user;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    }

    async updateUser(address: string, updateData: Partial<typeof User>) {
        try {
            const user = await User.findOneAndUpdate(
                { address: address.toLowerCase() },
                { ...updateData, lastActive: new Date() },
                { new: true }
            );

            if (user) {
                // Invalidate cache
                await this.redisService.del(`${this.CACHE_KEY_PREFIX}${address.toLowerCase()}`);
            }

            return user;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
}