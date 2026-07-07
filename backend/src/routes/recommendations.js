import express from 'express';
import { RecommendationController } from '../controllers/recommendationController.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Dependency Injection
const recommendationRepository = new RecommendationRepository();
const recommendationController = new RecommendationController(recommendationRepository);

const cache30 = (req, res, next) => {
    res.setHeader('Cache-Control', 'private, max-age=30');
    next();
};

/**
 * Public Routes
 */
// GET /api/recommendations/vendors/:productId
router.get('/vendors/:productId', cache30, recommendationController.getRecommendedVendors);

/**
 * Admin API (Tunable Weights & Manual Boosts)
 */
// PUT /api/recommendations/tuning
router.put('/tuning', authenticateUser, verifyRole(['super_admin']), recommendationController.updateWeights);

// PATCH /api/recommendations/boost/:shopId
router.patch('/boost/:shopId', authenticateUser, verifyRole(['super_admin', 'regional_admin']), recommendationController.manualBoost);

export default router;
