import { AppError } from '../middleware/errorHandler.js';
import bcrypt from 'bcryptjs';
import { uploadImageToStorage, deleteImageFromStorage, syncImagesStorage } from '../utils/storageUtils.js';
import { supabase } from '../config/supabaseClient.js';
import fs from 'fs';
import path from 'path';
import { emailService } from './emailService.js';
import { logAdminAudit } from '../utils/auditLogger.js';

export class ShopService {
    constructor(shopRepository, userRepository) {
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
    }

    async getShops(filters = {}, user = null) {
        if (user && user.role === 'regional_admin') {
            filters.region_ids = user.assignedRegionIds;
        }
        if (user && user.role === 'vendor') {
            filters.owner_id = user.id;
        }
        return this.shopRepository.findAll(filters);
    }

    async getNearestShops(lat, lon, radius) {
        const shops = await this.shopRepository.findNearest(lat, lon, radius);
        // Only return active/approved shops for public nearest search
        return shops ? shops.filter(s => s.status && (s.status.toUpperCase() === 'ACTIVE' || s.status.toUpperCase() === 'APPROVED')) : [];
    }

    async getNearestShopsForProduct(productId, lat, lng, radius, limit) {
        return this.shopRepository.findNearestForProduct(productId, lat, lng, radius, limit);
    }

    async registerShop(regData) {
        let { owner_id, name, address, latitude, longitude, logo_url } = regData;
        
        if (logo_url && logo_url.startsWith('data:')) {
            logo_url = await uploadImageToStorage(logo_url, name || 'shop_logo', 'shops');
        }

        const shop = await this.shopRepository.create({
            owner_id, name, address, latitude, longitude, logo_url,
            status: 'PENDING'
        });

        // Map shop to user
        await this.userRepository.update(owner_id, { shop_id: shop.id });

        return shop;
    }

    async getMyShops(user) {
        if (!user || !user.id) return [];
        return this.shopRepository.findAll({ owner_id: user.id });
    }

    async createBranch(user, branchData) {
        let { name, address, latitude, longitude, logo_url, whatsapp_number, images, region_id } = branchData;

        if (logo_url && logo_url.startsWith('data:')) {
            logo_url = await uploadImageToStorage(logo_url, name || 'branch_logo', 'shops');
        }

        const syncedImages = await syncImagesStorage([], images || (logo_url ? [logo_url] : []), name || 'branch', 'shops');

        let resolvedRegionId = region_id ? parseInt(region_id) : null;
        if (!resolvedRegionId && user.shop_id) {
            try {
                const primaryShop = await this.shopRepository.findById(user.shop_id);
                if (primaryShop && primaryShop.region_id) {
                    resolvedRegionId = primaryShop.region_id;
                }
            } catch (e) {}
        }

        const shop = await this.shopRepository.create({
            owner_id: user.id,
            name,
            address,
            region_id: resolvedRegionId,
            latitude: latitude || null,
            longitude: longitude || null,
            logo_url: logo_url || (syncedImages[0] || null),
            images: syncedImages,
            whatsapp_number: whatsapp_number || null,
            status: 'APPROVED'
        });

        if (!user.shop_id) {
            await this.userRepository.update(user.id, { shop_id: shop.id });
        }

        return shop;
    }

    async registerShopManual(data) {
        const { ownerName, ownerEmail, ownerPassword, shopName, address, whatsapp_number, images, is_recommended, adminCreated, reqUser } = data;

        // Check if user already exists
        const existingUser = await this.userRepository.findByEmail(ownerEmail);
        if (existingUser) {
            throw new AppError('Email already exists', 400);
        }

        // Upload any base64 images to Supabase storage
        const syncedImages = await syncImagesStorage([], images || [], shopName || 'shop', 'shops');

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
            images: syncedImages,
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
        if (admin.role === 'regional_admin' && !admin.assignedRegionIds?.includes(shop.region_id)) {
            throw new AppError('Access Denied: You do not have administrative authority over this geographic territory.', 403);
        }

        const normalizedStatus = status.toUpperCase();
        const isApprovedOrActive = normalizedStatus === 'APPROVED' || normalizedStatus === 'ACTIVE';

        const updates = {
            status: normalizedStatus,
            approved_by: isApprovedOrActive ? admin.id : undefined,
            approved_at: isApprovedOrActive ? new Date().toISOString() : undefined
        };

        if (normalizedStatus === 'REJECTED') {
            updates.rejection_reason = rejectionReason || 'Administrative action';
        }

        const updatedShop = await this.shopRepository.update(id, updates);

        // Promote owner to vendor if approved and send Welcome Pack
        if (isApprovedOrActive) {
            await this.userRepository.update(shop.owner_id, { role: 'vendor' });
            
            // Dispatch real luxury welcome pack email to boutique owner
            try {
                const owner = await this.userRepository.findById(shop.owner_id);
                if (owner && owner.email) {
                    emailService.sendVendorApprovalEmail(owner, updatedShop).catch(e => 
                        console.error('Vendor welcome email warning:', e.message)
                    );
                }
            } catch (emailErr) {
                console.error('Error fetching owner for welcome email:', emailErr.message);
            }
        }

        // Immutable platform audit log
        logAdminAudit({
            actorId: admin?.id,
            actorEmail: admin?.email,
            actorRole: admin?.role,
            action: isApprovedOrActive ? 'approve_shop' : (normalizedStatus === 'REJECTED' ? 'reject_shop' : 'update_shop_status'),
            targetEntity: 'shops',
            targetId: id,
            details: { previousStatus: shop.status, newStatus: normalizedStatus, rejectionReason }
        }).catch(e => console.error('Audit log warning:', e.message));

        return updatedShop;
    }

