import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Timeout wrapper for Supabase queries
const withTimeout = (promise, ms = 15000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timed out')), ms)
        )
    ]);
};

app.use(cors());
app.use(express.json());

// Debug Route to check table accessibility
app.get('/api/debug/schema', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .limit(1);
        
        if (error) {
            return res.status(500).json({ error: 'Database check failed', details: error });
        }
        res.json({ message: 'Table accessible', data });
    } catch (err) {
        res.status(500).json({ error: 'System error', details: err.message });
    }
});

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        let query = supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (req.query.shop_id) {
            query = query.eq('shop_id', req.query.shop_id);
        }

        const { data, error } = await withTimeout(query);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        if (error.message === 'Database query timed out') {
            console.error('Products fetch timed out.');
            return res.status(504).json({ error: 'Database timeout' });
        }
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'Product not found' });
            throw error;
        }
        res.json(data);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create product
app.post('/api/products', async (req, res) => {
    const { 
        name, brand, type, size, price, oldPrice, discount, isNew, isFeatured,
        image, category, gender, description, sku, stock,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, shop_id
    } = req.body;

    try {
        const { data, error } = await supabase
            .from('products')
            .insert([{
                name,
                brand,
                type,
                size,
                price,
                old_price: oldPrice,
                discount,
                is_new: isNew,
                is_featured: isFeatured,
                image,
                category,
                gender,
                description,
                sku,
                stock: stock !== undefined ? stock : 10,
                notes: notes || [],
                vibes: vibes || [],
                occasions: occasions || [],
                reason: reason || null,
                seasons: seasons || [],
                top_notes: topNotes || null,
                middle_notes: middleNotes || null,
                base_notes: baseNotes || null,
                shop_id: shop_id || null
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ id: data[0].id, message: 'Product created successfully' });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        name, brand, type, size, price, oldPrice, discount, isNew, isFeatured,
        image, category, gender, description, sku, stock,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, shop_id
    } = req.body;

    try {
        const { data, error } = await supabase
            .from('products')
            .update({
                name,
                brand,
                type,
                size,
                price,
                old_price: oldPrice,
                discount,
                is_new: isNew,
                is_featured: isFeatured,
                image,
                category,
                gender,
                description,
                sku,
                stock: stock !== undefined ? stock : 10,
                notes: notes || undefined,
                vibes: vibes || undefined,
                occasions: occasions || undefined,
                reason: reason !== undefined ? reason : undefined,
                seasons: seasons || undefined,
                top_notes: topNotes !== undefined ? topNotes : undefined,
                middle_notes: middleNotes !== undefined ? middleNotes : undefined,
                base_notes: baseNotes !== undefined ? baseNotes : undefined,
                shop_id: shop_id !== undefined ? shop_id : undefined
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product (Soft Delete / Archive)
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Fetch the product first
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') return res.status(404).json({ error: 'Product not found' });
            throw fetchError;
        }

        // 2. Backup the product
        const { error: backupError } = await supabase
            .from('backups')
            .insert([{
                table_name: 'products',
                record_id: id.toString(),
                data: product,
                deleted_at: new Date().toISOString()
            }]);

        if (backupError) {
            console.error('Backup failed for product deletion:', backupError);
            // We proceed anyway to ensure functionality, but log it
        }

        // 3. Delete from original table
        const { error: deleteError, count } = await supabase
            .from('products')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (deleteError) throw deleteError;
        if (count === 0) return res.status(404).json({ error: 'Product not found' });
        
        res.json({ message: 'Product archived and deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get coupons
app.get('/api/coupons', async (req, res) => {
    try {
        const query = supabase
            .from('coupons')
            .select('*');

        const { data, error } = await withTimeout(query);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        if (error.message === 'Database query timed out') {
            console.error('Coupons fetch timed out.');
            return res.status(504).json({ error: 'Database timeout' });
        }
        console.error('Error fetching coupons:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create coupon
app.post('/api/coupons', async (req, res) => {
    const { 
        code, discountType, discountValue, isActive, 
        expiryDate, usageLimit, usageCount, usedBy 
    } = req.body;
    try {
        const { data, error } = await supabase
            .from('coupons')
            .insert([{
                code: code.toUpperCase(),
                discount_percentage: discountType === 'percentage' ? discountValue : 0,
                is_active: isActive,
                discount_type: discountType || 'percentage',
                discount_value: discountValue,
                expiry_date: expiryDate,
                usage_limit: usageLimit || 1000,
                usage_count: usageCount || 0,
                used_by: usedBy || []
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ id: data[0].id, message: 'Coupon created successfully' });
    } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update coupon
app.put('/api/coupons/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        code, discountType, discountValue, isActive,
        expiryDate, usageLimit, usageCount, usedBy 
    } = req.body;
    try {
        const { data, error } = await supabase
            .from('coupons')
            .update({
                code: code ? code.toUpperCase() : undefined,
                discount_percentage: discountType === 'percentage' ? discountValue : undefined,
                is_active: isActive,
                discount_type: discountType || undefined,
                discount_value: discountValue !== undefined ? discountValue : undefined,
                expiry_date: expiryDate || undefined,
                usage_limit: usageLimit !== undefined ? usageLimit : undefined,
                usage_count: usageCount !== undefined ? usageCount : undefined,
                used_by: usedBy || undefined
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ error: 'Coupon not found' });
        res.json({ message: 'Coupon updated successfully' });
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete coupon (Soft Delete / Archive)
app.delete('/api/coupons/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Fetch the coupon first
        const { data: coupon, error: fetchError } = await supabase
            .from('coupons')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') return res.status(404).json({ error: 'Coupon not found' });
            throw fetchError;
        }

        // 2. Backup the coupon
        const { error: backupError } = await supabase
            .from('backups')
            .insert([{
                table_name: 'coupons',
                record_id: id.toString(),
                data: coupon,
                deleted_at: new Date().toISOString()
            }]);

        if (backupError) {
            console.error('Backup failed for coupon deletion:', backupError);
        }

        // 3. Delete from original table
        const { error: deleteError, count } = await supabase
            .from('coupons')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (deleteError) throw deleteError;
        if (count === 0) return res.status(404).json({ error: 'Coupon not found' });
        
        res.json({ message: 'Coupon archived and deleted successfully' });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Recovery / Backups Routes

// Get all backups
app.get('/api/backups', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('backups')
            .select('*')
            .order('deleted_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching backups:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Restore from backup
app.post('/api/backups/:id/restore', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Get the backup record
        const { data: backup, error: fetchError } = await supabase
            .from('backups')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!backup) return res.status(404).json({ error: 'Backup not found' });

        const { table_name, data: recordData } = backup;
        console.log(`Restoring record to table: ${table_name}`, recordData.id || recordData.code);

        // 2. Insert back into original table
        // We use upsert to handle cases where the ID might still exist or if we want to ensure it's restored correctly
        const { error: restoreError } = await supabase
            .from(table_name)
            .upsert([recordData]);

        if (restoreError) {
            console.error(`Error during upsert to ${table_name}:`, restoreError);
            throw restoreError;
        }

        // 3. Delete from backups
        const { error: deleteBackupError } = await supabase
            .from('backups')
            .delete()
            .eq('id', id);

        if (deleteBackupError) {
            console.error('Error deleting from backups table:', deleteBackupError);
            throw deleteBackupError;
        }

        console.log(`Successfully restored ${table_name} record.`);
        res.json({ message: 'Successfully restored from backup' });
    } catch (error) {
        console.error('CRITICAL: Error restoring from backup:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message || error });
    }
});

// Permanent Delete from backup
app.delete('/api/backups/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error, count } = await supabase
            .from('backups')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) throw error;
        if (count === 0) return res.status(404).json({ error: 'Backup record not found' });

        res.json({ message: 'Record permanently deleted from backups' });
    } catch (error) {
        console.error('Error in permanent delete:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all orders (for Admin / Vendor)
app.get('/api/orders', async (req, res) => {
    try {
        let query = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (req.query.shop_id) {
            query = query.contains('shop_ids', [req.query.shop_id]);
        }

        const { data, error } = await withTimeout(query);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        if (error.message === 'Database query timed out') {
            console.error('Orders fetch timed out.');
            return res.status(504).json({ error: 'Database timeout' });
        }
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update order status
app.put('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Auth Routes

// Register
app.post('/api/auth/register', async (req, res) => {
    console.log('--- SIGNUP REQUEST RECEIVED ---');
    console.log('Body:', req.body);
    const { name, email, password, role } = req.body;
    try {
        const { data, error } = await supabase
            .from('customers')
            .insert([{ name, email, password, role: role || 'customer' }])
            .select();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
            throw error;
        }
        res.status(201).json({ user: data[0], message: 'Registration successful' });
    } catch (error) {
        console.error('Error registering customer:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            code: error.code 
        });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(401).json({ error: 'Invalid email or password' });
            throw error;
        }
        res.json({ user: data, message: 'Login successful' });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create order
app.post('/api/orders', async (req, res) => {
    const { customerName, email, phone, total, shippingAddress, paymentMethod, items } = req.body;
    
    // Extract unique shop_ids from items (assuming item.product.shop_id or item.shop_id exists)
    const shopIdsSet = new Set();
    if (items && Array.isArray(items)) {
        items.forEach(item => {
            const shopId = item.shop_id || (item.product && item.product.shop_id);
            if (shopId) shopIdsSet.add(shopId);
        });
    }
    const shop_ids = Array.from(shopIdsSet);

    try {
        const { data, error } = await supabase
            .from('orders')
            .insert([{
                customer_name: customerName,
                email,
                phone,
                total,
                shipping_address: shippingAddress,
                payment_method: paymentMethod,
                items,
                shop_ids: shop_ids
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ id: data[0].id, message: 'Order created successfully' });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User Profile fetch to get fresh roles/shop details
app.get('/api/users/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*, shops:shop_id(*)')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        
        // Remove password before sending
        if (data && data.password) delete data.password;
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --------------------------------------------------------------------------
// Shops / Vendor API Routes
// --------------------------------------------------------------------------

// Get all shops (public route optionally supports status=active)
app.get('/api/shops', async (req, res) => {
    try {
        let query = supabase.from('shops').select('*, customers!shops_owner_id_fkey(name, email)');
        
        if (req.query.status) {
            query = query.eq('status', req.query.status);
        }

        const { data, error } = await withTimeout(query);
        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching shops:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register a shop
app.post('/api/shops', async (req, res) => {
    const { owner_id, name, address, latitude, longitude, logo_url, images } = req.body;
    try {
        // Create shop with pending status
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .insert([{ owner_id, name, address, latitude, longitude, logo_url, images: images || [], status: 'pending' }])
            .select()
            .single();

        if (shopError) throw shopError;

        // Optionally link back to customer
        await supabase
            .from('customers')
            .update({ shop_id: shop.id })
            .eq('id', owner_id);

        res.status(201).json({ shop, message: 'Shop application submitted' });
    } catch (error) {
        console.error('Error creating shop:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a complete Vendor + Shop (Admin or Guest self-registration)
app.post('/api/shops/manual', async (req, res) => {
    const { ownerName, ownerEmail, ownerPassword, shopName, address, latitude, longitude, images, adminCreated } = req.body;
    
    // If admin created: role=vendor, status=active
    // If guest self-registration: role=customer (upgraded on approval), status=pending
    const userRole = adminCreated ? 'vendor' : 'customer';
    const shopStatus = adminCreated ? 'active' : 'pending';

    try {
        // 1. Create the user
        const { data: user, error: userError } = await supabase
            .from('customers')
            .insert([{ name: ownerName, email: ownerEmail, password: ownerPassword, role: userRole }])
            .select()
            .single();

        if (userError) throw userError;

        // 2. Create the shop
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .insert([{ 
                owner_id: user.id, 
                name: shopName, 
                address: address, 
                latitude: latitude, 
                longitude: longitude, 
                images: images || [],
                status: shopStatus 
            }])
            .select()
            .single();

        if (shopError) throw shopError;

        // 3. Update user with shop_id
        await supabase
            .from('customers')
            .update({ shop_id: shop.id })
            .eq('id', user.id);

        res.status(201).json({ message: adminCreated ? 'Vendor added successfully' : 'Vendor request submitted', shop });
    } catch (error) {
        if (error.code === '23505') { // Unique violation usually email
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Update a shop (User settings or Admin Approval)
app.put('/api/shops/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, latitude, longitude, logo_url, images, status } = req.body;
    try {
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (address !== undefined) updateData.address = address;
        if (latitude !== undefined) updateData.latitude = latitude;
        if (longitude !== undefined) updateData.longitude = longitude;
        if (logo_url !== undefined) updateData.logo_url = logo_url;
        if (images !== undefined) updateData.images = images;
        if (status !== undefined) updateData.status = status; // Typically only admin changes this

        const { data, error } = await supabase
            .from('shops')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        
        // If status changed to active, ensure owner has role='vendor'
        if (status === 'active' && data.owner_id) {
            await supabase
                .from('customers')
                .update({ role: 'vendor' })
                .eq('id', data.owner_id);
        } else if (status === 'suspended' || status === 'rejected') {
            await supabase
                .from('customers')
                .update({ role: 'customer' })
                .eq('id', data.owner_id);
        }

        res.json({ shop: data, message: 'Shop updated successfully' });
    } catch (error) {
        console.error('Error updating shop:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a shop (Admin only)
app.delete('/api/shops/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Get shop to find owner
        const { data: shop, error: fetchError } = await supabase
            .from('shops')
            .select('owner_id')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // Delete the shop
        const { error: deleteError } = await supabase
            .from('shops')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // Reset owner role to customer
        if (shop.owner_id) {
            await supabase
                .from('customers')
                .update({ role: 'customer', shop_id: null })
                .eq('id', shop.owner_id);
        }

        res.json({ message: 'Shop deleted successfully' });
    } catch (error) {
        console.error('Error deleting shop:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check database connection on startup
(async () => {
    try {
        const { data, error } = await supabase.from('products').select('id').limit(1);
        if (error && error.code !== 'PGRST116') throw error;
        console.log('Supabase connection successful.');
    } catch (error) {
        console.error('*** WARNING: Supabase connection failed. Backend running in limited mode. ***');
        console.error('Error details:', error.message);
    }
})();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Frontend should be available at http://localhost:5173`);
});

// Keep process alive if app.listen fails to do so for some reason (debug)
setInterval(() => {}, 1000000);

export { app };
