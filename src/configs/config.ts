// src/config/config.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    MONGODB_URI: process.env.MONGODB_URI || '',
    REDIS_URL: process.env.REDIS_CONNECTION_URL || 'redis://localhost:6379',
    PORT: process.env.PORT || 4000
};