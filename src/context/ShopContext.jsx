import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { mockProducts } from '../data/mockData';
import { AuthContext } from './AuthContext';
import { RegionContext } from './RegionContext';
import api from '../utils/api_v1_0_2';

export const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
    const { user, isVendor, loading: authLoading, isAdmin, isAuthenticated } = useContext(AuthContext);
    const { activeRegion } = useContext(RegionContext);
    const deletedProductIdsRef = useRef(new Set());

    // Safe helper to parse JSON or fallback cleanly without throwing
    const safeJsonParse = (val, fallback) => {
        if (!val) return fallback;
        if (typeof val !== 'string') return val;
        try {
            return JSON.parse(val);
        } catch (_) {
            if (Array.isArray(fallback)) {
                return val.split(',').map(s => s.trim()).filter(Boolean);
            }
            return fallback;
        }
    };

    // Initialize products from cache to enable instant loading safely
    const [products, setProducts] = useState(() => {
        try {
            const saved = localStorage.getItem('perfumehub_products');
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('Corrupt perfumehub_products cache, clearing:', e);
            try { localStorage.removeItem('perfumehub_products'); } catch (_) {}
            return [];
        }
    });
    const [loading, setLoading] = useState(() => {
        try {
            const saved = localStorage.getItem('perfumehub_products');
            return !saved;
        } catch (e) {
            return true;
        }
    });
    const [backups, setBackups] = useState([]);
    const [discoverCampaigns, setDiscoverCampaigns] = useState(() => {
        try {
            const saved = localStorage.getItem('perfumehub_discover_campaigns');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });
    const [shops, setShops] = useState([]);

    // In-memory orders for authenticated customer (Zero localStorage leakage of PII)
    const [orders, setOrders] = useState([]);

    const [coupons, setCoupons] = useState([
        { id: 1, code: 'WELCOME10', discountType: 'percentage', discountValue: 10, expiryDate: '2026-12-31', isActive: true, usageCount: 0, usageLimit: 100 },
        { id: 2, code: 'FREESHIP', discountType: 'percentage', discountValue: 5, expiryDate: '2026-06-30', isActive: true, usageCount: 0, usageLimit: 50 },
        { id: 3, code: 'SUPER90', discountType: 'percentage', discountValue: 90, expiryDate: '2027-12-31', isActive: true, usageCount: 0, usageLimit: 10 }
    ]);

    // Server-side pagination metadata
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 24,
        total: 0,
        totalPages: 1,
        hasMore: false
    });

    // Toast state
    const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

    // Fetch products from database (Supports server-side pagination & Edge CDN caching)
    const fetchProducts = async (options = {}) => {
        try {
            setLoading(true);

            const {
                page = 1,
                limit = 100,
                gender,
                category,
                brand,
                search,
                min_price,
                max_price,
                sort,
                shop_id,
                append = false
            } = options;

            const params = { page, limit };
            if (gender && gender !== 'all') params.gender = gender;
            if (category && category !== 'all') params.category = category;
            if (brand) params.brand = brand;
            if (search) params.search = search;
            if (min_price) params.min_price = min_price;
            if (max_price) params.max_price = max_price;
            if (sort && sort !== 'default') params.sort = sort;
            if (shop_id) params.shop_id = shop_id;

            const response = await api.get('/products', { params });
            const rawData = response.data;
            const rawProducts = Array.isArray(rawData) ? rawData : (rawData?.products || []);
            const pageMeta = rawData?.pagination || {
                page,
                limit,
                total: rawProducts.length,
                totalPages: Math.ceil(rawProducts.length / limit) || 1,
                hasMore: rawProducts.length >= limit
            };

            const mappedProducts = rawProducts.map(p => {
                let images = [];
                if (Array.isArray(p.image)) {
                    images = p.image.map(img => typeof img === 'string' ? img.trim() : img).filter(Boolean);
                } else if (typeof p.image === 'string' && p.image) {
                    images = [p.image.trim()];
                }

                return {
                    ...p,
                    image: images,
                    price: Number(p.price) || 0,
                    stock: p.stock !== undefined ? Number(p.stock) : 10,
                    oldPrice: p.old_price !== null && p.old_price !== undefined ? Number(p.old_price) : (p.oldPrice ? Number(p.oldPrice) : null),
                    type: p.type,
                    isNew: p.is_new ?? p.isNew ?? false,
                    isFeatured: p.is_featured ?? p.isFeatured ?? false,
                    notes: safeJsonParse(p.notes, []),
                    vibes: safeJsonParse(p.vibes, []),
                    occasions: safeJsonParse(p.occasions, []),
                    seasons: safeJsonParse(p.seasons, []),
                    topNotes: p.topNotes || p.top_notes || '',
                    middleNotes: p.middleNotes || p.middle_notes || '',
                    baseNotes: p.baseNotes || p.base_notes || '',
                    attributes: safeJsonParse(p.attributes, {}),
                    shop_id: p.shop_id || null,
                    inventories: Array.isArray(p.inventories) ? p.inventories : []
                };
            });

            // Filter out any products locally deleted in this session
            const freshProducts = mappedProducts.filter(p => !deletedProductIdsRef.current.has(String(p.id)));

            if (append) {
                setProducts(prev => {
                    const existingIds = new Set(prev.map(i => i.id));
                    const filteredNew = freshProducts.filter(i => !existingIds.has(i.id));
                    const combined = [...prev, ...filteredNew].filter(p => !deletedProductIdsRef.current.has(String(p.id)));
                    try {
                        localStorage.setItem('perfumehub_products', JSON.stringify(combined));
                    } catch (_) {}
                    return combined;
                });
            } else {
                setProducts(freshProducts);
                try {
                    localStorage.setItem('perfumehub_products', JSON.stringify(freshProducts));
                } catch (_) {}
            }

            setPagination(pageMeta);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        try {
            let url = '/orders';
            if (isVendor && user?.shop_id) {
                url += `?shop_id=${user.shop_id}`;
            }

            const response = await api.get(url);
            if (Array.isArray(response.data)) {
                setOrders(response.data);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const fetchCoupons = async () => {
        try {
            const response = await api.get(`/coupons?_t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
            if (Array.isArray(response.data)) {
                const mappedCoupons = response.data.map(c => ({
                    id: c.id,
                    code: c.code,
                    discountType: c.discount_type,
                    discountValue: Number(c.discount_value),
                    expiryDate: c.expiry_date ? c.expiry_date.split('T')[0] : '',
                    isActive: c.is_active,
                    usageCount: c.usage_count || 0,
                    usageLimit: c.usage_limit || 100,
                    usedBy: c.used_by || []
                }));
                setCoupons(mappedCoupons);
            }
        } catch (error) {
            console.error('Error fetching coupons:', error);
        }
    };

    const fetchBackups = async () => {
        try {
            const response = await api.get(`/backups?_t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
            setBackups(response.data);
        } catch (error) {
            console.error('Error fetching backups:', error);
        }
    };

    const fetchShops = async () => {
        try {
            const url = activeRegion?.id ? `/shops?region_id=${activeRegion.id}` : '/shops';
            const response = await api.get(url);
            let shopList = response.data;
            if ((!Array.isArray(shopList) || shopList.length === 0) && activeRegion?.id) {
                try {
                    const fallbackRes = await api.get('/shops');
                    if (Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
                        shopList = fallbackRes.data;
                    }
                } catch (fbErr) {
                    console.error('Fallback shops fetch error:', fbErr);
                }
            }
            if (Array.isArray(shopList)) {
                setShops(shopList);
            }
        } catch (error) {
            console.error('Error fetching shops:', error);
        }
    };

    const fetchDiscoverCampaigns = async () => {
        try {
            const regionParam = activeRegion?.id ? `?region_id=${activeRegion.id}` : '';
            const response = await api.get(`/discover${regionParam}`);
            let list = response.data;
            if ((!Array.isArray(list) || list.length === 0) && activeRegion?.id) {
                try {
                    const fallbackRes = await api.get('/discover');
                    if (Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
                        list = fallbackRes.data;
                    }
                } catch (fbErr) {
                    console.error('Fallback discover fetch error:', fbErr);
                }
            }
            if (Array.isArray(list)) {
                setDiscoverCampaigns(list);
            }
        } catch (error) {
            console.error('Error fetching discover campaigns:', error);
        }
    };

    // Fetch products, shops, and discover campaigns immediately and in parallel, regardless of auth loading state
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts();
            fetchShops();
            fetchDiscoverCampaigns();
        }, 100);

        // Hard safety net: if loading is still true after 10s (API timeout/down),
        // force it to false so pages stop showing skeleton and show empty/cached state
        const loadingKillSwitch = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn('[ShopContext] Loading kill-switch fired — API took too long, forcing loading=false');
                    return false;
                }
                return prev;
            });
        }, 10000);

        return () => {
            clearTimeout(timer);
            clearTimeout(loadingKillSwitch);
        };
    }, [isVendor, user?.shop_id, activeRegion]);

    // Fetch user orders when authentication is active
    useEffect(() => {
        if (isAuthenticated) {
            fetchOrders();
        }
    }, [isAuthenticated, isVendor, user?.shop_id]);

    // Fetch administrative catalog components
    useEffect(() => {
        if (isAdmin) {
            fetchCoupons();
            fetchBackups();
        }
    }, [isAdmin]);

    useEffect(() => {
        try {
            localStorage.setItem('perfumehub_products', JSON.stringify(products));
        } catch (_) {}
    }, [products]);

    useEffect(() => {
        // Zero-trust hygiene: purge any historic client-side order cache from localStorage
        try {
            localStorage.removeItem('perfumehub_orders');
            localStorage.removeItem('perfumehub_coupons');
        } catch (e) {}
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('perfumehub_discover_campaigns', JSON.stringify(discoverCampaigns));
        } catch (_) {}
    }, [discoverCampaigns]);

    // Toast Function
    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
        // Auto-hide after 3 seconds
        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, 3000);
    };

    // Product Functions
    const addProduct = async (product) => {
        // Optimistic update with boutique inventory binding
        const tempId = Date.now();
        const optimizedProduct = { 
            ...product, 
            id: tempId, 
            created_at: new Date().toISOString(),
            _lastModified: Date.now(),
            shop_id: product.shop_id || null,
            inventories: product.shop_id ? [{
                id: `temp_inv_${tempId}`,
                product_id: tempId,
                shop_id: product.shop_id,
                price: Number(product.price) || 0,
                stock: product.stock !== undefined ? Number(product.stock) : 10,
                is_active: true,
                pickup_available: product.pickup_available !== false
            }] : []
        };
        setProducts(prevProducts => [optimizedProduct, ...prevProducts]);

        try {
            const response = await api.post('/products', product);
            
            if (response.data) {
                const newId = response.data.id || response.data.product?.id || tempId;
                const backendProd = response.data.product || {};
                
                setProducts(prevProducts => prevProducts.map(p => {
                    if (p.id === tempId) {
                        return {
                            ...optimizedProduct,
                            ...backendProd,
                            id: newId,
                            shop_id: product.shop_id || backendProd.shop_id || null,
                            inventories: (backendProd.inventories && backendProd.inventories.length > 0)
                                ? backendProd.inventories
                                : optimizedProduct.inventories
                        };
                    }
                    return p;
                }));

                showToast('Product added successfully', 'success');
                // Refresh catalog with higher limit to ensure full synchronization without discarding memory state
                await fetchProducts({ limit: 100 });
                return newId;
            }
        } catch (error) {
            setProducts(prevProducts => prevProducts.filter(p => p.id !== tempId));
            showToast(`Failed to save: ${error.response?.data?.error || error.message}`, 'error');
            console.error('Save failed:', error);
            return false;
        }
    };

    const updateProduct = async (id, updatedProduct) => {
        const previousProducts = [...products];
        const updatedList = products.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    ...updatedProduct,
                    id,
                    price: updatedProduct.price !== undefined ? Number(updatedProduct.price) : p.price,
                    oldPrice: updatedProduct.oldPrice !== undefined ? (updatedProduct.oldPrice ? Number(updatedProduct.oldPrice) : null) : p.oldPrice,
                    discount: updatedProduct.discount !== undefined ? Number(updatedProduct.discount) : p.discount,
                    stock: updatedProduct.stock !== undefined ? Number(updatedProduct.stock) : p.stock
                };
            }
            return p;
        });
        setProducts(updatedList);
        localStorage.setItem('perfumehub_products', JSON.stringify(updatedList));

        try {
            const product = products.find(p => p.id === id);
            const targetShopId = (updatedProduct.shop_id && updatedProduct.shop_id !== 'core' && updatedProduct.shop_id !== 'all' && updatedProduct.shop_id !== 'own') 
                ? updatedProduct.shop_id 
                : (isVendor && user?.shop_id ? user.shop_id : null);
            
            const targetInventory = targetShopId 
                ? product?.inventories?.find(inv => String(inv.shop_id) === String(targetShopId)) 
                : null;

            if (targetInventory) {
                await api.put(`/inventory/${targetInventory.id}`, {
                    price: Number(updatedProduct.price),
                    stock: Number(updatedProduct.stock),
                    is_active: updatedProduct.is_active !== undefined ? updatedProduct.is_active : true,
                    pickup_available: updatedProduct.pickup_available !== undefined ? updatedProduct.pickup_available : true
                });
                if (!isVendor) {
                    await api.put(`/products/${id}`, updatedProduct);
                }
                showToast('Shop inventory updated successfully', 'success');
            } else if (targetShopId) {
                await api.post('/inventory', {
                    product_id: id,
                    shop_id: targetShopId,
                    price: Number(updatedProduct.price),
                    stock: Number(updatedProduct.stock),
                    is_active: true,
                    pickup_available: true
                });
                if (!isVendor) {
                    await api.put(`/products/${id}`, updatedProduct);
                }
                showToast('Shop inventory created and updated successfully', 'success');
            } else {
                await api.put(`/products/${id}`, updatedProduct);
                showToast('Product updated successfully', 'success');
            }
            await fetchProducts(); // refresh products to pull new inventory values with cache buster
        } catch (error) {
            setProducts(previousProducts);
            showToast(`Update failed: ${error.response?.data?.error || error.message}`, 'error');
        }
    };

    const addInventory = async (payload) => {
        try {
            await api.post('/inventory', payload);
            showToast('Inventory bound successfully', 'success');
            await fetchProducts(); // refresh products to pull new bindings
            return true;
        } catch (error) {
            showToast(`Failed: ${error.response?.data?.error || error.response?.data?.message || error.message}`, 'error');
            return false;
        }
    };

    const deleteInventory = async (inventoryId) => {
        try {
            const res = await api.delete(`/inventory/${inventoryId}`);
            showToast(res.data?.message || 'Inventory item removed successfully', 'success');

            // Optimistically update products state to remove inventory
            setProducts(prev => {
                const updated = prev.map(p => {
                    if (p.inventories && p.inventories.some(inv => String(inv.id) === String(inventoryId))) {
                        return {
                            ...p,
                            inventories: p.inventories.filter(inv => String(inv.id) !== String(inventoryId))
                        };
                    }
                    return p;
                });
                try {
                    localStorage.setItem('perfumehub_products', JSON.stringify(updated));
                } catch (_) {}
                return updated;
            });

            await fetchProducts();
            return true;
        } catch (error) {
            showToast(`Failed: ${error.response?.data?.error || error.response?.data?.message || error.message}`, 'error');
            return false;
        }
    };

    const deleteProduct = async (id, options = {}) => {
        if (!id) {
            console.error('deleteProduct called without ID');
            return false;
        }

        const shopIdParam = options?.shop_id || (typeof options === 'string' ? options : null);
        const url = shopIdParam ? `/products/${id}?shop_id=${encodeURIComponent(shopIdParam)}` : `/products/${id}`;

        // Mark ID as deleted immediately so no concurrent refresh re-adds it
        deletedProductIdsRef.current.add(String(id));

        // Optimistic update & localStorage update
        const previousProducts = [...products];
        setProducts(prevProducts => {
            const next = prevProducts.map(p => {
                if (String(p.id) === String(id)) {
                    if (shopIdParam) {
                        const isOwn = String(p.shop_id) === String(shopIdParam);
                        const updatedInvs = (p.inventories || []).filter(inv => String(inv.shop_id) !== String(shopIdParam));
                        if (isOwn || updatedInvs.length === 0) return null;
                        return { ...p, inventories: updatedInvs };
                    }
                    return null;
                }
                return p;
            }).filter(Boolean);

            try {
                localStorage.setItem('perfumehub_products', JSON.stringify(next));
            } catch (_) {}
            return next;
        });

        try {
            const res = await api.delete(url);
            const msg = res.data?.message || (shopIdParam ? 'Product removed from boutique inventory' : 'Product deleted successfully');
            showToast(msg, 'success');
            await fetchProducts();
            await fetchBackups();
            return true;
        } catch (error) {
            deletedProductIdsRef.current.delete(String(id));
            setProducts(previousProducts);
            try {
                localStorage.setItem('perfumehub_products', JSON.stringify(previousProducts));
            } catch (_) {}
            showToast('Failed to delete: ' + (error.response?.data?.error || error.message), 'error');
            console.error('Delete error:', error);
            return false;
        }
    };

    const restoreItem = async (backupId) => {
        const backupToRestore = backups.find(b => b.id === backupId);
        if (!backupToRestore) return false;

        const previousBackups = [...backups];
        const previousProducts = [...products];
        const previousCoupons = [...coupons];

        // Optimistic UI Update
        setBackups(prev => prev.filter(b => b.id !== backupId));
        if (backupToRestore.table_name === 'products') {
            setProducts(prev => [...prev, { ...backupToRestore.data, _lastModified: Date.now() }]);
        } else if (backupToRestore.table_name === 'coupons') {
            setCoupons(prev => [...prev, backupToRestore.data]);
        }

        try {
            await api.post(`/backups/${backupId}/restore`);
            showToast('Item restored successfully', 'success');
            fetchBackups();
            fetchProducts();
            fetchCoupons();
            return true;
        } catch (error) {
            setBackups(previousBackups);
            setProducts(previousProducts);
            setCoupons(previousCoupons);
            showToast('Failed to restore item', 'error');
            return false;
        }
    };

    const permanentlyDeleteBackup = async (backupId) => {
        const previousBackups = [...backups];
        setBackups(prev => prev.filter(b => b.id !== backupId));

        try {
            await api.delete(`/backups/${backupId}`);
            showToast('Item permanently deleted', 'success');
            fetchBackups();
            return true;
        } catch (error) {
            setBackups(previousBackups);
            showToast('Failed to delete backup', 'error');
            return false;
        }
    };

    // Products categorization
    const safeProducts = Array.isArray(products) ? products : [];
    const featuredProducts = safeProducts.filter(p => p?.isFeatured);
    const newArrivals = safeProducts.filter(p => p?.isNew);

    const FASHION_TAGS = ['fashion', 'abaya', 'clothing', 'apparel', 'accessories', 'bags', 'bag', 'shoes', 'eyewear'];
    const JEWELLERY_TAGS = ['jewellery', 'jewelry', 'watches', 'watch', 'rings', 'ring', 'necklaces', 'necklace', 'earrings', 'earring', 'bracelets', 'bracelet'];
    const GIFTBOX_TAGS = ['giftbox', 'gift-box', 'gift box', 'gifts', 'gift'];

    const getProductCats = (p) => {
        if (!p?.category) return [];
        if (Array.isArray(p.category)) return p.category.map(c => String(c).toLowerCase().trim());
        if (typeof p.category === 'string') {
            try {
                const parsed = JSON.parse(p.category);
                if (Array.isArray(parsed)) return parsed.map(c => String(c).toLowerCase().trim());
            } catch (e) {}
            return [p.category.toLowerCase().trim()];
        }
        return [];
    };

    const fashionProducts = safeProducts.filter(p => {
        const cats = getProductCats(p);
        return cats.some(c => FASHION_TAGS.includes(c)) || p?.gender === 'fashion';
    });
    const jewelleryProducts = safeProducts.filter(p => {
        const cats = getProductCats(p);
        return cats.some(c => JEWELLERY_TAGS.includes(c));
    });
    const giftBoxProducts = safeProducts.filter(p => {
        const cats = getProductCats(p);
        return cats.some(c => GIFTBOX_TAGS.includes(c));
    });
    const perfumeProducts = safeProducts.filter(p => {
        const cats = getProductCats(p);
        return !cats.some(c => FASHION_TAGS.includes(c)) &&
               !cats.some(c => JEWELLERY_TAGS.includes(c)) &&
               !cats.some(c => GIFTBOX_TAGS.includes(c));
    });

    // Order Functions
    const updateOrderStatus = async (orderId, status, extra = {}) => {
        setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status } : o));

        try {
            const numericId = typeof orderId === 'string' && orderId.startsWith('ORD-') ? orderId.replace('ORD-', '') : orderId;
            const res = await api.put(`/orders/${numericId}/status`, { status, ...extra });
            if (res.data?.evaluated_master_status) {
                setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status: res.data.evaluated_master_status } : o));
            }
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    // Coupon Functions
    const addCoupon = async (coupon) => {
        const tempId = Date.now();
        setCoupons(prev => [...prev, { ...coupon, id: tempId }]);

        try {
            await api.post('/coupons', coupon);
            await fetchCoupons();
        } catch (error) {
            console.error('Error adding coupon:', error);
        }
    };

    const updateCoupon = async (id, updatedCoupon) => {
        setCoupons(prev => prev.map(c => c.id === id ? { ...updatedCoupon, id } : c));
        try {
            await api.put(`/coupons/${id}`, updatedCoupon);
            await fetchCoupons();
        } catch (error) {
            console.error('Error updating coupon:', error);
        }
    };

    const deleteCoupon = async (id) => {
        if (!id) return;
        const previousCoupons = [...coupons];
        setCoupons(prev => prev.filter(c => c.id.toString() !== id.toString()));

        try {
            await api.delete(`/coupons/${id}`);
            showToast('Coupon archived successfully', 'success');
            await fetchBackups();
        } catch (error) {
            setCoupons(previousCoupons);
            showToast('Failed to delete coupon', 'error');
        }
    };

    // Dedicated backend-verified coupon validation (Zero PII leakage)
    const validateCoupon = async (code, subtotal = 0, email = '', phone = '') => {
        try {
            const res = await api.post('/coupons/validate', {
                code: (code || '').trim(),
                subtotal: parseFloat(subtotal) || 0,
                email: (email || '').trim(),
                phone: (phone || '').trim()
            });
            return res.data;
        } catch (error) {
            return {
                valid: false,
                error: error.response?.data?.error || 'Invalid or expired coupon'
            };
        }
    };

    // No-op for client-side coupon increment: Backend handles atomic increment in POST /api/orders
    const incrementCouponUsage = async () => {
        // Handled atomically on backend inside POST /api/orders
    };

    // Consolidated Order Placement (Submits one single master order payload to backend)
    const placeConsolidatedOrder = async ({
        customerName = 'Guest Customer',
        email = '',
        phone = '',
        shippingAddress = null,
        paymentMethod = 'Cash on Delivery',
        items = [],
        fulfillmentType = 'delivery',
        pickupShopId = null,
        couponCode = null,
        total = 0
    }) => {
        try {
            const orderPayload = {
                customerName,
                email,
                phone,
                total: parseFloat(total),
                shippingAddress: fulfillmentType === 'pickup' ? null : shippingAddress,
                paymentMethod,
                items,
                fulfillment_type: fulfillmentType,
                pickup_shop_id: fulfillmentType === 'pickup' ? pickupShopId : null,
                couponCode: couponCode || null
            };

            const orderRes = await api.post('/orders', orderPayload);
            if (orderRes.data && orderRes.data.id) {
                const generatedOrderId = `ORD-${orderRes.data.id}`;
                const newOrder = {
                    id: orderRes.data.id,
                    order_id: generatedOrderId,
                    customer_name: customerName,
                    email,
                    phone,
                    date: new Date().toISOString().split('T')[0],
                    total,
                    status: fulfillmentType === 'pickup' ? 'reserved' : 'pending',
                    items,
                    shipping_address: shippingAddress,
                    payment_method: paymentMethod,
                    fulfillment_type: fulfillmentType,
                    pickup_shop_id: pickupShopId
                };
                setOrders(prev => [newOrder, ...prev]);
                return { success: true, orderId: generatedOrderId, id: orderRes.data.id };
            }
            return { success: false, error: 'Failed to create order' };
        } catch (error) {
            console.error('Place consolidated order failed:', error);
            return { 
                success: false, 
                error: error.response?.data?.error || error.message || 'Order placement failed' 
            };
        }
    };

    // Backward-compatible single item order placement
    const placeOrder = async (product, quantity, customerName = 'Guest Customer', isGiftWrapped = false, shippingAddress = null, paymentMethod = 'Not Specified', email = '', phone = '', selectedSize = null, selectedPrice = null, fulfillmentType = 'delivery', pickupShopId = null, couponCode = null) => {
        const basePrice = selectedPrice !== null ? parseFloat(selectedPrice) : parseFloat(product.price);
        const giftWrapCost = isGiftWrapped ? 10 : 0;
        const itemPrice = basePrice + giftWrapCost;
        const total = itemPrice * quantity;
        const sizeToUse = selectedSize || (Array.isArray(product.size) ? (typeof product.size[0] === 'object' ? product.size[0].name : product.size[0]) : product.size);
        const stockShopId = fulfillmentType === 'pickup' ? pickupShopId : (product.shop_id || pickupShopId);

        const res = await placeConsolidatedOrder({
            customerName,
            email,
            phone,
            shippingAddress,
            paymentMethod,
            items: [{
                id: product.id,
                product_id: product.id,
                shop_id: stockShopId,
                name: product.name,
                brand: product.brand,
                quantity,
                price: itemPrice,
                selectedPrice: basePrice,
                isGiftWrapped,
                size: sizeToUse
            }],
            fulfillmentType,
            pickupShopId,
            couponCode,
            total
        });
        return res.success;
    };

    const value = {
        products,
        pagination,
        fetchProducts,
        loading,
        featuredProducts,
        newArrivals,
        fashionProducts,
        jewelleryProducts,
        giftBoxProducts,
        perfumeProducts,
        discoverCampaigns,
        shops,
        addProduct,
        updateProduct,
        deleteProduct,
        addInventory,
        deleteInventory,
        orders,
        updateOrderStatus,
        placeOrder,
        placeConsolidatedOrder,
        validateCoupon,
        coupons,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        fetchCoupons,
        incrementCouponUsage,
        toast,
        showToast,
        backups,
        fetchBackups,
        restoreItem,
        permanentlyDeleteBackup
    };

    return (
        <ShopContext.Provider value={value}>
            {children}
        </ShopContext.Provider>
    );
};
