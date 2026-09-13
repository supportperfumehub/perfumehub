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

// Edge CDN Caching Middlewares
const edgeCacheShops = (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    next();
};

const edgeCacheGeo = (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=600');
    next();
};

const privateCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, private');
    next();
};

/**
 * Public & Discovery Routes (Edge CDN Cached)
 */
router.get('/', edgeCacheShops, shopController.getAllShops);
router.get('/nearest', edgeCacheGeo, shopController.getNearest);
router.get('/nearest-for-product', edgeCacheGeo, shopController.getNearestForProduct);
router.post('/manual', shopController.registerManual);

/**
 * Admin Routes
 */
router.patch('/:id/status', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), privateCache, shopController.updateStatus);
router.put('/:id/status', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), privateCache, shopController.updateStatus);
router.put('/:id/approve', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), privateCache, shopController.approve);
router.put('/:id/reject', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), privateCache, shopController.reject);
router.delete('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), privateCache, shopController.deleteShop);

/**
 * Vendor/Shared Routes (Private No-Store)
 */
router.get('/my-shops', authenticateUser, verifyRole(['vendor', 'super_admin', 'admin', 'regional_admin']), privateCache, shopController.getMyShops);
router.post('/create-branch', authenticateUser, verifyRole(['vendor', 'super_admin', 'admin']), shopController.createBranch);
router.post('/', authenticateUser, shopController.register);
router.get('/:id/settings', authenticateUser, verifyRole(['vendor', 'super_admin', 'admin', 'regional_admin']), privateCache, shopController.getSettings);
router.put('/:id/settings', authenticateUser, verifyRole(['vendor', 'super_admin', 'admin', 'regional_admin']), shopController.updateSettings);
router.get('/:id/financials', authenticateUser, verifyRole(['vendor', 'super_admin', 'admin', 'regional_admin']), privateCache, shopController.getFinancials);
router.get('/:id/payout-info', authenticateUser, verifyRole(['vendor', 'super_admin', 'admin', 'regional_admin']), privateCache, shopController.getPayoutInfo);
router.put('/:id/payout-info', authenticateUser, verifyRole(['vendor', 'super_admin', 'admin', 'regional_admin']), shopController.updatePayoutInfo);
router.post('/:id/request-payout', authenticateUser, verifyRole(['vendor', 'super_admin', 'admin']), shopController.requestPayout);
router.put('/:id', authenticateUser, verifyRole(['vendor', 'super_admin', 'admin', 'regional_admin']), shopController.updateShop);

export default router;
