// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
    constructor(private userService: UserService) { }

    public initializeUser(req: Request, res: Response): Promise<void> {
        return new Promise<void>(async (resolve) => {
            try {
                const { address } = req.body;

                if (!address) {
                    res.status(400).json({ error: 'Address is required' });
                    return resolve();
                }

                const user = await this.userService.initializeUser(address);
                res.json(user);
                resolve();
            } catch (error) {
                console.error('Error in user initialization:', error);
                res.status(500).json({ error: 'Failed to initialize user' });
                resolve();
            }
        });
    }

    public getUserByAddress(req: Request, res: Response): Promise<void> {
        return new Promise<void>(async (resolve) => {
            try {
                const { address } = req.params;
                const user = await this.userService.getUserByAddress(address);

                if (!user) {
                    res.status(404).json({ error: 'User not found' });
                    return resolve();
                }

                res.json(user);
                resolve();
            } catch (error) {
                console.error('Error fetching user:', error);
                res.status(500).json({ error: 'Failed to fetch user' });
                resolve();
            }
        });
    }

    public updateUser(req: Request, res: Response): Promise<void> {
        return new Promise<void>(async (resolve) => {
            try {
                const { address } = req.params;
                const updateData = req.body;

                const user = await this.userService.updateUser(address, updateData);

                if (!user) {
                    res.status(404).json({ error: 'User not found' });
                    return resolve();
                }

                res.json(user);
                resolve();
            } catch (error) {
                console.error('Error updating user:', error);
                res.status(500).json({ error: 'Failed to update user' });
                resolve();
            }
        });
    }
}