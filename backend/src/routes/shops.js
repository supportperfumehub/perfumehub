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

const cache60 = (req, res, next) => {
    res.setHeader('Cache-Control', 'private, max-age=60');
    next();
};

/**
 * Public & Admin Routes (Controller handles RBAC)
 */
router.get('/', cache60, shopController.getAllShops);
router.get('/nearest', cache60, shopController.getNearest);
router.get('/nearest-for-product', cache60, shopController.getNearestForProduct);
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
