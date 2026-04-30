import React, { createContext, useState, useEffect, useContext } from 'react';
import { mockProducts } from '../data/mockData';
import { AuthContext } from './AuthContext';
import api from '../utils/api_v1_0_2';

export const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
    const { user, isVendor } = useContext(AuthContext);

    // Initial products start with mock data, then fetch fresh from DB
    const [products, setProducts] = useState(mockProducts);
    const [loading, setLoading] = useState(true);
    const [backups, setBackups] = useState([]);
    const [discoverCampaigns, setDiscoverCampaigns] = useState([]);

    // Initial orders - Start empty and fetch from database
    const [orders, setOrders] = useState([]);

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
            let url = '/products';
            if (isVendor && user?.shop_id) {
                url += `?shop_id=${user.shop_id}`;
            }

            // Parallel fetch to gather products, inventory, and discover campaigns using standardized api instance
            const [productsRes, invRes, discRes] = await Promise.all([
                api.get(url),
                api.get('/inventory'),
                api.get('/discover').catch(() => ({ data: [] }))
            ]);
            
            const data = productsRes.data;
            const invData = invRes.data;
            const discData = discRes.data;

            setDiscoverCampaigns(discData);

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
                    
                    // Calculate price & stock from inventory
                    const productInventories = inventoryByProduct[p.id] || [];
                    let lowestPrice = p.price || 0; // API fallback
                    let totalStock = p.stock || 0;
                    let activeInventories = [];

                    if (productInventories.length > 0) {
                        activeInventories = productInventories.filter(i => i.is_active);
                        if (activeInventories.length > 0) {
                            lowestPrice = Math.min(...activeInventories.map(i => i.price));
                            totalStock = activeInventories.reduce((acc, i) => acc + i.stock, 0);
                        }
                    }

                    return {
                        ...p,
                        image: images,
                        price: lowestPrice,
                        stock: totalStock,
                        inventories: activeInventories,
                        oldPrice: p.old_price,
                        type: p.type,
                        isNew: p.is_new,
                        isFeatured: p.is_featured,
                        notes: typeof p.notes === 'string' ? JSON.parse(p.notes || '[]') : (p.notes || []),
                        vibes: typeof p.vibes === 'string' ? JSON.parse(p.vibes || '[]') : (p.vibes || []),
                        occasions: typeof p.occasions === 'string' ? JSON.parse(p.occasions || '[]') : (p.occasions || []),
                        seasons: typeof p.seasons === 'string' ? JSON.parse(p.seasons || '[]') : (p.seasons || []),
                        topNotes: p.top_notes,
                        middleNotes: p.middle_notes,
                        baseNotes: p.base_notes
                    };
                });

                setProducts(prevProducts => {
                    const now = Date.now();
                    const serverIds = new Set(mappedProducts.map(p => p.id));
                    
                    const merged = mappedProducts.map(serverProd => {
                        const localProd = prevProducts.find(p => p.id === serverProd.id);
                        if (localProd && localProd._lastModified && (now - localProd._lastModified < 5000)) {
                            return localProd;
                        }
                        return serverProd;
                    });

                    const localOnly = prevProducts.filter(p => {
                        const isOnServer = serverIds.has(p.id);
                        const isFresh = p._lastModified && (now - p._lastModified < 10000);
                        return !isOnServer && isFresh;
                    });

                    const finalProducts = [...localOnly, ...merged].sort((a, b) => (b.id || 0) - (a.id || 0));
                    return finalProducts;
                });
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            // We keep current products (mockData) on error
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
            const data = response.data;
            if (Array.isArray(data)) {
                // Map snake_case to camelCase
                const mappedOrders = data.map(o => ({
                    ...o,
                    customerName: o.customer_name,
                    shippingAddress: o.shipping_address,
                    paymentMethod: o.payment_method,
                    date: o.created_at ? o.created_at.split('T')[0] : 'N/A',
                    items: typeof o.items === 'string' ? JSON.parse(o.items || '[]') : o.items
                }));
                setOrders(mappedOrders);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const fetchCoupons = async () => {
        try {
            const response = await api.get('/coupons');
            const data = response.data;
            if (Array.isArray(data)) {
                // Map Supabase snake_case to frontend camelCase
                const mappedCoupons = data.map(c => ({
                    id: c.id,
                    code: c.code,
                    discountType: c.discount_type || 'percentage',
                    discountValue: c.discount_value || c.discount_percentage,
                    expiryDate: c.expiry_date || '2026-12-31',
                    isActive: c.is_active,
                    usageCount: c.usage_count || 0,
                    usageLimit: c.usage_limit || 1000,
                    usedBy: c.used_by || [],
                    usedByPhones: c.used_by_phones || [],
                    usedByIPs: c.used_by_ips || []
                }));
                setCoupons(mappedCoupons);
            }
        } catch (error) {
            console.error('Error fetching coupons:', error);
        }
    };

    const fetchBackups = async () => {
        try {
            const response = await api.get('/backups');
            setBackups(response.data);
        } catch (error) {
            console.error('Error fetching backups:', error);
        }
    };

    useEffect(() => {
        // Debounce slightly to wait for auth state on mount
        const timer = setTimeout(() => {
            fetchProducts();
            fetchOrders();
            fetchCoupons();
            fetchBackups();
        }, 100);
        return () => clearTimeout(timer);
    }, [isVendor, user?.shop_id]);

    useEffect(() => {
        localStorage.setItem('perfumehub_products', JSON.stringify(products));
    }, [products]);

    useEffect(() => {
        localStorage.setItem('perfumehub_orders', JSON.stringify(orders));
    }, [orders]);

    useEffect(() => {
        localStorage.setItem('perfumehub_coupons', JSON.stringify(coupons));
    }, [coupons]);

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
        // Optimistic update
        const previousProducts = [...products];
        const now = Date.now();
        setProducts(prevProducts => prevProducts.map(p => p.id === id ? { ...updatedProduct, id, _lastModified: now } : p));

        try {
            await api.put(`/products/${id}`, updatedProduct);
            showToast('Product updated successfully', 'success');
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
    const mensProducts = safeProducts.filter(p => p?.gender === 'men');
    const womensProducts = safeProducts.filter(p => p?.gender === 'women');

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
        mensProducts,
        womensProducts,
        discoverCampaigns,
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
