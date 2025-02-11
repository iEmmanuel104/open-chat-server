// src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';

export function createUserRouter(userService: UserService) {
    const router = Router();
    const userController = new UserController(userService);

    // Initialize user - bind the method to maintain context
    router.post('/init', (req, res) => userController.initializeUser(req, res));

    // Get user by address - bind the method to maintain context
    router.get('/:address', (req, res) => userController.getUserByAddress(req, res));

    // Update user - bind the method to maintain context
    router.patch('/:address', (req, res) => userController.updateUser(req, res));

    return router;
}