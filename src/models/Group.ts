// src/models/group.ts
import { Schema, model, models } from "mongoose";

const GroupSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        members: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        isPrivate: {
            type: Boolean,
            default: false
        },
        // New fields for group stats
        totalMessages: {
            type: Number,
            default: 0
        },
        activeUsers: {
            type: Number,
            default: 0
        },
        tokensDistributed: {
            type: Number,
            default: 0
        },
        aiEnabled: {
            type: Boolean,
            default: true
        },
        engagementRate: {
            type: Number,
            default: 0
        },
        topContributors: [{
            user: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            score: Number
        }]
    },
    { timestamps: true }
);

GroupSchema.index({ name: 1 });
GroupSchema.index({ owner: 1 });
GroupSchema.index({ engagementRate: -1 });

export default models.Group || model("Group", GroupSchema);