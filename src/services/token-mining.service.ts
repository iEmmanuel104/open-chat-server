import mongoose from "mongoose";
import User from "../models/User";
import { RedisService } from "./redis.service";

// src/services/token-mining.service.ts
export class TokenMiningService {
    private readonly CACHE_KEY_PREFIX = 'token_mining:';
    private BASE_REWARD = 1;
    private MAX_QUALITY_MULTIPLIER = 3;
    private MAX_ENGAGEMENT_MULTIPLIER = 2;
    private STAKE_MULTIPLIER_FACTOR = 0.1;

    constructor(private redisService: RedisService) { }

    async calculateTokenReward(
        messageQuality: number,
        engagementScore: number,
        userStake: number,
        reputationScore: number
    ) {
        const cacheKey = `${this.CACHE_KEY_PREFIX}${messageQuality}:${engagementScore}:${userStake}:${reputationScore}`;
        const cachedReward = await this.redisService.get(cacheKey);

        if (cachedReward) {
            return parseFloat(cachedReward);
        }

        const qualityMultiplier = 1 + (this.MAX_QUALITY_MULTIPLIER - 1) * (messageQuality / 100);
        const engagementMultiplier = 1 + (this.MAX_ENGAGEMENT_MULTIPLIER - 1) * (engagementScore / 100);
        const stakeMultiplier = 1 + (userStake * this.STAKE_MULTIPLIER_FACTOR);
        const reputationMultiplier = 0.5 + (reputationScore / 100);

        const reward = Math.round(
            this.BASE_REWARD *
            qualityMultiplier *
            engagementMultiplier *
            stakeMultiplier *
            reputationMultiplier *
            100
        ) / 100;

        // Cache the result for 1 hour
        await this.redisService.set(cacheKey, reward.toString(), 3600);

        return reward;
    }

    async updateUserMetrics(userId: string, messageQuality: number, tokensEarned: number) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const user = await User.findById(userId).session(session);
            if (!user) throw new Error('User not found');

            user.tokenBalance += tokensEarned;
            user.totalMessages += 1;
            user.averageMessageQuality =
                ((user.averageMessageQuality * (user.totalMessages - 1)) + messageQuality) / user.totalMessages;
            user.reputation = Math.min(100, user.reputation + (tokensEarned / 10));
            user.lastActive = new Date();

            await user.save({ session });
            await session.commitTransaction();

            // Invalidate user cache
            await this.redisService.del(`user:${userId}`);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}