    _assertShopAccess(shop, user, allowRegional = true) {
        if (!user) throw new AppError('Authentication required', 401);
        if (user.email === 'supportperfumehub@gmail.com' || user.role === 'super_admin' || user.role === 'admin') {
            return; // Super Admin has global clearance
        }
        if (user.role === 'vendor') {
            const owned = user.ownedShopIds || (user.shop_id ? [user.shop_id] : []);
            if (!owned.includes(shop.id) && shop.owner_id !== user.id) {
                throw new AppError('Forbidden: You do not own this boutique branch.', 403);
            }
            return;
        }
        if (allowRegional && user.role === 'regional_admin') {
            if (!user.assignedRegionIds?.includes(shop.region_id)) {
                throw new AppError('Access Denied: You do not have administrative authority over this geographic territory.', 403);
            }
            return;
        }
        throw new AppError('Forbidden: Insufficient privileges', 403);
    }

    async updateShop(id, updates, user) {
        const shop = await this.shopRepository.findById(id);
        if (!shop) throw new AppError('Shop not found', 404);

        // Strict RBAC and Ownership check (Customer strictly forbidden)
        this._assertShopAccess(shop, user, true);

        // Extract ownerName and ownerEmail so they are not sent to the shops table update
        const { ownerName, ownerEmail, ...shopUpdates } = updates;

        // Handle Image Synchronization (uploads new base64 & automatically deletes replaced/removed images)
        if (shopUpdates.images !== undefined) {
            const syncedImages = await syncImagesStorage(
                shop.images || [], 
                shopUpdates.images || [], 
                shopUpdates.name || shop.name || 'shop', 
                'shops'
            );
            shopUpdates.images = syncedImages;
        }

        if (shopUpdates.logo_url !== undefined) {
            if (shopUpdates.logo_url && shopUpdates.logo_url.startsWith('data:')) {
                if (shop.logo_url) {
                    await deleteImageFromStorage(shop.logo_url);
                }
                shopUpdates.logo_url = await uploadImageToStorage(
                    shopUpdates.logo_url, 
                    shopUpdates.name || shop.name || 'shop_logo', 
                    'shops'
                );
            } else if (!shopUpdates.logo_url && shop.logo_url) {
                await deleteImageFromStorage(shop.logo_url);
            }
        }

        // Update owner details in customers table if updated
        if (ownerName !== undefined || ownerEmail !== undefined) {
            const customerUpdates = {};
            if (ownerName !== undefined) customerUpdates.name = ownerName;
            if (ownerEmail !== undefined) customerUpdates.email = ownerEmail;
            
            await this.userRepository.update(shop.owner_id, customerUpdates);
        }

        const updated = await this.shopRepository.update(id, shopUpdates);

        if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'regional_admin') {
            logAdminAudit({
                actorId: user.id,
                actorEmail: user.email,
                actorRole: user.role,
                action: shopUpdates.tier ? 'update_shop_tier' : 'update_shop',
                targetEntity: 'shops',
                targetId: id,
                details: { updatedFields: Object.keys(shopUpdates), newTier: shopUpdates.tier }
            }).catch(e => console.error('Audit log warning:', e.message));
        }

