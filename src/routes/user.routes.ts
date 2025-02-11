// src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';

export function createUserRouter(userService: UserService) {
    const router = Router();
    const userController = new UserController(userService);

    // Initialize user
    router.post('/init', userController.initializeUser);

    // Get user by address
    router.get('/:address', userController.getUserByAddress);

    // Update user
    router.patch('/:address', userController.updateUser);

    return router;
}