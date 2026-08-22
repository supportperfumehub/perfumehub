import express from 'express';
import { AuthController } from '../controllers/authController.js';
import { AuthService } from '../services/authService.js';
import { UserRepository } from '../repositories/userRepository.js';
import { authenticateUser } from '../middleware/auth.js';
import { authRateLimiter, loginRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Initialize dependencies
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

/**
 * Public Routes
 */
router.post('/register', authRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/2fa/verify', loginRateLimiter, authController.verify2FA);
router.post('/google', authController.googleLogin);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);


/**
 * Protected Routes
 */
router.post('/2fa/setup', authenticateUser, authController.setup2FA);
router.post('/2fa/enable', authenticateUser, authController.enable2FA);

// Device Management for SA, RA, and Vendor Admin
router.get('/devices', authenticateUser, authController.getUserDevices);
router.post('/devices/revoke', authenticateUser, authController.revokeDevice);
router.post('/devices/revoke-all-others', authenticateUser, authController.revokeAllOtherDevices);

export default router;
