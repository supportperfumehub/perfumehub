import { AppError } from '../middleware/errorHandler.js';

export class ShopService {
    constructor(shopRepository, userRepository) {
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
    }

    async getShops(filters = {}, user = null) {
        if (user && user.role === 'regional_admin') {
            filters.region_ids = user.assignedRegionIds;
        }
        return this.shopRepository.findAll(filters);
    }

    async getNearestShops(lat, lon, radius) {
        const shops = await this.shopRepository.findNearest(lat, lon, radius);
        // Only return active shops for public nearest search
        return shops ? shops.filter(s => s.status && s.status.toUpperCase() === 'ACTIVE') : [];
    }

    async getNearestShopsForProduct(productId, lat, lng, radius, limit) {
        return this.shopRepository.findNearestForProduct(productId, lat, lng, radius, limit);
    }

    async registerShop(regData) {
        const { owner_id, name, address, latitude, longitude, logo_url } = regData;
        
        const shop = await this.shopRepository.create({
            owner_id, name, address, latitude, longitude, logo_url,
            status: 'PENDING'
        });

        // Map shop to user
        await this.userRepository.update(owner_id, { shop_id: shop.id });

        return shop;
    }

    async updateShopStatus(id, status, admin) {
        const shop = await this.shopRepository.findById(id);
        if (!shop) throw new AppError('Shop not found', 404);

        // RBAC check for regional admins
        if (admin.role === 'regional_admin' && !admin.assignedRegionIds.includes(shop.region_id)) {
            throw new AppError('Forbidden: Cannot modify shops outside your regions', 403);
        }

        const updatedShop = await this.shopRepository.update(id, { 
            status: status.toUpperCase(),
            approved_by: status.toUpperCase() === 'APPROVED' ? admin.id : undefined,
            approved_at: status.toUpperCase() === 'APPROVED' ? new Date().toISOString() : undefined
        });

        // Promote owner to vendor if approved
        if (status.toUpperCase() === 'APPROVED' || status.toUpperCase() === 'ACTIVE') {
            await this.userRepository.update(shop.owner_id, { role: 'vendor' });
        }

        return updatedShop;
    }

    async updateShop(id, updates, user) {
        const shop = await this.shopRepository.findById(id);
        if (!shop) throw new AppError('Shop not found', 404);

        // Ownership/Role checks
        if (user.email === 'supportperfumehub@gmail.com') {
            // Master Bypass for Main Admin
            return this.shopRepository.update(id, updates);
        }

        if (user.role === 'vendor' && shop.owner_id !== user.id) {
            throw new AppError('Forbidden: Cannot update other shop', 403);
        }

        if (user.role === 'regional_admin' && !user.assignedRegionIds.includes(shop.region_id)) {
            throw new AppError('Forbidden: Cannot update shops in other regions', 403);
        }

        return this.shopRepository.update(id, updates);
    }

    async deleteShop(id, admin) {
        const shop = await this.shopRepository.findById(id);
        if (!shop) throw new AppError('Shop not found', 404);

        if (admin.role === 'regional_admin' && !admin.assignedRegionIds.includes(shop.region_id)) {
             throw new AppError('Forbidden: Access denied', 403);
        }

        // Cleanup user mapping
        await this.userRepository.update(shop.owner_id, { shop_id: null, role: 'customer' });

        return this.shopRepository.delete(id);
    }
}
