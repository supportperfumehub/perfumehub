import { verifyAccessToken, extractTokenFromHeader } from '../utils/tokenUtils.js';
import { supabase } from '../config/supabaseClient.js';

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
     * POST /api/shops/manual
     */
    registerManual = async (req, res, next) => {
        try {
            let reqUser = null;
            const token = extractTokenFromHeader(req);
            if (token) {
                const decoded = verifyAccessToken(token);
                if (decoded) {
                    const { data: user } = await supabase
                        .from('customers')
                        .select('*')
                        .eq('id', decoded.id)
                        .single();
                    if (user) {
                        reqUser = user;
                    }
                }
            }

            const { adminCreated } = req.body;
            if (adminCreated && (!reqUser || !['super_admin', 'regional_admin', 'admin'].includes(reqUser.role))) {
                return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions to create shop as admin' });
            }

            const result = await this.shopService.registerShopManual({
                ...req.body,
                reqUser
            });

            res.status(201).json({
                success: true,
                ...result
            });
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
     * PUT /api/shops/:id/approve
     */
    approve = async (req, res, next) => {
        try {
            const { id } = req.params;
            const shop = await this.shopService.updateShopStatus(id, 'APPROVED', req.user);
            res.status(200).json({ success: true, shop });
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /api/shops/:id/reject
     */
    reject = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { rejection_reason } = req.body;
            const shop = await this.shopService.updateShopStatus(id, 'REJECTED', req.user, rejection_reason);
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
