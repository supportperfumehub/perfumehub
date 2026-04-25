import express from 'express';
import { ShopController } from '../controllers/shopController.js';
import { ShopService } from '../services/shopService.js';
import { ShopRepository } from '../repositories/shopRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Dependency Injection
const userRepository = new UserRepository();
const shopRepository = new ShopRepository();
const shopService = new ShopService(shopRepository, userRepository);
const shopController = new ShopController(shopService);

/**
 * Public Routes
 */
router.get('/', shopController.getAllShops);
router.get('/nearest', shopController.getNearest);
router.get('/nearest-for-product', shopController.getNearestForProduct);

/**
 * Admin Routes
 */
router.get('/', authenticateUser, verifyRole(['super_admin', 'regional_admin']), shopController.getAllShops);
router.patch('/:id/status', authenticateUser, verifyRole(['super_admin', 'regional_admin']), shopController.updateStatus);
router.delete('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin']), shopController.deleteShop);

/**
 * Vendor/Shared Routes
 */
router.post('/', authenticateUser, shopController.register);
router.put('/:id', authenticateUser, shopController.updateShop);

export default router;