        return updated;
    }

    async deleteShop(id, admin) {
        const shop = await this.shopRepository.findById(id);
        if (!shop) throw new AppError('Shop not found', 404);

        if (admin.role === 'regional_admin' && !admin.assignedRegionIds?.includes(shop.region_id)) {
             throw new AppError('Access Denied: You do not have administrative authority over this geographic territory.', 403);
        }

        logAdminAudit({
            actorId: admin.id,
            actorEmail: admin.email,
            actorRole: admin.role,
            action: 'delete_shop',
            targetEntity: 'shops',
            targetId: id,
            details: { name: shop.name, owner_id: shop.owner_id }
        }).catch(e => console.error('Audit log warning:', e.message));

        // Archive shop to backups for recovery
        try {
            await supabase.from('backups').insert([{
                table_name: 'shops',
                record_id: String(id),
                data: shop,
                deleted_at: new Date().toISOString()
            }]);
        } catch (bErr) {
            console.warn('Backup archival warning for shop:', bErr.message);
        }

        // Soft delete the shop (preserving storage images)
        await this.shopRepository.update(id, { 
            deleted_at: new Date().toISOString(),
            status: 'DELETED' 
        });

        // Cleanup user mapping: check if owner still has other active shops
        const remainingShops = await this.shopRepository.findAll({ owner_id: shop.owner_id });
        const otherActiveShops = (remainingShops || []).filter(s => s.id !== id && !s.deleted_at);
        if (otherActiveShops.length === 0) {
            await this.userRepository.update(shop.owner_id, { shop_id: null, role: 'customer' });
        } else {
            await this.userRepository.update(shop.owner_id, { shop_id: otherActiveShops[0].id });
        }

        return { id, message: 'Shop soft-deleted successfully' };
    }

    async getSettings(id, user) {
        const shop = await this.shopRepository.findById(id);
        if (!shop) throw new AppError('Shop not found', 404);

        this._assertShopAccess(shop, user, true);

        // Try reading fallback file if exists
        let fallbackSettings = {};
        try {
            const settingsFile = path.join(process.cwd(), 'backend', 'data', 'settings', `${id}.json`);
            if (fs.existsSync(settingsFile)) {
                fallbackSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
            }
        } catch (e) {}

        const openingHours = shop.opening_hours || fallbackSettings.opening_hours || {
            open: fallbackSettings.openTime || '09:00',
            close: fallbackSettings.closeTime || '22:00',
            weekend: fallbackSettings.weekendHours || '04:00 PM - 11:30 PM'
        };

        return {
            id: shop.id,
            name: shop.name,
            opening_hours: openingHours,
            openTime: openingHours.open || '09:00',
            closeTime: openingHours.close || '22:00',
            weekendHours: openingHours.weekend || '04:00 PM - 11:30 PM',
            allow_pickup: shop.allow_pickup !== undefined ? shop.allow_pickup : (fallbackSettings.allow_pickup !== undefined ? fallbackSettings.allow_pickup : true),
            allow_delivery: shop.allow_delivery !== undefined ? shop.allow_delivery : (fallbackSettings.allow_delivery !== undefined ? fallbackSettings.allow_delivery : true),
            allowStorePickup: shop.allow_pickup !== undefined ? shop.allow_pickup : (fallbackSettings.allowStorePickup !== undefined ? fallbackSettings.allowStorePickup : true),
            allowHomeDelivery: shop.allow_delivery !== undefined ? shop.allow_delivery : (fallbackSettings.allowHomeDelivery !== undefined ? fallbackSettings.allowHomeDelivery : true),
            delivery_window: shop.delivery_window || fallbackSettings.delivery_window || fallbackSettings.deliveryWindow || 'same_day',
            deliveryWindow: shop.delivery_window || fallbackSettings.delivery_window || fallbackSettings.deliveryWindow || 'same_day',
            whatsapp_greeting: shop.whatsapp_greeting || fallbackSettings.whatsapp_greeting || fallbackSettings.whatsappGreeting || 'Thank you for choosing our boutique on PerfumeHub.',
            whatsappGreeting: shop.whatsapp_greeting || fallbackSettings.whatsapp_greeting || fallbackSettings.whatsappGreeting || 'Thank you for choosing our boutique on PerfumeHub.',
            low_stock_threshold: shop.low_stock_threshold !== undefined ? shop.low_stock_threshold : (fallbackSettings.low_stock_threshold || 5),
            notifyLowStock: fallbackSettings.notifyLowStock !== undefined ? fallbackSettings.notifyLowStock : true,
            notifyNewReservations: fallbackSettings.notifyNewReservations !== undefined ? fallbackSettings.notifyNewReservations : true,
            bank_details: shop.bank_details || fallbackSettings.bank_details || { bank_name: '', account_holder: '', iban: '', swift: '' }
        };
    }

    async updateSettings(id, newSettings, user) {
        const shop = await this.shopRepository.findById(id);
        if (!shop) throw new AppError('Shop not found', 404);

        this._assertShopAccess(shop, user, true);

        const openTime = newSettings.openTime || newSettings.opening_hours?.open || '09:00';
        const closeTime = newSettings.closeTime || newSettings.opening_hours?.close || '22:00';
        const weekendHours = newSettings.weekendHours || newSettings.opening_hours?.weekend || '04:00 PM - 11:30 PM';
        const allowPickup = newSettings.allow_pickup !== undefined ? Boolean(newSettings.allow_pickup) : (newSettings.allowStorePickup !== undefined ? Boolean(newSettings.allowStorePickup) : true);
        const allowDelivery = newSettings.allow_delivery !== undefined ? Boolean(newSettings.allow_delivery) : (newSettings.allowHomeDelivery !== undefined ? Boolean(newSettings.allowHomeDelivery) : true);
        const deliveryWindow = newSettings.delivery_window || newSettings.deliveryWindow || 'same_day';
        const whatsappGreeting = newSettings.whatsapp_greeting || newSettings.whatsappGreeting || 'Thank you for choosing our boutique on PerfumeHub.';
        const lowStockThreshold = newSettings.low_stock_threshold !== undefined ? Number(newSettings.low_stock_threshold) : 5;
        const bankDetails = newSettings.bank_details || {};

        const dbPayload = {
            opening_hours: { open: openTime, close: closeTime, weekend: weekendHours },
            allow_pickup: allowPickup,
            allow_delivery: allowDelivery,
            delivery_window: deliveryWindow,
            whatsapp_greeting: whatsappGreeting,
            low_stock_threshold: lowStockThreshold
        };

        if (newSettings.bank_details !== undefined) {
            dbPayload.bank_details = bankDetails;
        }

        // Try updating directly in Supabase
        try {
            await supabase
                .from('shops')
                .update(dbPayload)
                .eq('id', id);
        } catch (dbErr) {
            console.warn('DB settings column update notice:', dbErr.message);
        }

        // Always persist to fallback JSON store as well for safety
        try {
            const dir = path.join(process.cwd(), 'backend', 'data', 'settings');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, `${id}.json`);
            fs.writeFileSync(filePath, JSON.stringify({ ...newSettings, ...dbPayload }, null, 2), 'utf8');
        } catch (fsErr) {
            console.error('Fallback settings file write error:', fsErr);
        }

        return this.getSettings(id, user);
    }

    async getFinancials(id, user) {
        if (!user) throw new AppError('Authentication required', 401);
        if (user.role === 'customer') throw new AppError('Forbidden: Insufficient privileges', 403);

        let targetShopIds = [];
        if (id === 'all') {
            if (user.role === 'vendor') {
                targetShopIds = user.ownedShopIds || (user.shop_id ? [user.shop_id] : []);
            } else if (user.role === 'super_admin' || user.role === 'admin' || user.email === 'supportperfumehub@gmail.com') {
                const allShops = await this.shopRepository.findAll();
                targetShopIds = (allShops || []).map(s => s.id);
            } else if (user.role === 'regional_admin') {
                const { data: rShops } = await supabase.from('shops').select('id').in('region_id', user.assignedRegionIds || []);
                targetShopIds = (rShops || []).map(s => s.id);
            }
        } else {
            const shop = await this.shopRepository.findById(id);
            if (!shop) throw new AppError('Shop not found', 404);
            this._assertShopAccess(shop, user, true);
            targetShopIds = [id];
        }

        if (targetShopIds.length === 0) {
            return {
                grossSales: 0,
                commissionRate: 10,
                commissionWithheld: 0,
                netAvailableBalance: 0,
                pendingPayouts: 0,
                totalWithdrawn: 0,
                currency: 'QAR',
                transactions: []
            };
        }

        // Fetch sub-orders
        const { data: subOrders, error: soErr } = await supabase
            .from('sub_orders')
            .select('*, orders(*)')
            .in('shop_id', targetShopIds)
            .order('created_at', { ascending: false });

        if (soErr) throw soErr;

        // Fetch payout requests
        let payoutRequests = [];
        try {
            const { data: prData } = await supabase
                .from('payout_requests')
                .select('*')
                .in('shop_id', targetShopIds);
            if (prData) payoutRequests = prData;
        } catch (e) {}

        // Fallback payout requests from disk if table not created
        try {
            const pDir = path.join(process.cwd(), 'backend', 'data', 'payouts');
            if (fs.existsSync(pDir)) {
                const files = fs.readdirSync(pDir);
                files.forEach(f => {
                    try {
                        const content = JSON.parse(fs.readFileSync(path.join(pDir, f), 'utf8'));
                        if (targetShopIds.includes(content.shop_id) && !payoutRequests.some(p => p.id === content.id)) {
                            payoutRequests.push(content);
                        }
                    } catch (err) {}
                });
            }
        } catch (e) {}

        // Calculate gross sales (exclude cancelled)
        const validOrders = (subOrders || []).filter(o => (o.status || '').toLowerCase() !== 'cancelled');
        const totalGrossSales = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || Number(o.subtotal) || 0), 0);

        // Fetch commission rate from shops
        const { data: shopsList } = await supabase.from('shops').select('id, commission_rate').in('id', targetShopIds);
        const commissionRate = (shopsList && shopsList[0]?.commission_rate) ? Number(shopsList[0].commission_rate) : 10.0;
        const platformCommission = (totalGrossSales * commissionRate) / 100;

        // Payout sums
        const pendingPayoutAmount = payoutRequests
            .filter(pr => (pr.status || '').toLowerCase() === 'pending' || (pr.status || '').toLowerCase() === 'processing')
            .reduce((sum, pr) => sum + Number(pr.amount || 0), 0);

        const completedPayoutAmount = payoutRequests
            .filter(pr => (pr.status || '').toLowerCase() === 'completed')
            .reduce((sum, pr) => sum + Number(pr.amount || 0), 0);

        const netAvailable = Math.max(0, totalGrossSales - platformCommission - pendingPayoutAmount - completedPayoutAmount);

        // Mapped transactions
        const transactions = (subOrders || []).map(so => {
            const gross = Number(so.total_amount || so.subtotal || 0);
            const fee = (gross * commissionRate) / 100;
            return {
                id: so.id,
                order_id: so.parent_order_id,
                date: so.created_at,
                customer: so.orders?.customerName || so.orders?.email || 'Customer',
                gross: Number(gross.toFixed(2)),
                commission: Number(fee.toFixed(2)),
                net: Number((gross - fee).toFixed(2)),
                status: so.status,
                currency: 'QAR'
            };
        });

        return {
            grossSales: Number(totalGrossSales.toFixed(2)),
            commissionRate: Number(commissionRate),
            commissionWithheld: Number(platformCommission.toFixed(2)),
            netAvailableBalance: Number(netAvailable.toFixed(2)),
            pendingPayouts: Number(pendingPayoutAmount.toFixed(2)),
            totalWithdrawn: Number(completedPayoutAmount.toFixed(2)),
            currency: 'QAR',
            payoutRequests,
            transactions
        };
    }

    async getPayoutInfo(id, user) {
        const settings = await this.getSettings(id, user);
        return settings.bank_details || { bank_name: '', account_holder: '', iban: '', swift: '' };
    }

    async updatePayoutInfo(id, bankDetails, user) {
        const settings = await this.getSettings(id, user);
        return this.updateSettings(id, { ...settings, bank_details: bankDetails }, user);
    }

    async requestPayout(id, { amount, notes }, user) {
        if (!user) throw new AppError('Authentication required', 401);
        if (user.role === 'regional_admin' || user.role === 'customer') {
            throw new AppError('Forbidden: Insufficient privileges to request payouts.', 403);
        }
        const financials = await this.getFinancials(id, user);
        const reqAmount = Number(amount);
        if (isNaN(reqAmount) || reqAmount <= 0) {
            throw new AppError('Valid withdrawal amount is required', 400);
        }
        if (reqAmount > financials.netAvailableBalance) {
            throw new AppError(`Requested amount (${reqAmount} QAR) exceeds net available balance (${financials.netAvailableBalance} QAR)`, 400);
        }

        const payoutInfo = await this.getPayoutInfo(id, user);
        if (!payoutInfo.iban) {
            throw new AppError('Please register your IBAN and bank details before requesting a payout.', 400);
        }

        const payoutRecord = {
            id: 'PAY-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            shop_id: id,
            vendor_id: user.id,
            amount: reqAmount,
            status: 'pending',
            iban: payoutInfo.iban,
            bank_name: payoutInfo.bank_name || 'Bank',
            notes: notes || '',
            created_at: new Date().toISOString()
        };

        try {
            await supabase.from('payout_requests').insert([payoutRecord]);
        } catch (dbErr) {
            // Save to fallback disk
            const pDir = path.join(process.cwd(), 'backend', 'data', 'payouts');
            if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true });
            fs.writeFileSync(path.join(pDir, `${payoutRecord.id}.json`), JSON.stringify(payoutRecord, null, 2), 'utf8');
        }

        return {
            success: true,
            message: 'Payout request of ' + reqAmount + ' QAR submitted successfully. Funds will be wired to ' + payoutInfo.iban,
            payout: payoutRecord
        };
    }
}
