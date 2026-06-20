import { AppError } from '../middleware/errorHandler.js';
import bcrypt from 'bcryptjs';

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

    async registerShopManual(data) {
        const { ownerName, ownerEmail, ownerPassword, shopName, address, whatsapp_number, images, is_recommended, adminCreated, reqUser } = data;

        // Check if user already exists
        const existingUser = await this.userRepository.findByEmail(ownerEmail);
        if (existingUser) {
            throw new AppError('Email already exists', 400);
        }

        // Hash user password
        const passwordHash = await bcrypt.hash(ownerPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));

        const userRole = (adminCreated && reqUser && ['super_admin', 'regional_admin', 'admin'].includes(reqUser.role)) ? 'vendor' : 'customer';
        const shopStatus = (adminCreated && reqUser && ['super_admin', 'regional_admin', 'admin'].includes(reqUser.role)) ? 'APPROVED' : 'PENDING';

        // Create user
        const user = await this.userRepository.create({
            name: ownerName,
            email: ownerEmail,
            password_hash: passwordHash,
            role: userRole,
            email_verified: false
        });

        // Create shop payload
        const shopPayload = {
            owner_id: user.id,
            name: shopName,
            address,
            images: images || [],
            status: shopStatus,
            whatsapp_number: whatsapp_number || null
        };

        if (is_recommended !== undefined) {
            shopPayload.is_recommended = is_recommended;
        }

        // Create shop
        const shop = await this.shopRepository.create(shopPayload);

        // Update user with shop_id
        await this.userRepository.update(user.id, { shop_id: shop.id });

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            shop,
            message: shopStatus === 'APPROVED' ? 'Vendor added successfully' : 'Vendor request submitted'
        };
    }

    async updateShopStatus(id, status, admin, rejectionReason = undefined) {
        const shop = await this.shopRepository.findById(id);
        if (!shop) throw new AppError('Shop not found', 404);

        // RBAC check for regional admins
        if (admin.role === 'regional_admin' && !admin.assignedRegionIds.includes(shop.region_id)) {
            throw new AppError('Forbidden: Cannot modify shops outside your regions', 403);
        }

        const updates = {
            status: status.toUpperCase(),
            approved_by: status.toUpperCase() === 'APPROVED' ? admin.id : undefined,
            approved_at: status.toUpperCase() === 'APPROVED' ? new Date().toISOString() : undefined
        };

        if (status.toUpperCase() === 'REJECTED') {
            updates.rejection_reason = rejectionReason || 'Administrative action';
        }

        const updatedShop = await this.shopRepository.update(id, updates);

        // Promote owner to vendor if approved
        if (status.toUpperCase() === 'APPROVED' || status.toUpperCase() === 'ACTIVE') {
            await this.userRepository.update(shop.owner_id, { role: 'vendor' });
        }

        return updatedShop;
    }

    async updateShop(id, updates, user) {
        const shop = await this.shopRepository.findById(id);
        if (!shop) throw new AppError('Shop not found', 404);

        // Extract ownerName and ownerEmail so they are not sent to the shops table update
        const { ownerName, ownerEmail, ...shopUpdates } = updates;

        // Ownership/Role checks
        if (user.email !== 'supportperfumehub@gmail.com') {
            if (user.role === 'vendor' && shop.owner_id !== user.id) {
                throw new AppError('Forbidden: Cannot update other shop', 403);
            }

            if (user.role === 'regional_admin' && !user.assignedRegionIds.includes(shop.region_id)) {
                throw new AppError('Forbidden: Cannot update shops in other regions', 403);
            }
        }

        // Update owner details in customers table if updated
        if (ownerName !== undefined || ownerEmail !== undefined) {
            const customerUpdates = {};
            if (ownerName !== undefined) customerUpdates.name = ownerName;
            if (ownerEmail !== undefined) customerUpdates.email = ownerEmail;
            
            await this.userRepository.update(shop.owner_id, customerUpdates);
        }

        return this.shopRepository.update(id, shopUpdates);
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
