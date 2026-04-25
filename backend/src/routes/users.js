import express from 'express';
import { UserController } from '../controllers/userController.js';
import { UserService } from '../services/userService.js';
import { UserRepository } from '../repositories/userRepository.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Dependency Injection
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

/**
 * Routes
 */
router.get('/', authenticateUser, verifyRole(['super_admin', 'admin']), userController.getAllUsers);
router.get('/:id', userController.getUserProfile);
router.put('/:id', authenticateUser, userController.updateProfile);

export default router;
