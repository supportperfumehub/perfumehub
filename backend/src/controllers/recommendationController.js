/**
 * Controller for Recommendation Engine
 */
export class RecommendationController {
    constructor(recommendationRepository) {
        this.recommendationRepository = recommendationRepository;
    }

    /**
     * GET /api/recommendations/vendors/:productId
     * Fetches ranked vendors for a specific product
     */
    getRecommendedVendors = async (req, res, next) => {
        try {
            const { productId } = req.params;
            const { lat, lon } = req.query;

            // Default to Doha coords if not provided
            const userLat = lat || 25.2854;
            const userLon = lon || 51.5310;

            const recommendations = await this.recommendationRepository.getRecommendedVendors(
                productId,
                userLat,
                userLon
            );

            res.status(200).json({
                success: true,
                count: recommendations.length,
                data: recommendations
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /api/recommendations/tuning
     * Admin only: Update algorithm weights
     */
    updateWeights = async (req, res, next) => {
        try {
            const configId = req.body.id || 'default_v1';
            const updates = req.body.updates;
            
            const updatedConfig = await this.recommendationRepository.updateAlgorithmConfig(
                configId,
                updates
            );

            res.status(200).json({
                success: true,
                message: 'Algorithm weights updated',
                config: updatedConfig
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * PATCH /api/recommendations/boost/:shopId
     * Admin only: Manually boost a specific shop
     */
    manualBoost = async (req, res, next) => {
        try {
            const { shopId } = req.params;
            const { is_featured, manual_boost_multiplier } = req.body;

            const updatedShop = await this.recommendationRepository.updateShopBoost(shopId, {
                is_featured,
                manual_boost_multiplier
            });

            res.status(200).json({
                success: true,
                message: 'Shop boost settings updated',
                shop: updatedShop
            });
        } catch (error) {
            next(error);
        }
    };
}
