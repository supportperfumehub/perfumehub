import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get active discover campaigns (Zero N+1 Query Architecture, Edge CDN Cached)
router.get('/', async (req, res) => {
    // Edge CDN Caching: 30s browser, 120s edge, 10m stale-while-revalidate
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=600');

    try {
        const regionId = req.query.region_id ? parseInt(req.query.region_id, 10) : null;

        // 1. Primary Strategy: Single optimized PostgreSQL RPC query
        try {
            const { data: rpcSlides, error: rpcError } = await withTimeout(
                supabase.rpc('get_active_discovery_slides', { p_region_id: regionId })
            );

            if (!rpcError && Array.isArray(rpcSlides) && rpcSlides.length > 0) {
                return res.json(rpcSlides);
            }
        } catch (rpcErr) {
            // If RPC is not defined in DB, proceed to single-batch fallback
        }

        // 2. High-Performance Single-Batch Fallback (Zero N+1 Queries)
        const nowIso = new Date().toISOString();
        const { data: campaigns, error } = await withTimeout(supabase
            .from('discover_campaigns')
            .select(`
                *,
                shop:shops (
                    id, name, logo_url, trust_score, tier, geo_location, region_id
                ),
                product:products (
                    *
                )
            `)
            .eq('active', true)
            .gte('end_date', nowIso)
            .lte('start_date', nowIso)
            .order('created_at', { ascending: false }));

        if (error) throw error;

        const validCampaigns = (campaigns || []).filter(c => {
            if (!regionId) return true;
            const shopRegion = c.shop?.region_id ? Number(c.shop.region_id) : null;
            const campaignRegion = c.region_id ? Number(c.region_id) : null;
            if (shopRegion && shopRegion !== Number(regionId)) return false;
            if (campaignRegion && campaignRegion !== Number(regionId)) return false;
            return true;
        });

        if (validCampaigns.length === 0) {
            return res.json([]);
        }

        // Extract shop IDs for single batch inventory lookup
        const shopIds = [...new Set(validCampaigns.map(c => c.shop_id).filter(Boolean))];
        let inventoryLookup = {};
        let shopInventoryMap = {};

        if (shopIds.length > 0) {
            const { data: invRows } = await withTimeout(supabase
                .from('vendor_inventory')
                .select('shop_id, product_id, price, products (*)')
                .in('shop_id', shopIds)
                .eq('is_active', true));

            (invRows || []).forEach(row => {
                const key = `${row.shop_id}:${row.product_id}`;
                inventoryLookup[key] = row.price;

                if (!shopInventoryMap[row.shop_id]) {
                    shopInventoryMap[row.shop_id] = [];
                }
                if (shopInventoryMap[row.shop_id].length < 15 && row.products) {
                    shopInventoryMap[row.shop_id].push({
                        price: row.price,
                        product: row.products
                    });
                }
            });
        }

        const slides = [];
        for (const c of validCampaigns) {
            if (c.product_id && c.product) {
                let prodData = { ...c.product };
                if (c.shop_id) {
                    const priceKey = `${c.shop_id}:${c.product.id}`;
                    if (inventoryLookup[priceKey] !== undefined) {
                        prodData.price = inventoryLookup[priceKey];
                    }
                }
                slides.push({
                    id: `product-${c.product.id}-${c.id}`,
                    campaign_id: c.id,
                    product_id: c.product.id,
                    type: 'product',
                    placement_slot: c.placement_slot,
                    region_id: c.shop?.region_id || c.region_id || null,
                    product: prodData,
                    shop: c.shop
                });
            } else if (c.shop_id && c.shop) {
                const shopItems = shopInventoryMap[c.shop_id] || [];
                for (const item of shopItems) {
                    slides.push({
                        id: `shop-product-${item.product.id}-${c.id}`,
                        campaign_id: c.id,
                        product_id: item.product.id,
                        type: 'product',
                        placement_slot: c.placement_slot,
                        region_id: c.shop?.region_id || c.region_id || null,
                        product: {
                            ...item.product,
                            price: item.price
                        },
                        shop: c.shop
                    });
                }
            }
        }

        res.json(slides);
    } catch (error) {
        console.error('Error fetching discover campaigns:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new discover campaign (Super Admin Only)
router.post('/', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { shop_id, placement_slot, start_date, end_date } = req.body;

    if (!shop_id || !placement_slot || !end_date) {
        return res.status(400).json({ error: 'Missing required campaign parameters.' });
    }

    try {
        const { data, error } = await supabase
            .from('discover_campaigns')
            .insert([{
                shop_id,
                placement_slot,
                start_date: start_date || new Date().toISOString(),
                end_date,
                active: true
            }])
            .select();

        if (error) throw error;
        
        // Also automatically upgrade the shop's tier to 'premium' for the duration
        await supabase.from('shops').update({ tier: 'premium' }).eq('id', shop_id);

        res.status(201).json({ id: data[0].id, message: 'Discover campaign created successfully', campaign: data[0] });
    } catch (error) {
        console.error('Error creating discover campaign:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update or Disable a campaign
router.put('/:id', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { active, placement_slot, end_date } = req.body;

    try {
        const { data, error } = await supabase
            .from('discover_campaigns')
            .update({
                active: active !== undefined ? active : undefined,
                placement_slot: placement_slot !== undefined ? placement_slot : undefined,
                end_date: end_date !== undefined ? end_date : undefined
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ message: 'Campaign updated successfully', campaign: data[0] });
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
