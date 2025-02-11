// src/types/socket.ts
import { Socket } from 'socket.io';
import mongoose from 'mongoose';

export interface MessageType {
    _id: string;
    message: string;
    sender: { address: string };
    createdAt: Date | string;
    groupId: string;
}

export interface ServerToClientEvents {
    message: (message: MessageType) => void;
    connectionEstablished: (data: { connectionId: string }) => void;
    error: (error: string) => void;
}

export interface ClientToServerEvents {
    joinGroup: (groupId: string) => void;
    leaveGroup: (groupId: string) => void;
    sendMessage: (data: { groupId: string; message: string }) => void;
    getGroups: (callback: (groups: any[]) => void) => void;
    createGroup: (data: { name: string; description?: string }, callback: (group: any) => void) => void;
    loadMessages: (data: { groupId: string; before?: string }, callback: (messages: MessageType[]) => void) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    user: {
        _id: mongoose.Types.ObjectId;
        address: string;
    };
}

export type CustomSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
