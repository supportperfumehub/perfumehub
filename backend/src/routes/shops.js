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
 * Public & Admin Routes (Controller handles RBAC)
 */
router.get('/', shopController.getAllShops);
router.get('/nearest', shopController.getNearest);
router.get('/nearest-for-product', shopController.getNearestForProduct);
router.post('/manual', shopController.registerManual);

/**
 * Admin Routes
 */
router.patch('/:id/status', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), shopController.updateStatus);
router.put('/:id/status', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), shopController.updateStatus);
router.put('/:id/approve', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), shopController.approve);
router.put('/:id/reject', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), shopController.reject);
router.delete('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), shopController.deleteShop);

/**
 * Vendor/Shared Routes
 */
router.post('/', authenticateUser, shopController.register);
router.put('/:id', authenticateUser, shopController.updateShop);

export default router;
