/**
 * Controller for Shop domain
 */
export class ShopController {
    constructor(shopService) {
        this.shopService = shopService;
    }

    /**
     * GET /api/shops
     */
    getAllShops = async (req, res, next) => {
        try {
            const filters = {
                status: req.query.status,
                owner_id: req.query.owner_id
            };
            const shops = await this.shopService.getShops(filters, req.user);
            res.status(200).json(shops);
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/shops/nearest
     */
    getNearest = async (req, res, next) => {
        try {
            const { lat, lng, radius = 50 } = req.query;
            if (!lat || !lng) return res.status(400).json({ success: false, error: 'Latitude and Longitude required' });
            
            const shops = await this.shopService.getNearestShops(lat, lng, radius);
            res.status(200).json(shops);
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/shops/nearest-for-product
     */
    getNearestForProduct = async (req, res, next) => {
        try {
            const { product_id, lat, lng, radius = 50, limit = 10 } = req.query;
            if (!product_id) return res.status(400).json({ success: false, error: 'product_id is required' });
            if (!lat || !lng) return res.status(400).json({ success: false, error: 'Latitude and Longitude required' });

            const shops = await this.shopService.getNearestShopsForProduct(product_id, lat, lng, radius, limit);
            res.status(200).json({ success: true, data: shops });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/shops
     */
    register = async (req, res, next) => {
        try {
            const shop = await this.shopService.registerShop(req.body);
            res.status(201).json({ success: true, shop });
        } catch (error) {
            next(error);
        }
    };

    /**
     * PATCH /api/shops/:id/status
     */
    updateStatus = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const shop = await this.shopService.updateShopStatus(id, status, req.user);
            res.status(200).json({ success: true, shop });
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /api/shops/:id
     */
    updateShop = async (req, res, next) => {
        try {
            const { id } = req.params;
            const shop = await this.shopService.updateShop(id, req.body, req.user);
            res.status(200).json({ success: true, shop });
        } catch (error) {
            next(error);
        }
    };

    /**
     * DELETE /api/shops/:id
     */
    deleteShop = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.shopService.deleteShop(id, req.user);
            res.status(200).json({ success: true, message: 'Shop deleted successfully' });
        } catch (error) {
            next(error);
        }
    };
}
