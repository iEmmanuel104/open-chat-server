// src/app.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { config } from './configs/config';
import { createRedisClient } from './configs/redis';
import { RedisService } from './services/redis.service';
import { GroupService } from './services/group.service';
import { ChatService } from './services/chat.service';
import { SocketController } from './controllers/socket.controller';
import { authMiddleware } from './middleware/auth.middleware';
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from './types/socket';
import { AiService } from './services/ai.service';
import { TokenMiningService } from './services/token-mining.service';
import { createUserRouter } from 'routes/user.routes';
import { UserService } from 'services/user.service';

export class App {
    private app: express.Application;
    private httpServer: ReturnType<typeof createServer>;
    private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
    private redisClient: ReturnType<typeof createRedisClient>;
    private socketController: SocketController;
    private services: {
        redisService: RedisService;
        aiService: AiService;
        tokenMiningService: TokenMiningService;
        groupService: GroupService;
        chatService: ChatService;
        userService: UserService;
    };

    constructor() {
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = new Server(this.httpServer, {
            cors: {
                origin: "*",
                methods: ["*"],
                credentials: true,
                allowedHeaders: ["*"]
            }
        });

        // Initialize Redis client
        this.redisClient = createRedisClient();

        // Initialize services in the correct order of dependencies
        this.services = this.initializeServices();

        // Initialize socket controller with all required services
        this.socketController = this.initializeSocketController();

        // Setup additional middleware or routes if needed
        this.setupMiddleware();
    }

    private initializeServices() {
        // Create Redis service
        const redisService = new RedisService(this.redisClient);

        // Create AI service with Redis dependency
        const aiService = new AiService(redisService);

        // Create Token Mining service with Redis dependency
        const tokenMiningService = new TokenMiningService(redisService);

        // Create Group service (assuming it doesn't need dependencies)
        const groupService = new GroupService();

        // Create Chat service with its dependencies
        const chatService = new ChatService(
            aiService,
            tokenMiningService,
            redisService
        );

        const userService = new UserService(redisService);

        return {
            redisService,
            aiService,
            tokenMiningService,
            groupService,
            chatService,
            userService,
        };
    }

    private initializeSocketController(): SocketController {
        return new SocketController(
            this.io,
            this.services.redisService,
            this.services.groupService,
            this.services.chatService,
            this.services.aiService,
            this.services.tokenMiningService
        );
    }

    private setupMiddleware() {
        // Add any additional middleware setup here
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use('/api/users', createUserRouter(this.services.userService));
    }

    private setupSocketIO() {
        this.io.use(authMiddleware);
        this.io.on('connection', (socket) => this.socketController.handleConnection(socket));
    }

    public async initialize() {
        try {
            // Connect to MongoDB
            await mongoose.connect(config.MONGODB_URI);
            console.log('Connected to MongoDB successfully');

            // Setup Socket.IO after database connection
            this.setupSocketIO();

            // Start the server
            this.httpServer.listen(config.PORT, () => {
                console.log(`Server running on port ${config.PORT}`);
            });
        } catch (error) {
            console.error('Failed to initialize server:', error);
            process.exit(1);
        }
    }

    public async cleanup() {
        try {
            // Cleanup all connections
            await Promise.all([
                this.redisClient.disconnect(),
                mongoose.connection.close()
            ]);
            console.log('Cleaned up connections');
            process.exit(0);
        } catch (error) {
            console.error('Error during cleanup:', error);
            process.exit(1);
        }
    }
}