// src/middleware/auth.middleware.ts
import { CustomSocket } from '../types/socket';
import User from '../models/User';

export const authMiddleware = async (socket: CustomSocket, next: (err?: Error) => void) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication token required'));
        }

        const user = await User.findOne({ address: token });
        if (!user) {
            return next(new Error('Authentication failed'));
        }

        socket.data.user = user;
        next();
    } catch (error) {
        next(new Error('Authentication failed'));
    }
};