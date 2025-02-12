// src/controllers/socket.controller.ts
import { Server } from 'socket.io';
import { CustomSocket, ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../types/socket';
import { RedisService } from '../services/redis.service';
import { GroupService } from '../services/group.service';
import { ChatService } from '../services/chat.service';
import { AiService } from 'services/ai.service';
import { TokenMiningService } from 'services/token-mining.service';

export class SocketController {
    private readonly messageRateLimit = new Map<string, number>();
    private readonly RATE_LIMIT_WINDOW = 1000; // 1 second
    private readonly MAX_MESSAGES_PER_WINDOW = 5;

    constructor(
        private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
        private redisService: RedisService,
        private groupService: GroupService,
        private chatService: ChatService,
        private aiService: AiService,
        private tokenMiningService: TokenMiningService
    ) { }

    async handleConnection(socket: CustomSocket) {
        const user = socket.data.user;
        await this.redisService.addUserConnection(socket.id, user.address);

        socket.emit('connectionEstablished', {
            connectionId: socket.id
        });

        console.log(`User ${user.address} connected`);

        this.setupEventHandlers(socket);
    }

    private isRateLimited(userId: string): boolean {
        const now = Date.now();
        const userMessages = this.messageRateLimit.get(userId) || 0;

        if (userMessages >= this.MAX_MESSAGES_PER_WINDOW) {
            return true;
        }

        this.messageRateLimit.set(userId, userMessages + 1);
        setTimeout(() => {
            this.messageRateLimit.set(userId, (this.messageRateLimit.get(userId) || 1) - 1);
        }, this.RATE_LIMIT_WINDOW);

        return false;
    }

    private setupEventHandlers(socket: CustomSocket) {
        const user = socket.data.user;

        socket.on('getGroups', async (callback) => {
            try {
                const groups = await this.groupService.getAllGroups(user._id);
                callback(groups);
            } catch (error) {
                console.error('Error fetching groups:', error);
                callback([]);
            }
        });
        
        socket.on('createGroup', async (data, callback) => {
            try {
                const group = await this.groupService.createGroup(data.name, data.description, user._id);
                callback(group);
            } catch (error) {
                console.error('Error creating group:', error);
                callback(null);
            }
        });

        socket.on('joinGroup', async (groupId) => {
            try {
                await this.redisService.addUserToGroup(groupId, socket.id, user.address);
                await this.groupService.addMemberToGroup(groupId, user._id);
                await socket.join(groupId);
                console.log(`User ${user.address} joined group ${groupId}`);
            } catch (error) {
                console.error('Error joining group:', error);
                socket.emit('error', 'Failed to join group');
            }
        });

        socket.on('leaveGroup', async (groupId) => {
            try {
                await this.redisService.removeUserFromGroup(groupId, socket.id);
                await socket.leave(groupId);
            } catch (error) {
                console.error('Error leaving group:', error);
                socket.emit('error', 'Failed to leave group');
            }
        });

        socket.on('sendMessage', async (data) => {
            if (this.isRateLimited(user._id.toString())) {
                socket.emit('error', 'Rate limit exceeded. Please wait before sending more messages.');
                return;
            }

            try {
                const chat = await this.chatService.createMessage(
                    data.message,
                    user._id.toString(),
                    data.groupId
                );

                this.io.to(data.groupId).emit('message', {
                    ...chat.toObject(),
                    tokensMined: chat.tokensMined,
                    contentQuality: chat.contentQuality
                });
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', 'Failed to send message');
            }
        });

        socket.on('searchGroups', async (query: string, callback) => {
            try {
                const groups = await this.groupService.searchGroups(query);
                callback(groups);
            } catch (error) {
                console.error('Error searching groups:', error);
                callback([]);
            }
        });

        socket.on('getGroupDetails', async (groupId: string, callback) => {
            try {
                const group = await this.groupService.getGroupDetails(groupId);
                callback(group);
            } catch (error) {
                console.error('Error fetching group details:', error);
                callback(null);
            }
        });

        socket.on('getGroupMembers', async (groupId: string, callback) => {
            try {
                const members = await this.groupService.getGroupMembers(groupId);
                callback(members);
            } catch (error) {
                console.error('Error fetching group members:', error);
                callback([]);
            }
        });

        socket.on('loadMessages', async (data, callback) => {
            try {
                const messages = await this.chatService.loadMessages(data.groupId, data.before);
                callback(messages);
            } catch (error) {
                console.error('Error loading messages:', error);
                callback([]);
            }
        });

        socket.on('disconnect', async () => {
            await this.redisService.cleanup(socket.id);
        });
    }
}
