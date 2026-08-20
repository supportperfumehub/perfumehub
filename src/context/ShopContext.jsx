import React, { createContext, useState, useEffect, useContext } from 'react';
import { mockProducts } from '../data/mockData';
import { AuthContext } from './AuthContext';
import { RegionContext } from './RegionContext';
import api from '../utils/api_v1_0_2';

export const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
    const { user, isVendor, loading: authLoading, isAdmin, isAuthenticated } = useContext(AuthContext);
    const { activeRegion } = useContext(RegionContext);

    // Initialize products from cache to enable instant loading
    const [products, setProducts] = useState(() => {
        const saved = localStorage.getItem('perfumehub_products');
        return saved ? JSON.parse(saved) : [];
    });
    const [loading, setLoading] = useState(() => {
        const saved = localStorage.getItem('perfumehub_products');
        return saved ? false : true;
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

    // Initialize orders from cache to enable instant loading
    const [orders, setOrders] = useState(() => {
        const saved = localStorage.getItem('perfumehub_orders');
        return saved ? JSON.parse(saved) : [];
    });

    const [coupons, setCoupons] = useState(() => {
        const savedCoupons = localStorage.getItem('perfumehub_coupons');
        return savedCoupons ? JSON.parse(savedCoupons) : [
            { id: 1, code: 'WELCOME10', discountType: 'percentage', discountValue: 10, expiryDate: '2026-12-31', isActive: true, usageCount: 0, usageLimit: 100, usedBy: [] },
            { id: 2, code: 'FREESHIP', discountType: 'percentage', discountValue: 5, expiryDate: '2026-06-30', isActive: true, usageCount: 0, usageLimit: 50, usedBy: [] },
            { id: 3, code: 'SUPER90', discountType: 'percentage', discountValue: 90, expiryDate: '2027-12-31', isActive: true, usageCount: 0, usageLimit: 10, usedBy: [] }
        ];
    });

    // Toast state
    const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

    // Fetch products from database
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const cacheBuster = Date.now();
            let url = `/products?_t=${cacheBuster}`;
            let params = {};
            if (isVendor && user?.shop_id) {
                params.shop_id = user.shop_id;
            } else if (activeRegion) {
                params.region_id = activeRegion.id;
            }

            const invUrl = activeRegion 
                ? `/inventory?region_id=${activeRegion.id}&_t=${cacheBuster}` 
                : `/inventory?_t=${cacheBuster}`;

            // Parallel fetch to gather products and inventory with explicit cache-busting
            const [productsRes, invRes] = await Promise.all([
                api.get(url, { params, headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }),
                api.get(invUrl, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } })
            ]);
            
            const data = productsRes.data;
            const invData = invRes.data;

            // Group inventory by product_id
            const inventoryByProduct = {};
            if (Array.isArray(invData)) {
                invData.forEach(inv => {
                    if (!inventoryByProduct[inv.product_id]) inventoryByProduct[inv.product_id] = [];
                    inventoryByProduct[inv.product_id].push(inv);
                });
            }

            if (Array.isArray(data)) {
                // Map snake_case to camelCase and handle JSON fields
                const mappedProducts = data.map(p => {
                    let images = [];
                    if (Array.isArray(p.image)) {
                        images = p.image.map(img => typeof img === 'string' ? img.trim() : img).filter(img => img);
                    } else if (typeof p.image === 'string') {
                        images = [p.image.trim()];
                    }
                    
                    // Master price and stock from product catalog row
                    const productInventories = inventoryByProduct[p.id] || [];
                    const activeInventories = productInventories.filter(i => i.is_active);
                    const calculatedMasterStock = activeInventories.length > 0
                        ? activeInventories.reduce((acc, i) => acc + (Number(i.stock) || 0), 0)
                        : (p.stock !== undefined ? Number(p.stock) : 0);

                    return {
                        ...p,
                        image: images,
                        price: p.price !== undefined ? Number(p.price) : 0,
                        stock: calculatedMasterStock,
                        inventories: activeInventories,
                        oldPrice: p.old_price !== null && p.old_price !== undefined ? Number(p.old_price) : null,
                        type: p.type,
                        isNew: p.is_new,
                        isFeatured: p.is_featured,
                        notes: typeof p.notes === 'string' ? JSON.parse(p.notes || '[]') : (p.notes || []),
                        vibes: typeof p.vibes === 'string' ? JSON.parse(p.vibes || '[]') : (p.vibes || []),
                        occasions: typeof p.occasions === 'string' ? JSON.parse(p.occasions || '[]') : (p.occasions || []),
                        seasons: typeof p.seasons === 'string' ? JSON.parse(p.seasons || '[]') : (p.seasons || []),
                        topNotes: p.top_notes,
                        middleNotes: p.middle_notes,
                        baseNotes: p.base_notes,
                        attributes: typeof p.attributes === 'string' ? JSON.parse(p.attributes || '{}') : (p.attributes || {})
                    };
                });

                const sortedProducts = mappedProducts.sort((a, b) => (b.id || 0) - (a.id || 0));
                setProducts(sortedProducts);
                localStorage.setItem('perfumehub_products', JSON.stringify(sortedProducts));
            }
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
            const url = activeRegion ? `/shops?region_id=${activeRegion.id}&_t=${Date.now()}` : `/shops?_t=${Date.now()}`;
            const response = await api.get(url, { headers: { 'Cache-Control': 'no-cache' } });
            if (Array.isArray(response.data)) {
                setShops(response.data);
            }
        } catch (error) {
            console.error('Error fetching shops:', error);
        }
    };

    const fetchDiscoverCampaigns = async () => {
        try {
            const response = await api.get(`/discover?_t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
            if (Array.isArray(response.data)) {
                setDiscoverCampaigns(response.data);
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
        return () => clearTimeout(timer);
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
        localStorage.setItem('perfumehub_products', JSON.stringify(products));
    }, [products]);

    useEffect(() => {
        localStorage.setItem('perfumehub_orders', JSON.stringify(orders));
    }, [orders]);

    useEffect(() => {
        localStorage.setItem('perfumehub_coupons', JSON.stringify(coupons));
    }, [coupons]);

    useEffect(() => {
        localStorage.setItem('perfumehub_discover_campaigns', JSON.stringify(discoverCampaigns));
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
        // Optimistic update
        const tempId = Date.now();
        const optimizedProduct = { 
            ...product, 
            id: tempId, 
            created_at: new Date().toISOString(),
            _lastModified: Date.now() 
        };
        setProducts(prevProducts => [optimizedProduct, ...prevProducts]);

        try {
            const response = await api.post('/products', product);
            
            if (response.data) {
                // Replace temp ID with real ID from backend
                setProducts(prevProducts => prevProducts.map(p => p.id === tempId ? { ...p, id: response.data.id } : p));
                showToast('Product added successfully', 'success');
            }
        } catch (error) {
            showToast(`Failed to save: ${error.response?.data?.error || error.message}`, 'error');
            console.error('Save failed:', error);
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
            const targetShopId = (isVendor && user?.shop_id) 
                ? user.shop_id 
                : (updatedProduct.shop_id && updatedProduct.shop_id !== 'core' && updatedProduct.shop_id !== 'all' && updatedProduct.shop_id !== 'own' ? updatedProduct.shop_id : null);
            
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
            showToast(`Failed: ${error.response?.data?.error || error.message}`, 'error');
            return false;
        }
    };

    const deleteProduct = async (id) => {
        if (!id) {
            console.error('deleteProduct called without ID');
            return;
        }

        // Optimistic update
        const previousProducts = [...products];
        setProducts(prevProducts => prevProducts.filter(p => p.id.toString() !== id.toString()));

        try {
            await api.delete(`/products/${id}`);
            showToast('Product archived successfully', 'success');
            await fetchBackups();
        } catch (error) {
            setProducts(previousProducts);
            showToast('Failed to delete: ' + (error.response?.data?.error || error.message), 'error');
            console.error('Delete error:', error);
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
    const fashionProducts = safeProducts.filter(p => Array.isArray(p?.category) && p.category.includes('fashion'));
    const jewelleryProducts = safeProducts.filter(p => Array.isArray(p?.category) && p.category.includes('jewellery'));
    const giftBoxProducts = safeProducts.filter(p => Array.isArray(p?.category) && (p.category.includes('giftbox') || p.category.includes('gift-box')));
    const perfumeProducts = safeProducts.filter(p => {
        const cats = Array.isArray(p?.category) ? p.category : [];
        return !cats.includes('fashion') && !cats.includes('jewellery') && !cats.includes('giftbox') && !cats.includes('gift-box');
    });

    // Order Functions
    const updateOrderStatus = async (orderId, status) => {
        setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status } : o));

        try {
            const numericId = typeof orderId === 'string' && orderId.startsWith('ORD-') ? orderId.replace('ORD-', '') : orderId;
            await api.put(`/orders/${numericId}/status`, { status });
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

    const incrementCouponUsage = async (code, email = null, phone = null, ip = null) => {
        const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
        if (!coupon) return;

        const updatedCoupon = {
            ...coupon,
            usageCount: (coupon.usageCount || 0) + 1,
            usedBy: email && !coupon.usedBy?.includes(email.toLowerCase()) ? [...(coupon.usedBy || []), email.toLowerCase()] : coupon.usedBy,
            usedByPhones: phone && !coupon.usedByPhones?.includes(phone.trim()) ? [...(coupon.usedByPhones || []), phone.trim()] : coupon.usedByPhones,
            usedByIPs: ip && !coupon.usedByIPs?.includes(ip) ? [...(coupon.usedByIPs || []), ip] : coupon.usedByIPs
        };

        setCoupons(prev => prev.map(c => c.id === coupon.id ? updatedCoupon : c));

        try {
            await api.put(`/coupons/${coupon.id}`, {
                usage_count: updatedCoupon.usageCount,
                used_by: updatedCoupon.usedBy,
                used_by_phones: updatedCoupon.usedByPhones,
                used_by_ips: updatedCoupon.usedByIPs
            });
        } catch (error) {
            console.error('Error incrementing coupon usage:', error);
        }
    };

    const placeOrder = async (product, quantity, customerName = 'Guest Customer', isGiftWrapped = false, shippingAddress = null, paymentMethod = 'Not Specified', email = '', phone = '', selectedSize = null, selectedPrice = null, fulfillmentType = 'delivery', pickupShopId = null) => {
        try {
            const basePrice = selectedPrice !== null ? parseFloat(selectedPrice) : parseFloat(product.price);
            const giftWrapCost = isGiftWrapped ? 10 : 0;
            const itemPrice = basePrice + giftWrapCost;
            const total = itemPrice * quantity;
            const sizeToUse = selectedSize || (Array.isArray(product.size) ? (typeof product.size[0] === 'object' ? product.size[0].name : product.size[0]) : product.size);
            
            let stockShopId = fulfillmentType === 'pickup' ? pickupShopId : product.shop_id;

            const orderItems = [{
                productId: product.id,
                product_id: product.id,
                shop_id: stockShopId,
                name: product.name,
                brand: product.brand,
                quantity: quantity,
                price: itemPrice,
                isGiftWrapped: isGiftWrapped,
                size: sizeToUse
            }];

            const orderPayload = {
                customerName,
                email,
                phone,
                total,
                shippingAddress,
                paymentMethod,
                items: orderItems,
                fulfillment_type: fulfillmentType,
                pickup_shop_id: fulfillmentType === 'pickup' ? pickupShopId : null,
                shop_id: stockShopId
            };

            const orderRes = await api.post('/orders', orderPayload);

            if (orderRes.data) {
                const generatedOrderId = `ORD-${orderRes.data.id}`;
                if (fulfillmentType === 'delivery') {
                     setProducts(products.map(p => p.id === product.id ? { ...p, stock: p.stock - quantity } : p));
                }
                const newOrder = {
                    id: generatedOrderId,
                    customerName,
                    email,
                    phone,
                    date: new Date().toISOString().split('T')[0],
                    total,
                    status: 'Pending',
                    items: orderItems,
                    shippingAddress,
                    paymentMethod
                };
                setOrders(prevOrders => [...prevOrders, newOrder]);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Place order failed:', error);
            return false;
        }
    };

    const value = {
        products,
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
        orders,
        updateOrderStatus,
        placeOrder,
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
