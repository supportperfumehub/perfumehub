import React, { createContext, useState, useEffect, useContext } from 'react';
import { mockProducts } from '../data/mockData';
import { AuthContext } from './AuthContext';

export const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
    const { user, isVendor } = useContext(AuthContext);

    // Initial products start with mock data, then fetch fresh from DB
    const [products, setProducts] = useState(mockProducts);
    const [loading, setLoading] = useState(true);
    const [backups, setBackups] = useState([]);

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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

        try {
            setLoading(true);
            let url = '/api/products';
            if (isVendor && user?.shop_id) {
                url += `?shop_id=${user.shop_id}`;
            }

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    // Map snake_case to camelCase and handle JSON fields
                    const mappedProducts = data.map(p => {
                        // Sanitize images: handle both single string and array, and trim whitespace
                        let images = [];
                        if (Array.isArray(p.image)) {
                            images = p.image.map(img => typeof img === 'string' ? img.trim() : img).filter(img => img);
                        } else if (typeof p.image === 'string') {
                            images = [p.image.trim()];
                        }

                        return {
                            ...p,
                            image: images,
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
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Fetch products timed out. Using mock data.');
            } else {
                console.error('Error fetching products:', error);
            }
            // We keep current products (mockData) on timeout/error
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        try {
            let url = '/api/orders';
            if (isVendor && user?.shop_id) {
                url += `?shop_id=${user.shop_id}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
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
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const fetchCoupons = async () => {
        try {
            const response = await fetch('/api/coupons');
            if (response.ok) {
                const data = await response.json();
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
            }
        } catch (error) {
            console.error('Error fetching coupons:', error);
        }
    };

    const fetchBackups = async () => {
        try {
            const response = await fetch('/api/backups');
            if (response.ok) {
                const data = await response.json();
                setBackups(data);
            }
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
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
            
            if (response.ok) {
                const data = await response.json();
                // Replace temp ID with real ID from backend
                setProducts(prevProducts => prevProducts.map(p => p.id === tempId ? { ...p, id: data.id } : p));
                showToast('Product added successfully', 'success');
            } else {
                const errorData = await response.json();
                showToast(`Failed to save to database: ${errorData.error || 'Server error'}`, 'error');
                console.error('Save failed:', errorData);
            }
        } catch (error) {
            showToast('Network error: Product saved locally but NOT in database!', 'error');
            console.error('Network error during addProduct:', error);
        }
    };

    const updateProduct = async (id, updatedProduct) => {
        // Optimistic update
        const previousProducts = [...products];
        const now = Date.now();
        setProducts(prevProducts => prevProducts.map(p => p.id === id ? { ...updatedProduct, id, _lastModified: now } : p));

        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProduct)
            });
            if (response.ok) {
                showToast('Product updated successfully', 'success');
            } else {
                const errorData = await response.json();
                showToast(`Update failed: ${errorData.error || 'Server error'}`, 'error');
            }
        } catch (error) {
            showToast('Network error: Changes saved locally only!', 'error');
            console.error('Network error during updateProduct:', error);
        }
    };

    const deleteProduct = async (id) => {
        if (!id) {
            console.error('deleteProduct called without ID');
            return;
        }

        // Optimistic update: use string conversion for robust ID comparison
        const previousProducts = [...products];
        setProducts(prevProducts => prevProducts.filter(p => p.id.toString() !== id.toString()));

        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                showToast('Product archived successfully', 'success');
                await fetchBackups();
            } else {
                setProducts(previousProducts);
                const errData = await response.json().catch(() => ({}));
                showToast(`Failed to delete: ${errData.error || 'Database error'}`, 'error');
            }
        } catch (error) {
            setProducts(previousProducts);
            showToast('Network error: Changes reverted!', 'error');
            console.error('Delete error:', error);
        }
    };

    const restoreItem = async (backupId) => {
        const backupToRestore = backups.find(b => b.id === backupId);
        if (!backupToRestore) return false;

        const previousBackups = [...backups];
        const previousProducts = [...products];
        const previousCoupons = [...coupons];

        // Optimistic UI Update: Move item from backups to its original collection
        setBackups(prev => prev.filter(b => b.id !== backupId));
        if (backupToRestore.table_name === 'products') {
            // Add to products with a fresh timestamp to satisfy the merge grace period
            setProducts(prev => [...prev, { ...backupToRestore.data, _lastModified: Date.now() }]);
        } else if (backupToRestore.table_name === 'coupons') {
            setCoupons(prev => [...prev, backupToRestore.data]);
        }

        try {
            const response = await fetch(`/api/backups/${backupId}/restore`, {
                method: 'POST'
            });
            
            if (response.ok) {
                showToast('Item restored successfully', 'success');
                // Background refresh for server-side consistency
                fetchBackups();
                fetchProducts();
                fetchCoupons();
                return true;
            } else {
                // Revert optimistic changes
                setBackups(previousBackups);
                setProducts(previousProducts);
                setCoupons(previousCoupons);
                showToast('Failed to restore item', 'error');
                return false;
            }
        } catch (error) {
            // Revert on network error
            setBackups(previousBackups);
            setProducts(previousProducts);
            setCoupons(previousCoupons);
            console.error('Error restoring item:', error);
            showToast('Network error while restoring', 'error');
            return false;
        }
    };

    const permanentlyDeleteBackup = async (backupId) => {
        const previousBackups = [...backups];
        
        // Optimistic delete
        setBackups(prev => prev.filter(b => b.id !== backupId));

        try {
            const response = await fetch(`/api/backups/${backupId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                showToast('Item permanently deleted', 'success');
                fetchBackups();
                return true;
            } else {
                setBackups(previousBackups);
                showToast('Failed to delete backup', 'error');
                return false;
            }
        } catch (error) {
            setBackups(previousBackups);
            console.error('Error deleting backup:', error);
            showToast('Network error while deleting archive', 'error');
            return false;
        }
    };

    // Products categorization for Home and Shop views
    const safeProducts = Array.isArray(products) ? products : [];
    const featuredProducts = safeProducts.filter(p => p?.isFeatured);
    const newArrivals = safeProducts.filter(p => p?.isNew);
    const mensProducts = safeProducts.filter(p => p?.gender === 'men');
    const womensProducts = safeProducts.filter(p => p?.gender === 'women');

    // Order Functions
    const updateOrderStatus = async (orderId, status) => {
        // Optimistic local update
        setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status } : o));

        try {
            const numericId = typeof orderId === 'string' && orderId.startsWith('ORD-') ? orderId.replace('ORD-', '') : orderId;
            
            if (!isNaN(numericId) && numericId !== orderId) { 
                 await fetch(`/api/orders/${numericId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
            } else if (typeof orderId === 'number' || !isNaN(orderId)) {
                await fetch(`/api/orders/${orderId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
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
            const response = await fetch('/api/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(coupon)
            });
            if (response.ok) {
                await fetchCoupons();
            }
        } catch (error) {
            console.error('Error adding coupon:', error);
        }
    };

    const updateCoupon = async (id, updatedCoupon) => {
        setCoupons(prev => prev.map(c => c.id === id ? { ...updatedCoupon, id } : c));

        try {
            const response = await fetch(`/api/coupons/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedCoupon)
            });
            if (response.ok) {
                await fetchCoupons();
            }
        } catch (error) {
            console.error('Error updating coupon:', error);
        }
    };

    const deleteCoupon = async (id) => {
        if (!id) return;
        const previousCoupons = [...coupons];
        setCoupons(prev => prev.filter(c => c.id.toString() !== id.toString()));

        try {
            const response = await fetch(`/api/coupons/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                showToast('Coupon archived successfully', 'success');
                await fetchBackups();
            } else {
                setCoupons(previousCoupons);
                showToast('Failed to delete coupon', 'error');
            }
        } catch (error) {
            setCoupons(previousCoupons);
            console.error('Error deleting coupon:', error);
            showToast('Network error: Changes reverted!', 'error');
        }
    };

    const incrementCouponUsage = async (code, email = null, phone = null, ip = null) => {
        const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
        if (!coupon) return;

        const usedBy = coupon.usedBy || [];
        const updatedUsedBy = email && !usedBy.includes(email.toLowerCase())
            ? [...usedBy, email.toLowerCase()]
            : usedBy;

        const usedByPhones = coupon.usedByPhones || [];
        const updatedUsedByPhones = phone && !usedByPhones.includes(phone.trim())
            ? [...usedByPhones, phone.trim()]
            : usedByPhones;

        const usedByIPs = coupon.usedByIPs || [];
        const updatedUsedByIPs = ip && !usedByIPs.includes(ip)
            ? [...usedByIPs, ip]
            : usedByIPs;

        const updatedCoupon = {
            ...coupon,
            usageCount: (coupon.usageCount || 0) + 1,
            usedBy: updatedUsedBy,
            usedByPhones: updatedUsedByPhones,
            usedByIPs: updatedUsedByIPs
        };

        setCoupons(prev => prev.map(c => c.id === coupon.id ? updatedCoupon : c));

        try {
            // Map camelCase back to snake_case for Supabase if needed
            const supabasePayload = {
                usage_count: updatedCoupon.usageCount,
                used_by: updatedCoupon.usedBy,
                used_by_phones: updatedCoupon.usedByPhones,
                used_by_ips: updatedCoupon.usedByIPs
            };

            await fetch(`/api/coupons/${coupon.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supabasePayload)
            });
        } catch (error) {
            console.error('Error incrementing coupon usage:', error);
        }
    };

    const placeOrder = async (product, quantity, customerName = 'Guest Customer', isGiftWrapped = false, shippingAddress = null, paymentMethod = 'Not Specified', email = '', phone = '', selectedSize = null, selectedPrice = null) => {
        try {
            const basePrice = selectedPrice !== null ? parseFloat(selectedPrice) : parseFloat(product.price);
            const giftWrapCost = isGiftWrapped ? 10 : 0;
            const itemPrice = basePrice + giftWrapCost;
            const total = itemPrice * quantity;
            
            // Use provided size, or fallback to first size in product array, or the product.size string itself
            const sizeToUse = selectedSize || (Array.isArray(product.size) ? product.size[0] : product.size);
            
            const orderItems = [
                {
                    productId: product.id,
                    name: product.name,
                    brand: product.brand,
                    quantity: quantity,
                    price: itemPrice,
                    isGiftWrapped: isGiftWrapped,
                    size: selectedSize || (Array.isArray(product.size) ? (typeof product.size[0] === 'object' ? product.size[0].name : product.size[0]) : product.size)
                }
            ];

            let orderId = `ORD-${Date.now()}`;

            try {
                const updatedStock = (product.stock !== undefined ? product.stock : 10) - quantity;
                const updatedProduct = { ...product, stock: updatedStock };

                const response = await fetch(`/api/products/${product.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedProduct)
                });

                if (response.ok) {
                    setProducts(products.map(p => p.id === product.id ? updatedProduct : p));

                    const orderPayload = {
                        customerName: customerName,
                        email: email,
                        phone: phone,
                        total: total,
                        shippingAddress: shippingAddress,
                        paymentMethod: paymentMethod,
                        items: orderItems
                    };

                    const orderRes = await fetch('/api/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderPayload)
                    });

                    if (orderRes.ok) {
                        const orderData = await orderRes.json();
                        orderId = `ORD-${orderData.id}`;
                    }
                }
            } catch (backendError) {
                // Fallback
            }

            const newOrder = {
                id: orderId,
                customerName: customerName,
                email: email,
                phone: phone,
                date: new Date().toISOString().split('T')[0],
                total: total,
                status: 'Pending',
                items: orderItems,
                shippingAddress: shippingAddress,
                paymentMethod: paymentMethod
            };

            setOrders(prevOrders => [...prevOrders, newOrder]);
            return true;
        } catch (error) {
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
        addProduct,
        updateProduct,
        deleteProduct,
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
