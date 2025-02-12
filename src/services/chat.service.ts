// src/services/chat.service.ts
import Chat from '../models/Chat';
import mongoose, { Types } from 'mongoose';
import { MessageType } from '../types/socket';
import Group from '../models/Group';
import User from '../models/User';
import { AiService } from './ai.service';
import { TokenMiningService } from './token-mining.service';
import { RedisService } from './redis.service';

// src/services/chat.service.ts
export class ChatService {
    private messageQueue: any[] = [];
    private processingQueue = false;
    private QUEUE_PROCESS_INTERVAL = 100; // Process queue every 100ms
    private BATCH_SIZE = 10;
    private MESSAGE_CACHE_TTL = 60;

    constructor(
        private aiService: AiService,
        private tokenMiningService: TokenMiningService,
        private redisService: RedisService
    ) {
        this.startQueueProcessor();
    }

    private startQueueProcessor() {
        setInterval(() => this.processMessageQueue(), this.QUEUE_PROCESS_INTERVAL);
    }

    private async processMessageQueue() {
        if (this.processingQueue || this.messageQueue.length === 0) return;
        this.processingQueue = true;

        try {
            const batch = this.messageQueue.splice(0, this.BATCH_SIZE);
            await Promise.all(batch.map(msg => this.processMessage(msg)));
        } finally {
            this.processingQueue = false;
        }
    }

    private async processMessage({ message, userId, groupId, callback }: any) {
        try {
            const analysis = await this.aiService.analyzeMessage(message);

            if (analysis.spamScore > 80) {
                callback(new Error('Message detected as spam'));
                return;
            }

            const [user, group] = await Promise.all([
                User.findById(userId),
                Group.findById(groupId)
            ]);

            if (!user || !group) {
                callback(new Error('User or group not found'));
                return;
            }

            const tokensEarned = await this.tokenMiningService.calculateTokenReward(
                analysis.contentQuality,
                0,
                user.stakingAmount,
                user.reputation
            );

            const chat = await Chat.create({
                message,
                sender: userId,
                groupId,
                aiScore: analysis.contentQuality,
                sentiment: analysis.sentiment,
                topics: analysis.topics,
                contentQuality: analysis.contentQuality,
                tokensMined: tokensEarned,
                response: analysis.response || '' 
            });

            await Promise.all([
                this.tokenMiningService.updateUserMetrics(userId, analysis.contentQuality, tokensEarned),
                this.updateGroupStats(groupId, userId, analysis.contentQuality),
                chat.populate('sender', 'address'),
                this.redisService.invalidateGroupCache(groupId)
            ]);

            callback(null, chat);
        } catch (error) {
            console.error('Error processing message:', error);
            callback(error);
        }
    }
    async createMessage(message: string, userId: string, groupId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.messageQueue.push({
                message,
                userId,
                groupId,
                callback: (error: Error | null, result: any) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            });
        });
    }

    async loadMessages(groupId: string, before?: string): Promise<MessageType[]> {
        const cacheKey = `messages:${groupId}:${before || 'latest'}`;
        const cachedMessages = await this.redisService.get(cacheKey);

        if (cachedMessages) {
            return JSON.parse(cachedMessages);
        }

        const query = {
            groupId,
            isDeleted: false,
            ...(before && { _id: { $lt: before } })
        };

        const messages = await Chat.find(query)
            .populate('sender', 'address')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const formattedMessages = messages.map(msg => ({
            _id: msg._id?.toString() || '',
            message: msg.message || '',
            sender: { address: msg.sender?.address || '' },
            createdAt: msg.createdAt || new Date(),
            groupId: msg.groupId?.toString() || '',
            aiScore: msg.aiScore || 0,
            sentiment: msg.sentiment || 'neutral',
            topics: msg.topics || [],
            contentQuality: msg.contentQuality || 0,
            tokensMined: msg.tokensMined || 0,
            isAiGenerated: msg.isAiGenerated || false,
            engagementScore: msg.engagementScore || 0,
            isDeleted: msg.isDeleted || false,
            response: msg.response || ''
        }));

        await this.redisService.set(
            cacheKey,
            JSON.stringify(formattedMessages),
            this.MESSAGE_CACHE_TTL
        );

        return formattedMessages;
    }

    private async updateGroupStats(groupId: string, userId: string, messageQuality: number) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const group = await Group.findById(groupId).session(session);
            if (!group) throw new Error('Group not found');

            group.totalMessages += 1;
            group.tokensDistributed += messageQuality;

            const contributorIndex = group.topContributors.findIndex(
                (                c: { user: { toString: () => string; }; }) => c.user.toString() === userId
            );

            if (contributorIndex >= 0) {
                group.topContributors[contributorIndex].score += messageQuality;
            } else {
                group.topContributors.push({ user: userId, score: messageQuality });
            }

            group.topContributors.sort((a: { score: number; }, b: { score: number; }) => b.score - a.score);
            group.topContributors = group.topContributors.slice(0, 10);

            await group.save({ session });
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

