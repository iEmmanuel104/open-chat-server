// src/models/chat.ts
import { Schema, model, models } from "mongoose";

const ChatSchema = new Schema(
    {
        message: {
            type: String,
            required: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        groupId: {
            type: Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
        },
        // New fields for AI analysis
        aiScore: {
            type: Number,
            default: 0,
        },
        sentiment: {
            type: String,
            enum: ['positive', 'neutral', 'negative'],
            default: 'neutral'
        },
        topics: [{
            type: String
        }],
        contentQuality: {
            type: Number,
            default: 0
        },
        tokensMined: {
            type: Number,
            default: 0
        },
        isAiGenerated: {
            type: Boolean,
            default: false
        },
        engagementScore: {
            type: Number,
            default: 0
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        response: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

ChatSchema.index({ groupId: 1, createdAt: -1 });
ChatSchema.index({ aiScore: -1 });
ChatSchema.index({ contentQuality: -1 });

export default models.Chat || model("Chat", ChatSchema);