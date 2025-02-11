// src/services/group.service.ts
import Group from '../models/Group';
import { Types } from 'mongoose';

export class GroupService {
    async getAllGroups(userId: Types.ObjectId) {
        const allGroups = await Group.find({ isPrivate: false })
            .populate('owner', 'address')
            .populate('members', 'address')
            .sort({ createdAt: -1 });

        const userGroups = allGroups.filter(group =>
            group.members.some((member: { _id: { toString: () => string; }; }) => member._id.toString() === userId.toString())
        );
        const otherGroups = allGroups.filter(group =>
            !group.members.some((member: { _id: { toString: () => string; }; }) => member._id.toString() === userId.toString())
        );

        return [...userGroups, ...otherGroups];
    }

    async createGroup(name: string, description: string | undefined, userId: Types.ObjectId) {
        const group = await Group.create({
            name,
            description,
            owner: userId,
            members: [userId],
            isPrivate: false
        });

        await group.populate('owner', 'address');
        await group.populate('members', 'address');

        return group;
    }

    async addMemberToGroup(groupId: string, userId: Types.ObjectId) {
        const group = await Group.findById(groupId);
        if (group && !group.members.includes(userId)) {
            group.members.push(userId);
            await group.save();
        }
        return group;
    }

    async searchGroups(query: string) {
        const searchRegex = new RegExp(query, 'i');
        return await Group.find({
            $or: [
                { name: searchRegex },
                { description: searchRegex }
            ],
            isPrivate: false
        })
            .populate('owner', 'address')
            .populate('members', 'address')
            .sort({ members: -1, createdAt: -1 })
            .limit(20);
    }

    async getGroupDetails(groupId: string) {
        return await Group.findById(groupId)
            .populate('owner', 'address')
            .populate('members', 'address')
            .populate('topContributors.user', 'address');
    }

    async getGroupMembers(groupId: string) {
        const group = await Group.findById(groupId)
            .populate('members', 'address tokenBalance reputation');
        return group?.members || [];
    }
}
