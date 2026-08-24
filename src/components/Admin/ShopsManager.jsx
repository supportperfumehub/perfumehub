import React, { useState, useEffect, useContext, useMemo } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import { 
    CheckCircle, XCircle, Store, MapPin, Clock, Plus, Trash2, 
    Image, ChevronDown, ChevronUp, Package as PackageIcon, 
    ShoppingCart, DollarSign, Edit, BarChart3, X, Star, 
    Search, UserPlus, Check, Ban, RefreshCw
} from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';
import ProductManager from './ProductManager';
import api from '../../utils/api_v1_0_2';

export const isApprovedOrActive = (status) => {
    const s = (status || '').toUpperCase();
    return s === 'ACTIVE' || s === 'APPROVED';
};
export const isPending = (status) => (status || '').toUpperCase() === 'PENDING';
export const isSuspended = (status) => (status || '').toUpperCase() === 'SUSPENDED';
export const isRejected = (status) => (status || '').toUpperCase() === 'REJECTED';

const ShopsManager = ({ isRTL }) => {
    const { products, orders, showToast } = useContext(ShopContext);
    const { user } = useContext(AuthContext);
    const [shops, setShops] = useState([]);
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expandedShop, setExpandedShop] = useState(null);
    const [expandedTab, setExpandedTab] = useState('overview');
    const [editingShop, setEditingShop] = useState(null);
    const [editData, setEditData] = useState({});
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        shopName: '',
        address: '',
        whatsapp_number: '',
        region_id: ''
    });
    const [photoInputs, setPhotoInputs] = useState(['']);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showConfirm, setShowConfirm] = useState(false);
    const [shopToDelete, setShopToDelete] = useState(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchShopsAndRegions = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const [shopsRes, regionsRes] = await Promise.all([
                api.get('/shops'),
                api.get('/regions')
            ]);
            
            setShops(shopsRes.data || []);
            setRegions(regionsRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchShopsAndRegions();
        }
    }, [user?.id]);

    const updateShopStatus = async (id, status) => {
        try {
            let endpoint = `/shops/${id}/status`;
            let body = { status: status.toUpperCase() };

            if (status.toUpperCase() === 'REJECTED') {
                endpoint = `/shops/${id}/reject`;
                body = { rejection_reason: 'Administrative action' };
            }

            const response = await api.put(endpoint, body);

            if (response.data.success || response.data.id || response.data.shop) {
                await fetchShopsAndRegions();
                const normalized = status.toUpperCase();
                const successMsg = (normalized === 'ACTIVE' || normalized === 'APPROVED')
                    ? (isRTL ? 'تم تفعيل واعتماد المتجر بنجاح' : 'Shop approved and activated successfully')
                    : normalized === 'SUSPENDED'
                    ? (isRTL ? 'تم إيقاف المتجر بنجاح' : 'Shop suspended successfully')
                    : (isRTL ? 'تم رفض طلب المتجر' : 'Shop request rejected');
                showToast(successMsg, 'success');
            } else {
                showToast(response.data.error || (isRTL ? 'فشل تحديث حالة المتجر' : 'Failed to update shop status'), 'error');
            }
        } catch (error) {
            console.error('Error updating shop status:', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
            showToast(`${isRTL ? 'خطأ في الاتصال بالخادم' : 'Server connection error'}${errMsg ? `: ${errMsg}` : ''}`, 'error');
        }
    };

    const toggleShopRecommendation = async (id, currentIsRecommended) => {
        try {
            const response = await api.put(`/shops/${id}`, { is_recommended: !currentIsRecommended });
            if (response.data.success) {
                fetchShopsAndRegions();
                showToast(isRTL ? 'تم تحديث حالة التوصية بنجاح' : 'Recommendation status updated successfully', 'success');
            } else {
                showToast(response.data.error || (isRTL ? 'فشل تحديث حالة التوصية' : 'Failed to update recommendation status'), 'error');
            }
        } catch (error) {
            console.error('Error toggling shop recommendation:', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
            showToast(`${isRTL ? 'خطأ في الاتصال بالخادم' : 'Server connection error'}${errMsg ? `: ${errMsg}` : ''}`, 'error');
        }
    };

    const updateShopDetails = async (id) => {
        try {
            const response = await api.put(`/shops/${id}`, editData);
            if (response.data.success) {
                setEditingShop(null);
                fetchShopsAndRegions();
                showToast(isRTL ? 'تم تحديث بيانات المتجر' : 'Shop details updated', 'success');
            } else {
                showToast(`${isRTL ? 'فشل التحديث' : 'Failed to update'}: ${response.data.error || response.data.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error updating shop:', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
            showToast(`${isRTL ? 'خطأ في الاتصال بالخادم' : 'Server connection error'}${errMsg ? `: ${errMsg}` : ''}`, 'error');
        }
    };

    const deleteShop = async (id, shopName) => {
        setShopToDelete({ id, name: shopName });
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        if (!shopToDelete) return;
        try {
            const response = await api.delete(`/shops/${shopToDelete.id}`);
            if (response.data.success) {
                fetchShopsAndRegions();
                setShowConfirm(false);
                setShopToDelete(null);
                showToast(isRTL ? 'تم حذف المتجر بنجاح' : 'Shop deleted successfully', 'success');
            } else {
                showToast(`${isRTL ? 'فشل حذف المتجر' : 'Failed to delete shop'}: ${response.data.message || response.data.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting shop:', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
            showToast(`${isRTL ? 'خطأ في الاتصال بالخادم' : 'Server connection error'}${errMsg ? `: ${errMsg}` : ''}`, 'error');
        }
    };

    const getStatusBadge = (status) => {
        const s = (status || '').toUpperCase();
        if (s === 'ACTIVE' || s === 'APPROVED') {
            return (
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    color: '#4ade80',
                    whiteSpace: 'nowrap'
                }}>
                    <CheckCircle size={12} />
                    {isRTL ? 'نشط' : 'ACTIVE'}
                </span>
            );
        }
        if (s === 'PENDING') {
            return (
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    backgroundColor: 'rgba(234, 179, 8, 0.15)',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    color: '#facc15',
                    whiteSpace: 'nowrap'
                }}>
                    <Clock size={12} />
                    {isRTL ? 'طلب جديد' : 'NEW REQUEST'}
                </span>
            );
        }
        if (s === 'SUSPENDED') {
            return (
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    whiteSpace: 'nowrap'
                }}>
                    <Ban size={12} />
                    {isRTL ? 'موقوف' : 'SUSPENDED'}
                </span>
            );
        }
        if (s === 'REJECTED') {
            return (
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    backgroundColor: 'rgba(148, 163, 184, 0.15)',
                    border: '1px solid rgba(148, 163, 184, 0.4)',
                    color: '#94a3b8',
                    whiteSpace: 'nowrap'
                }}>
                    <XCircle size={12} />
                    {isRTL ? 'مرفوض' : 'REJECTED'}
                </span>
            );
        }
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '700',
                letterSpacing: '0.5px',
                backgroundColor: 'rgba(148, 163, 184, 0.15)',
                border: '1px solid rgba(148, 163, 184, 0.4)',
                color: '#94a3b8',
                whiteSpace: 'nowrap'
            }}>
                {s || 'UNKNOWN'}
            </span>
        );
    };

    const getShopAnalytics = (shop) => {
        const shopId = shop.id;
        const shopProducts = products.filter(p => 
            String(p.shop_id) === String(shopId) || 
            (p.inventories && p.inventories.some(inv => String(inv.shop_id) === String(shopId)))
        );
        const shopOrders = orders.filter(o => {
            if (o.shop_ids && Array.isArray(o.shop_ids) && o.shop_ids.includes(shopId)) return true;
            if (o.items && Array.isArray(o.items)) return o.items.some(item => item.shop_id === shopId);
            return false;
        });

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 2);
        threeMonthsAgo.setDate(1);

        const monthlySales = shopOrders
            .filter(o => {
                const d = new Date(o.created_at || o.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

        const quarterlySales = shopOrders
            .filter(o => new Date(o.created_at || o.date) >= threeMonthsAgo)
            .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

        const totalSales = shopOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
        const pendingOrders = shopOrders.filter(o => o.status?.toLowerCase() === 'pending').length;
        const deliveredOrders = shopOrders.filter(o => o.status?.toLowerCase() === 'delivered').length;

        const recentOrdersCount = shopOrders.filter(o => new Date(o.created_at || o.date) >= threeMonthsAgo).length;
        const lastUpdate = shop.updated_at ? new Date(shop.updated_at) : null;
        const isRecentlyInvolved = lastUpdate && (now - lastUpdate < 14 * 24 * 60 * 60 * 1000);

        let activityStatus = 'not active';
        if (recentOrdersCount >= 10 && isRecentlyInvolved) activityStatus = 'very active';
        else if (recentOrdersCount > 0 || isRecentlyInvolved) activityStatus = 'active';

        return { 
            shopProducts, shopOrders, totalSales, monthlySales, 
            quarterlySales, pendingOrders, deliveredOrders, 
            activityStatus, lastUpdate 
        };
    };

    const addPhotoInput = () => setPhotoInputs([...photoInputs, '']);
    const removePhotoInput = (index) => setPhotoInputs(photoInputs.filter((_, i) => i !== index));
    
    const handleImageUpload = (index, e, isEdit = false) => {
        try {
            const fileInput = e.target;
            const file = fileInput.files[0];
            if (file) {
                const objectUrl = URL.createObjectURL(file);
                const img = new window.Image();
                
                if (!window._activeImageRefs) {
                    window._activeImageRefs = new Set();
                }
                window._activeImageRefs.add(img);

                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                        if (isEdit) {
                            const updatedImages = [...(editData.images || [])];
                            if (index === -1) {
                                updatedImages.push(compressedBase64);
                            } else {
                                updatedImages[index] = compressedBase64;
                            }
                            setEditData({ ...editData, images: updatedImages });
                        } else {
                            const updated = [...photoInputs];
                            updated[index] = compressedBase64;
                            setPhotoInputs(updated);
                        }
                        
                        fileInput.value = '';
                        URL.revokeObjectURL(objectUrl);
                        window._activeImageRefs.delete(img);
                    } catch (loadErr) {
                        alert("Error during image load processing: " + loadErr.message);
                        fileInput.value = '';
                        URL.revokeObjectURL(objectUrl);
                        window._activeImageRefs.delete(img);
                    }
                };
                img.onerror = () => {
                    alert("Failed to load image object.");
                    fileInput.value = '';
                    URL.revokeObjectURL(objectUrl);
                    window._activeImageRefs.delete(img);
                };
                img.src = objectUrl;
            }
        } catch (err) {
            alert("Error in handleImageUpload: " + err.message);
        }
    };

    const handleAddShop = async (e) => {
        e.preventDefault();
        const images = photoInputs.filter(url => url.trim() !== '');
        try {
            const response = await api.post('/shops/manual', { ...formData, images, adminCreated: true });
            if (response.data.success) {
                setShowForm(false);
                setFormData({ ownerName: '', ownerEmail: '', ownerPassword: '', shopName: '', address: '', whatsapp_number: '', region_id: '' });
                setPhotoInputs(['']);
                fetchShopsAndRegions();
                showToast(isRTL ? 'تم إنشاء المتجر بنجاح' : 'Vendor created successfully', 'success');
            } else {
                showToast(`${isRTL ? 'فشل إنشاء المتجر' : 'Failed to create vendor'}: ${response.data.error || response.data.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error creating vendor:', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
            showToast(`${isRTL ? 'خطأ في الاتصال بالخادم' : 'Server connection error'}${errMsg ? `: ${errMsg}` : ''}`, 'error');
        }
    };

    const sortedShops = useMemo(() => {
        return [...shops].sort((a, b) => {
            const getPriority = (s) => {
                if (isPending(s?.status)) return 1;
                if (isSuspended(s?.status)) return 2;
                if (isRejected(s?.status)) return 3;
                if (isApprovedOrActive(s?.status)) return 4;
                return 5;
            };
            const pA = getPriority(a);
            const pB = getPriority(b);
            if (pA !== pB) return pA - pB;
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
    }, [shops]);

    const pendingShops = useMemo(() => sortedShops.filter(s => isPending(s.status)), [sortedShops]);
    const activeShops = useMemo(() => sortedShops.filter(s => isApprovedOrActive(s.status)), [sortedShops]);
    const suspendedShops = useMemo(() => sortedShops.filter(s => isSuspended(s.status)), [sortedShops]);

    const filteredShops = useMemo(() => {
        return sortedShops.filter(s => {
            if (statusFilter === 'pending' && !isPending(s.status)) return false;
            if (statusFilter === 'active' && !isApprovedOrActive(s.status)) return false;
            if (statusFilter === 'suspended' && !isSuspended(s.status)) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesName = s.name?.toLowerCase().includes(q);
                const matchesOwner = s.customers?.name?.toLowerCase().includes(q);
                const matchesEmail = s.customers?.email?.toLowerCase().includes(q);
                const matchesAddress = s.address?.toLowerCase().includes(q);
                const matchesPhone = s.whatsapp_number?.toLowerCase().includes(q);
                return matchesName || matchesOwner || matchesEmail || matchesAddress || matchesPhone;
            }
            return true;
        });
    }, [sortedShops, statusFilter, searchQuery]);

    if (loading) return <div className="text-center p-4" style={{ color: '#94a3b8' }}>Loading shops...</div>;

    const cardStyle = { background: '#1e293b', borderRadius: '12px', padding: isMobile ? '16px' : '24px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' };

    const renderActionButtons = (shop) => {
        const status = (shop.status || '').toUpperCase();
        const isActive = isApprovedOrActive(status);
        const isShopPending = isPending(status);
        const isShopSuspended = isSuspended(status);
        const isShopRejected = isRejected(status);

        return (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {user?.role === 'super_admin' && (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            toggleShopRecommendation(shop.id, shop.is_recommended); 
                        }} 
                        style={{ 
                            background: 'rgba(255, 255, 255, 0.04)', 
                            border: '1px solid rgba(255, 255, 255, 0.08)', 
                            padding: '6px 8px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            borderRadius: '8px',
                            transition: 'all 0.2s',
                            marginRight: isRTL ? '0' : '4px',
                            marginLeft: isRTL ? '4px' : '0'
                        }}
                        title={shop.is_recommended ? (isRTL ? 'إزالة من الموثوقة' : 'Remove from Trusted') : (isRTL ? 'إضافة إلى الموثوقة' : 'Add to Trusted')}
                    >
                        <Star 
                            size={16} 
                            fill={shop.is_recommended ? '#c8a951' : 'transparent'} 
                            color={shop.is_recommended ? '#c8a951' : '#94a3b8'} 
                            style={{ 
                                filter: shop.is_recommended ? 'drop-shadow(0 0 4px rgba(200,169,81,0.4))' : 'none'
                            }}
                        />
                    </button>
                )}

                {isActive && (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            updateShopStatus(shop.id, 'SUSPENDED'); 
                        }} 
                        style={{ 
                            background: 'rgba(239, 68, 68, 0.15)', 
                            color: '#f87171', 
                            border: '1px solid rgba(239, 68, 68, 0.4)', 
                            padding: '5px 12px', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            fontSize: '0.8rem', 
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                        }}
                        title={isRTL ? 'إيقاف المتجر' : 'Suspend Shop'}
                    >
                        <Ban size={14} />
                        {isRTL ? 'إيقاف' : 'Suspend'}
                    </button>
                )}

                {isShopSuspended && (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            updateShopStatus(shop.id, 'ACTIVE'); 
                        }} 
                        style={{ 
                            background: 'rgba(34, 197, 94, 0.15)', 
                            color: '#4ade80', 
                            border: '1px solid rgba(34, 197, 94, 0.4)', 
                            padding: '5px 12px', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            fontSize: '0.8rem', 
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                        }}
                        title={isRTL ? 'إعادة تفعيل المتجر' : 'Approve and Activate Shop'}
                    >
                        <Check size={14} />
                        {isRTL ? 'تفعيل' : 'Approve'}
                    </button>
                )}

                {isShopPending && (
                    <>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                updateShopStatus(shop.id, 'ACTIVE'); 
                            }} 
                            style={{ 
                                background: 'rgba(34, 197, 94, 0.15)', 
                                color: '#4ade80', 
                                border: '1px solid rgba(34, 197, 94, 0.4)', 
                                padding: '5px 12px', 
                                borderRadius: '6px', 
                                cursor: 'pointer', 
                                fontSize: '0.8rem', 
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Check size={14} />
                            {isRTL ? 'موافقة' : 'Approve'}
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                updateShopStatus(shop.id, 'REJECTED'); 
                            }} 
                            style={{ 
                                background: 'rgba(239, 68, 68, 0.12)', 
                                color: '#f87171', 
                                border: '1px solid rgba(239, 68, 68, 0.3)', 
                                padding: '5px 10px', 
                                borderRadius: '6px', 
                                cursor: 'pointer', 
                                fontSize: '0.8rem', 
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <X size={14} />
                            {isRTL ? 'رفض' : 'Reject'}
                        </button>
                    </>
                )}

                {isShopRejected && (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            updateShopStatus(shop.id, 'ACTIVE'); 
                        }} 
                        style={{ 
                            background: 'rgba(34, 197, 94, 0.15)', 
                            color: '#4ade80', 
                            border: '1px solid rgba(34, 197, 94, 0.4)', 
                            padding: '5px 12px', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            fontSize: '0.8rem', 
                            fontWeight: '600'
                        }}
                    >
                        {isRTL ? 'تفعيل' : 'Approve'}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="manager-content">
            <div className="manager-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2>{isRTL ? 'إدارة المتاجر والبائعين' : 'Shops & Vendors Management'}</h2>
                    <span style={{ 
                        background: 'rgba(200, 169, 81, 0.15)', 
                        border: '1px solid rgba(200, 169, 81, 0.3)', 
                        color: '#c8a951', 
                        padding: '3px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem', 
                        fontWeight: '700' 
                    }}>
                        {shops.length} {isRTL ? 'متجر' : 'Total'}
                    </span>
                </div>
                <div className="manager-header-actions" style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        className="btn btn-outline" 
                        onClick={fetchShopsAndRegions} 
                        style={{ height: '44px', padding: '0 14px', fontSize: '0.85rem' }}
                        title={isRTL ? 'تحديث' : 'Refresh'}
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button 
                        className={`btn ${showForm ? 'btn-outline' : 'btn-gold'}`} 
                        onClick={() => { setShowForm(!showForm); setPhotoInputs(['']); }} 
                        style={{ height: '44px', padding: '0 20px' }}
                    >
                        {showForm ? <X size={18} /> : <Plus size={18} />}
                        {showForm ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'إضافة متجر جديد' : 'Add New Vendor')}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div onClick={() => setStatusFilter('all')} style={{ background: statusFilter === 'all' ? 'rgba(200, 169, 81, 0.12)' : '#1e293b', border: statusFilter === 'all' ? '1px solid #c8a951' : '1px solid #334155', borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: '#c8a951' }}><Store size={22} /></div>
                    <div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f8fafc' }}>{shops.length}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isRTL ? 'جميع المتاجر' : 'All Vendors'}</div>
                    </div>
                </div>

                <div onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')} style={{ background: statusFilter === 'pending' ? 'rgba(234, 179, 8, 0.15)' : (pendingShops.length > 0 ? 'rgba(234, 179, 8, 0.08)' : '#1e293b'), border: statusFilter === 'pending' ? '1px solid #facc15' : (pendingShops.length > 0 ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid #334155'), borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: pendingShops.length > 0 ? '0 0 12px rgba(234, 179, 8, 0.15)' : 'none' }}>
                    <div style={{ color: '#facc15' }}><Clock size={22} /></div>
                    <div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#facc15' }}>{pendingShops.length}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isRTL ? 'طلبات الانضمام' : 'Join Requests'}</div>
                    </div>
                </div>

                <div onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')} style={{ background: statusFilter === 'active' ? 'rgba(34, 197, 94, 0.15)' : '#1e293b', border: statusFilter === 'active' ? '1px solid #4ade80' : '1px solid #334155', borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: '#4ade80' }}><CheckCircle size={22} /></div>
                    <div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#4ade80' }}>{activeShops.length}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isRTL ? 'المتاجر المعتمدة' : 'Active & Approved'}</div>
                    </div>
                </div>

                <div onClick={() => setStatusFilter(statusFilter === 'suspended' ? 'all' : 'suspended')} style={{ background: statusFilter === 'suspended' ? 'rgba(239, 68, 68, 0.15)' : '#1e293b', border: statusFilter === 'suspended' ? '1px solid #f87171' : '1px solid #334155', borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: '#f87171' }}><Ban size={22} /></div>
                    <div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f87171' }}>{suspendedShops.length}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isRTL ? 'المتاجر الموقوفة' : 'Suspended'}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', [isRTL ? 'right' : 'left']: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        type="text"
                        className="form-control"
                        style={{ paddingLeft: isRTL ? '12px' : '40px', paddingRight: isRTL ? '40px' : '12px', height: '42px', background: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                        placeholder={isRTL ? 'بحث باسم المتجر، المالك، البريد، أو الهاتف...' : 'Search by shop name, owner, email, or phone...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                        { key: 'all', label: isRTL ? 'الكل' : 'All', count: shops.length },
                        { key: 'pending', label: isRTL ? 'طلبات الانضمام' : 'Join Requests', count: pendingShops.length, highlight: pendingShops.length > 0 },
                        { key: 'active', label: isRTL ? 'المعتمدة والنشطة' : 'Active', count: activeShops.length },
                        { key: 'suspended', label: isRTL ? 'الموقوفة' : 'Suspended', count: suspendedShops.length }
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setStatusFilter(f.key)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: statusFilter === f.key ? '1px solid #c8a951' : '1px solid #334155',
                                background: statusFilter === f.key ? 'rgba(200, 169, 81, 0.15)' : '#1e293b',
                                color: statusFilter === f.key ? '#c8a951' : (f.highlight ? '#facc15' : '#cbd5e1'),
                                fontWeight: statusFilter === f.key ? '700' : '500',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            {f.label}
                            <span style={{
                                padding: '1px 6px',
                                borderRadius: '10px',
                                fontSize: '0.7rem',
                                background: f.highlight ? '#facc15' : '#334155',
                                color: f.highlight ? '#000' : '#cbd5e1',
                                fontWeight: '700'
                            }}>
                                {f.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {showForm && (
                <div style={{ ...cardStyle, marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '20px' }}>{isRTL ? 'إضافة متجر وبائع جديد' : 'Add New Vendor & Shop'}</h3>
                    <form onSubmit={handleAddShop}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '10px' : '15px', marginBottom: '15px' }}>
                            <div>
                                <label className="form-label">{isRTL ? 'اسم المالك' : 'Owner Name'}</label>
                                <input type="text" className="form-control" required value={formData.ownerName} onChange={(e) => setFormData({...formData, ownerName: e.target.value})} />
                            </div>
                            <div>
                                <label className="form-label">{isRTL ? 'البريد الإلكتروني' : 'Owner Email'}</label>
                                <input type="email" className="form-control" required value={formData.ownerEmail} onChange={(e) => setFormData({...formData, ownerEmail: e.target.value})} />
                            </div>
                            <div>
                                <label className="form-label">{isRTL ? 'كلمة المرور' : 'Password'}</label>
                                <input type="text" className="form-control" required value={formData.ownerPassword} onChange={(e) => setFormData({...formData, ownerPassword: e.target.value})} />
                            </div>
                            <div>
                                <label className="form-label">{isRTL ? 'اسم المتجر' : 'Shop Name'}</label>
                                <input type="text" className="form-control" required value={formData.shopName} onChange={(e) => setFormData({...formData, shopName: e.target.value})} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">{isRTL ? 'المنطقة' : 'Region (Optional)'}</label>
                                <select className="form-control" value={formData.region_id} onChange={(e) => setFormData({...formData, region_id: e.target.value})}>
                                    <option value="">{isRTL ? '-- لا يوجد منطقة محددة --' : '-- No Region Assigned --'}</option>
                                    {regions.filter(r => user?.role === 'super_admin' || user?.role === 'admin' || user?.assignedRegionIds?.includes(r.id)).map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                                </select>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">{isRTL ? 'العنوان' : 'Shop Address'}</label>
                                <input type="text" className="form-control" required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">{isRTL ? 'رقم الواتساب (مع رمز الدولة)' : 'WhatsApp Number (with country code)'}</label>
                                <input type="text" className="form-control" placeholder="+974..." value={formData.whatsapp_number} onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><Image size={16} /> {isRTL ? 'صور المتجر' : 'Shop Photos'}</label>
                                <button type="button" onClick={addPhotoInput} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px dashed #94a3b8', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem' }}><Plus size={14} /> {isRTL ? 'إضافة صورة' : 'Add Photo'}</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                                {photoInputs.map((url, index) => (
                                    <div key={index} style={{ position: 'relative', height: '100px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                        {url ? (
                                            <>
                                                <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button type="button" onClick={() => removePhotoInput(index)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(231, 76, 60, 0.8)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                                            </>
                                        ) : (
                                            <label style={{ textAlign: 'center', cursor: 'pointer', display: 'block' }} htmlFor={`new-shop-photo-${index}`}>
                                                <Image size={24} color="#334155" />
                                                <div style={{ fontSize: '0.65rem', color: '#444', marginTop: '4px' }}>{isRTL ? 'رفع صورة' : 'Upload'}</div>
                                            </label>
                                        )}
                                        <input type="file" id={`new-shop-photo-${index}`} style={{ opacity: 0, position: 'absolute', zIndex: -1, width: '1px', height: '1px', overflow: 'hidden' }} accept="image/*" onChange={(e) => handleImageUpload(index, e)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="btn btn-gold">{isRTL ? 'حفظ المتجر' : 'Save Vendor'}</button>
                    </form>
                </div>
            )}

            {(statusFilter === 'all' || statusFilter === 'pending') && pendingShops.length > 0 && !searchQuery && (
                <div style={{ marginBottom: '28px', background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.08) 0%, rgba(30, 41, 59, 0.95) 100%)', border: '1px solid rgba(234, 179, 8, 0.35)', borderRadius: '14px', padding: isMobile ? '16px' : '20px', boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.2)', border: '1px solid rgba(234, 179, 8, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={20} color="#facc15" /></div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: '700' }}>{isRTL ? 'طلبات انضمام البائعين الجديدة' : 'Vendor Join Requests'}</h3>
                                <div style={{ fontSize: '0.78rem', color: '#facc15', marginTop: '2px' }}>{isRTL ? 'بانتظار المراجعة والاعتماد' : 'Pending administrative approval'}</div>
                            </div>
                        </div>
                        <span style={{ background: '#facc15', color: '#000', fontWeight: '800', fontSize: '0.78rem', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.5px' }}>{pendingShops.length} {isRTL ? 'طلب جديد' : 'New Applications'}</span>
                    </div>

                    <div style={{ display: 'grid', gap: '12px' }}>
                        {pendingShops.map(reqShop => (
                            <div key={`req-${reqShop.id}`} style={{ background: '#0f172a', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '10px', padding: isMobile ? '14px' : '16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '12px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ width: '45px', height: '45px', borderRadius: '8px', background: '#1e293b', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0, border: '1px solid #334155' }}>
                                        {(reqShop.images && reqShop.images.length > 0) ? <img src={reqShop.images[0]} alt={reqShop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Store size={22} color="#facc15" />}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: '700', fontSize: '1rem', color: '#f8fafc' }}>{reqShop.name}</span>
                                            {getStatusBadge(reqShop.status)}
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                            <span><strong>{isRTL ? 'المالك:' : 'Owner:'}</strong> {reqShop.customers?.name || 'Applicant'}</span>
                                            {reqShop.customers?.email && (<span><strong>{isRTL ? 'البريد:' : 'Email:'}</strong> {reqShop.customers.email}</span>)}
                                            {reqShop.whatsapp_number && (<span><strong>{isRTL ? 'واتساب:' : 'WhatsApp:'}</strong> {reqShop.whatsapp_number}</span>)}
                                        </div>
                                        {reqShop.address && (<div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} color="#c8a951" /> {reqShop.address}</div>)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                                    <button onClick={() => updateShopStatus(reqShop.id, 'ACTIVE')} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)' }}><Check size={16} />{isRTL ? 'موافقة واعتماد' : 'Approve & Activate'}</button>
                                    <button onClick={() => updateShopStatus(reqShop.id, 'REJECTED')} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><X size={16} />{isRTL ? 'رفض' : 'Reject'}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#cbd5e1', fontWeight: '600' }}>{statusFilter === 'all' ? (isRTL ? 'قائمة المتاجر المسجلة (المعتمدة تظهر في الأسفل)' : 'Registered Vendors (Approved sorted to bottom)') : statusFilter === 'pending' ? (isRTL ? 'طلبات الانضمام' : 'Vendor Join Requests') : statusFilter === 'active' ? (isRTL ? 'المتاجر المعتمدة والنشطة' : 'Active & Approved Vendors') : (isRTL ? 'المتاجر الموقوفة' : 'Suspended Vendors')}</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{filteredShops.length} {isRTL ? 'متجر معروض' : 'shops shown'}</span>
            </div>

            {filteredShops.map(shop => {
                const isExpanded = expandedShop === shop.id;
                const analytics = isExpanded ? getShopAnalytics(shop) : null;

                return (
                    <div key={shop.id} style={{ marginBottom: '14px', border: isApprovedOrActive(shop.status) ? '1px solid #334155' : (isPending(shop.status) ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(239, 68, 68, 0.3)'), borderRadius: '12px', overflow: 'hidden', background: '#1e293b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: isMobile ? '12px 15px' : '16px 20px', gap: isMobile ? '10px' : '16px', flexWrap: 'wrap', cursor: 'pointer', background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent', position: 'relative' }} onClick={() => { setExpandedShop(isExpanded ? null : shop.id); setExpandedTab('overview'); setEditingShop(null); }}>
                            <div style={{ width: isMobile ? '35px' : '45px', height: isMobile ? '35px' : '45px', borderRadius: '8px', background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0, border: '1px solid #334155' }}>
                                {(shop.images && shop.images.length > 0) ? <img src={shop.images[0]} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Store size={22} color="#94a3b8" />}
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#f8fafc' }}>{shop.name}</div>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>{shop.customers?.name || 'Vendor Admin'} {shop.customers?.email ? `· ${shop.customers.email}` : ''}</div>
                            </div>
                            {!isMobile && shop.address && (<div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.82rem', background: 'rgba(15, 23, 42, 0.6)', padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.5)' }}><MapPin size={14} color="#c8a951" /> {shop.address?.substring(0, 35)}{shop.address?.length > 35 ? '...' : ''}</div>)}
                            <div style={{ marginLeft: isRTL ? '0' : 'auto', marginRight: isRTL ? 'auto' : '0' }}>{getStatusBadge(shop.status)}</div>
                            {renderActionButtons(shop)}
                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.08)' }}>{isExpanded ? <ChevronUp size={16} color="#c8a951" /> : <ChevronDown size={16} color="#94a3b8" />}</div>
                        </div>

                        {isExpanded && isMobile && (<div style={{ padding: '0 20px 10px', fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={12} /> {shop.address}</div>)}

                        {isExpanded && analytics && (
                            <div style={{ borderTop: '1px solid #334155', padding: isMobile ? '15px' : '20px' }}>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                                    {[
                                        { key: 'overview', icon: <BarChart3 size={14} />, label: isRTL ? 'نظرة عامة' : 'Overview' },
                                        { key: 'reports', icon: <BarChart3 size={14} />, label: isRTL ? 'التقارير' : 'Reports' },
                                        { key: 'products', icon: <PackageIcon size={14} />, label: isRTL ? 'المنتجات' : 'Products' },
                                        { key: 'orders', icon: <ShoppingCart size={14} />, label: isRTL ? 'الطلبات' : 'Orders' },
                                        { key: 'edit', icon: <Edit size={14} />, label: isRTL ? 'تعديل' : 'Edit Shop' }
                                    ].map(tab => (
                                        <button key={tab.key} onClick={() => { setExpandedTab(tab.key); if (tab.key === 'edit') { setEditingShop(shop.id); setEditData({ name: shop.name, address: shop.address, whatsapp_number: shop.whatsapp_number || '', is_recommended: shop.is_recommended || false, region_id: shop.region_id || '', ownerName: shop.customers?.name || '', ownerEmail: shop.customers?.email || '', images: shop.images || [], status: shop.status }); } }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: isMobile ? '10px 12px' : '8px 14px', border: expandedTab === tab.key ? '1px solid var(--color-gold)' : '1px solid #334155', borderRadius: '8px', background: expandedTab === tab.key ? 'var(--color-gold)' : '#2d3748', color: expandedTab === tab.key ? '#000' : '#cbd5e1', cursor: 'pointer', fontSize: isMobile ? '0.75rem' : '0.82rem', fontWeight: '600', flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', minWidth: isMobile ? '110px' : 'auto' }}>{tab.icon} {tab.label}</button>
                                    ))}
                                    <button onClick={() => deleteShop(shop.id, shop.name)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: isMobile ? '10px 12px' : '8px 14px', border: '1px solid #e74c3c33', borderRadius: '8px', background: '#fff5f5', color: '#e74c3c', cursor: 'pointer', fontSize: isMobile ? '0.75rem' : '0.82rem', fontWeight: '600', flex: isMobile ? '1 1 100%' : 'none', marginTop: isMobile ? '4px' : '0', marginLeft: isMobile ? '0' : 'auto' }}><Trash2 size={14} /> {isRTL ? 'حذف' : 'Delete'}</button>
                                </div>
                                {expandedTab === 'overview' && (<div>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: isMobile ? '8px' : '12px', marginBottom: '20px' }}>
                                        <div style={{ background: '#0f172a', borderRadius: '12px', padding: isMobile ? '12px' : '16px', border: '1px solid #3498db44', textAlign: 'center', flex: '1', minWidth: isMobile ? '100px' : '120px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', color: '#f8fafc' }}><PackageIcon size={isMobile ? 18 : 22} color="#3498db" style={{ marginBottom: '6px' }} /><div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', color: '#f8fafc' }}>{analytics.shopProducts.length}</div><div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{isRTL ? 'المنتجات' : 'Products'}</div></div>
                                        <div style={{ background: '#0f172a', borderRadius: '12px', padding: isMobile ? '12px' : '16px', border: '1px solid #2ecc7144', textAlign: 'center', flex: '1', minWidth: isMobile ? '100px' : '120px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', color: '#f8fafc' }}><ShoppingCart size={isMobile ? 18 : 22} color="#2ecc71" style={{ marginBottom: '6px' }} /><div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', color: '#f8fafc' }}>{analytics.shopOrders.length}</div><div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{isRTL ? 'الطلبات' : 'Orders'}</div></div>
                                        <div style={{ background: '#0f172a', borderRadius: '12px', padding: isMobile ? '12px' : '16px', border: '1px solid #d4af3744', textAlign: 'center', flex: '1', minWidth: isMobile ? '100px' : '120px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', color: '#f8fafc' }}><DollarSign size={isMobile ? 18 : 22} color="#d4af37" style={{ marginBottom: '6px' }} /><div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', color: '#f8fafc' }}>{analytics.totalSales.toFixed(0)}</div><div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{isRTL ? 'المبيعات' : 'Sales'}</div></div>
                                        <div style={{ background: '#0f172a', borderRadius: '12px', padding: isMobile ? '12px' : '16px', border: '1px solid #f1c40f44', textAlign: 'center', flex: '1', minWidth: isMobile ? '100px' : '120px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', color: '#f8fafc' }}><Clock size={isMobile ? 18 : 22} color="#f1c40f" style={{ marginBottom: '6px' }} /><div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', color: '#f8fafc' }}>{analytics.pendingOrders}</div><div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{isRTL ? 'معلقة' : 'Pending'}</div></div>
                                    </div>
                                    <div style={cardStyle}><div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '12px' : '15px', fontSize: '0.88rem' }}><div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'المالك:' : 'Owner:'}</strong> <span style={{ color: '#f8fafc' }}>{shop.customers?.name || 'N/A'}</span></div><div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'البريد:' : 'Email:'}</strong> <span style={{ color: '#f8fafc' }}>{shop.customers?.email || 'N/A'}</span></div><div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'العنوان:' : 'Address:'}</strong> <span style={{ color: '#f8fafc' }}>{shop.address}</span></div><div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'تاريخ الانضمام:' : 'Joined:'}</strong> <span style={{ color: '#f8fafc' }}>{new Date(shop.created_at).toLocaleDateString()}</span></div></div></div>
                                </div>)}
                                {expandedTab === 'reports' && (<div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '15px' : '20px' }}>
                                    <div style={cardStyle}><h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '12px' }}><DollarSign size={18} color="var(--color-gold)" /> {isRTL ? 'الأداء المالي' : 'Sales Performance'}</h4><div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}><div><div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>{isRTL ? 'مبيعات الشهر الحالي' : 'Current Month Sales'}</div><div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f8fafc' }}>{analytics.monthlySales.toFixed(2)} QAR</div></div><div style={{ height: '1px', background: '#334155' }}></div><div><div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>{isRTL ? 'إجمالي آخر 3 أشهر' : 'Last 3 Months Total'}</div><div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f8fafc' }}>{analytics.quarterlySales.toFixed(2)} QAR</div></div></div></div>
                                </div>)}
                                {expandedTab === 'products' && (<div className="nested-product-manager"><ProductManager isRTL={isRTL} shopId={shop.id} hideHeader={true} /></div>)}
                                {expandedTab === 'orders' && (<div>{analytics.shopOrders.length === 0 ? (<div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}><ShoppingCart size={40} style={{ marginBottom: '10px' }} /><div>{isRTL ? 'لا توجد طلبات بعد' : 'No orders yet'}</div></div>) : (<div style={{ display: 'grid', gap: '10px' }}>{analytics.shopOrders.map(order => (<div key={order.id} style={{ padding: '16px 20px', background: '#334155', borderRadius: '10px', border: '1px solid #475569', marginBottom: '10px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><span style={{ fontWeight: '700', color: '#f8fafc' }}>#{order.id}</span><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{getStatusBadge(order.status?.toLowerCase())}<strong>{order.total} QAR</strong></div></div><div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{isRTL ? 'العميل:' : 'Customer:'} {order.customerName || 'Guest'} · {order.items?.length || 0} {isRTL ? 'منتجات' : 'items'}</div></div>))}</div>)}</div>)}
                                {expandedTab === 'edit' && (
                                    <div style={cardStyle}>
                                        <h4 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700' }}>{isRTL ? 'تعديل بيانات المتجر' : 'Edit Shop Details'}</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '15px' : '20px' }}>
                                            <div>
                                                <label className="form-label">{isRTL ? 'اسم المتجر' : 'Shop Name'}</label>
                                                <input type="text" className="form-control" value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'الحالة' : 'Status'}</label>
                                                <select className="form-control" value={editData.status || shop.status} onChange={(e) => setEditData({...editData, status: e.target.value})}>
                                                    <option value="ACTIVE">{isRTL ? 'نشط / معتمد' : 'ACTIVE / Approved'}</option>
                                                    <option value="PENDING">{isRTL ? 'قيد المراجعة' : 'PENDING'}</option>
                                                    <option value="SUSPENDED">{isRTL ? 'موقوف' : 'SUSPENDED'}</option>
                                                    <option value="REJECTED">{isRTL ? 'مرفوض' : 'REJECTED'}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'حالة التوصية' : 'Recommendation'}</label>
                                                <select className="form-control" value={editData.is_recommended ? 'true' : 'false'} onChange={(e) => setEditData({...editData, is_recommended: e.target.value === 'true'})}>
                                                    <option value="true">{isRTL ? 'متجر موصى به' : 'Recommended Shop'}</option>
                                                    <option value="false">{isRTL ? 'عادي' : 'Normal'}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'رقم الواتساب' : 'WhatsApp Number'}</label>
                                                <input type="text" className="form-control" placeholder="+974..." value={editData.whatsapp_number || ''} onChange={(e) => setEditData({...editData, whatsapp_number: e.target.value})} />
                                            </div>
                                            {(user?.role === 'super_admin' || user?.role === 'admin') && (
                                                <>
                                                    <div>
                                                        <label className="form-label">{isRTL ? 'اسم المالك' : 'Owner Name'}</label>
                                                        <input type="text" className="form-control" value={editData.ownerName || ''} onChange={(e) => setEditData({...editData, ownerName: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="form-label">{isRTL ? 'البريد الإلكتروني للمالك' : 'Owner Email'}</label>
                                                        <input type="email" className="form-control" value={editData.ownerEmail || ''} onChange={(e) => setEditData({...editData, ownerEmail: e.target.value})} />
                                                    </div>
                                                </>
                                            )}
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label className="form-label">{isRTL ? 'المنطقة' : 'Region'}</label>
                                                <select className="form-control" value={editData.region_id || ''} onChange={(e) => setEditData({...editData, region_id: e.target.value})}>
                                                    <option value="">{isRTL ? '-- غير محدد --' : '-- Unassigned --'}</option>
                                                    {regions.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                                                </select>
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label className="form-label">{isRTL ? 'العنوان' : 'Address'}</label>
                                                <input type="text" className="form-control" value={editData.address || ''} onChange={(e) => setEditData({...editData, address: e.target.value})} />
                                            </div>

                                            {/* Edit Photos Component */}
                                            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Image size={16} /> {isRTL ? 'صور المتجر' : 'Shop Images'}
                                                </label>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                                                    {(editData.images || []).map((img, idx) => (
                                                        <div key={idx} style={{ position: 'relative', height: '110px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155' }}>
                                                            <img src={img} alt="shop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            <div style={{ position: 'absolute', top: '5px', right: '5px', display: 'flex', gap: '4px' }}>
                                                                <button onClick={() => {
                                                                    const updated = [...editData.images];
                                                                    updated.splice(idx, 1);
                                                                    setEditData({ ...editData, images: updated });
                                                                }} style={{ background: 'rgba(231, 76, 60, 0.9)', color: '#fff', border: 'none', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <label 
                                                        htmlFor="edit-shop-photo-upload"
                                                        style={{ height: '110px', borderRadius: '10px', border: '2px dashed #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', background: 'rgba(255,255,255,0.02)' }}
                                                    >
                                                        <Plus size={24} />
                                                        <span style={{ fontSize: '0.75rem', marginTop: '5px' }}>{isRTL ? 'إضافة صورة' : 'Add Photo'}</span>
                                                    </label>
                                                    <input type="file" id="edit-shop-photo-upload" style={{ opacity: 0, position: 'absolute', zIndex: -1, width: '1px', height: '1px', overflow: 'hidden' }} accept="image/*" onChange={(e) => handleImageUpload(-1, e, true)} />
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                                            <button className="btn btn-gold" style={{ height: '48px', flex: 1 }} onClick={() => updateShopDetails(shop.id)}>{isRTL ? 'حفظ التغييرات' : 'SAVE CHANGES'}</button>
                                            <button className="btn btn-slate" style={{ height: '48px', flex: 1 }} onClick={() => { setEditingShop(null); setExpandedTab('overview'); }}>{isRTL ? 'إلغاء' : 'CANCEL'}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            <ConfirmModal 
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmDelete}
                title={isRTL ? 'حذف المتجر' : 'Delete Shop'}
                message={isRTL 
                    ? `هل أنت متأكد أنك تريد حذف المتجر "${shopToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.` 
                    : `Are you sure you want to delete the shop "${shopToDelete?.name}"? This action cannot be undone.`
                }
                confirmText={isRTL ? 'حذف نهائي' : 'Delete Permanently'}
                cancelText={isRTL ? 'تراجع' : 'Cancel'}
                isRTL={isRTL}
                variant="danger"
                iconType="trash"
            />

            {filteredShops.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <Store size={48} style={{ marginBottom: '10px', color: '#64748b' }} />
                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                        {searchQuery 
                            ? (isRTL ? 'لا توجد نتائج مطابقة لبحثك' : 'No shops match your search criteria')
                            : (isRTL ? 'لا توجد متاجر في هذا القسم' : 'No shops found in this category')}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShopsManager;
