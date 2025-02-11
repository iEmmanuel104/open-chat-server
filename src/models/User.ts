// src/models/user.ts
import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
    {
        address: {
            type: String,
            unique: true,
            required: true,
        },
        // Token mining related fields
        tokenBalance: {
            type: Number,
            default: 0,
        },
        stakingAmount: {
            type: Number,
            default: 0,
        },
        miningMultiplier: {
            type: Number,
            default: 1,
        },
        reputation: {
            type: Number,
            default: 0,
        },
        // Engagement metrics
        totalMessages: {
            type: Number,
            default: 0,
        },
        averageMessageQuality: {
            type: Number,
            default: 0,
        },
        activeGroups: [{
            type: Schema.Types.ObjectId,
            ref: 'Group'
        }],
        lastActive: {
            type: Date,
            default: Date.now
        },
        // Previous fields
        points: {
            type: Number,
            default: 0,
        }
    },
    { timestamps: true }
);

UserSchema.index({ tokenBalance: -1 });
UserSchema.index({ reputation: -1 });

export default models.User || model("User", UserSchema);