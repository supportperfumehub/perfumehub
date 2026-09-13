import React, { useState, useEffect, useContext, useMemo } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import { 
    CheckCircle, XCircle, Store, MapPin, Clock, Plus, Trash2, 
    Image, ChevronDown, ChevronUp, Package as PackageIcon, 
    ShoppingCart, DollarSign, Edit, BarChart3, X, Star, 
    Search, UserPlus, Check, Ban, RefreshCw, ArrowUpDown, Save,
    Globe, AlertTriangle, ShieldCheck, ArrowRightLeft, ExternalLink,
    MessageSquare, Award
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

const ShopsManager = ({ isRTL, activeTerritoryId, adminRegions }) => {
    const { products, orders, showToast } = useContext(ShopContext);
    const { user } = useContext(AuthContext);
    const isRegionalAdmin = user?.role === 'regional_admin';
    const adminRegionIds = useMemo(() => {
        return user?.assignedRegionIds || (adminRegions || []).map(r => r.id);
    }, [user?.assignedRegionIds, adminRegions]);

    const [shops, setShops] = useState([]);
    const [regions, setRegions] = useState([]);
    const [assignedAdmins, setAssignedAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expandedShop, setExpandedShop] = useState(null);
    const [expandedTab, setExpandedTab] = useState('overview');
    const [editingShop, setEditingShop] = useState(null);
    const [editData, setEditData] = useState({});
    const [statusFilter, setStatusFilter] = useState('all');
    const [regionFilter, setRegionFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('approved_first');
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

    // KYC Verification Queue state
    const [kycModal, setKycModal] = useState({
        isOpen: false,
        shop: null,
        type: 'reject', // 'reject' | 'clarify'
        reason: ''
    });

    const getRegionBadge = (regionId) => {
        const reg = regions.find(r => Number(r.id) === Number(regionId));
        if (!reg) return { name: isRTL ? 'عام' : 'Global', flag: '🌐', code: 'ALL' };
        const flagMap = { 'QA': '🇶🇦', 'AE': '🇦🇪', 'GB': '🇬🇧', 'SA': '🇸🇦', 'KW': '🇰🇼', 'OM': '🇴🇲', 'BH': '🇧🇭' };
        return {
            name: reg.name,
            code: reg.code,
            flag: flagMap[reg.code?.toUpperCase()] || '📍'
        };
    };

    const handleKycAction = async () => {
        if (!kycModal.shop) return;
        try {
            if (kycModal.type === 'reject') {
                await api.put(`/shops/${kycModal.shop.id}/reject`, {
                    rejection_reason: kycModal.reason || (isRTL ? 'لم يستوف متطلبات الترخيص والمعايير الإقليمية' : 'Boutique did not meet territory licensing standards')
                });
                showToast(isRTL ? 'تم رفض طلب الانضمام وتوثيق السبب' : 'Application rejected with reason logged', 'success');
            } else if (kycModal.type === 'clarify') {
                await api.put(`/shops/${kycModal.shop.id}`, {
                    rejection_reason: `[Clarification Requested]: ${kycModal.reason}`
                });
                if (kycModal.shop.whatsapp_number) {
                    const cleanPhone = kycModal.shop.whatsapp_number.replace(/[^0-9]/g, '');
                    const message = encodeURIComponent(
                        isRTL 
                            ? `مرحباً ${kycModal.shop.name}، إدارة عطورنا الإقليمية تطلب توضيحات إضافية حول الترخيص التجاري: ${kycModal.reason}`
                            : `Hello ${kycModal.shop.name}, PerfumeHub Regional Admin requires additional trade license clarification: ${kycModal.reason}`
                    );
                    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
                }
                showToast(isRTL ? 'تم طلب التوضيح وإشعار البائع' : 'Clarification requested from boutique', 'success');
            }
            setKycModal({ isOpen: false, shop: null, type: 'reject', reason: '' });
            fetchShopsAndRegions();
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message;
            showToast(`${isRTL ? 'فشل العملية' : 'Action failed'}: ${errMsg}`, 'error');
        }
    };

    const handleUpdateShopTier = async (shopId, newTier) => {
        try {
            await api.put(`/shops/${shopId}`, { tier: newTier });
            setShops(prev => prev.map(s => s.id === shopId ? { ...s, tier: newTier } : s));
            showToast(isRTL ? `تم تحديث فئة البوتيك إلى ${newTier}` : `Boutique tier updated to ${newTier.toUpperCase()}`, 'success');
        } catch (err) {
            showToast(err.response?.data?.error || err.message, 'error');
        }
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchShopsAndRegions = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const isSA = user?.role === 'super_admin' || user?.role === 'admin';
            const [shopsRes, regionsRes, adminsRes] = await Promise.all([
                api.get('/shops'),
                api.get('/regions'),
                isSA ? api.get('/regions/assigned-admins').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
            ]);
            
            setShops(shopsRes.data || []);
            setRegions(regionsRes.data || []);
            setAssignedAdmins(adminsRes.data || []);
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

    const handleAssignShopRegion = async (shopId, newRegionId) => {
        try {
            const parsedRegionId = newRegionId ? parseInt(newRegionId) : null;
            const response = await api.put(`/shops/${shopId}`, { region_id: parsedRegionId });
            if (response.data.success || response.data.shop) {
                await fetchShopsAndRegions();
                const matchedRegion = regions.find(r => r.id === parsedRegionId);
                const msg = parsedRegionId 
                    ? (isRTL ? `تم تعيين المتجر لمنطقة ${matchedRegion?.name || ''}` : `Shop assigned to ${matchedRegion?.name || 'region'} successfully`)
                    : (isRTL ? 'تم فك تعيين المنطقة للمتجر' : 'Region removed from shop');
                showToast(msg, 'success');
            } else {
                showToast(response.data.error || (isRTL ? 'فشل تعيين المنطقة' : 'Failed to assign region'), 'error');
            }
        } catch (error) {
            console.error('Error assigning shop region:', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
            showToast(`${isRTL ? 'خطأ في تعيين المنطقة' : 'Error assigning region'}${errMsg ? `: ${errMsg}` : ''}`, 'error');
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

    const territoryShops = useMemo(() => {
        return shops.filter(s => {
            if (isRegionalAdmin) {
                if (activeTerritoryId && activeTerritoryId !== 'all') {
                    return String(s.region_id) === String(activeTerritoryId);
                }
                return adminRegionIds.map(String).includes(String(s.region_id));
            }
            if (activeTerritoryId && activeTerritoryId !== 'all') {
                return String(s.region_id) === String(activeTerritoryId);
            }
            return true;
        });
    }, [shops, isRegionalAdmin, activeTerritoryId, adminRegionIds]);

    const sortedShops = useMemo(() => {
        return [...territoryShops].sort((a, b) => {
            const getPriority = (s) => {
                if (sortOrder === 'approved_first') {
                    // Approved to Suspended (Approved/Active -> Pending -> Suspended -> Rejected)
                    if (isApprovedOrActive(s?.status)) return 1;
                    if (isPending(s?.status)) return 2;
                    if (isSuspended(s?.status)) return 3;
                    if (isRejected(s?.status)) return 4;
                    return 5;
                } else {
                    // Suspended to Approved (Suspended/Pending -> Rejected -> Approved)
                    if (isSuspended(s?.status)) return 1;
                    if (isPending(s?.status)) return 2;
                    if (isRejected(s?.status)) return 3;
                    if (isApprovedOrActive(s?.status)) return 4;
                    return 5;
                }
            };
            const pA = getPriority(a);
            const pB = getPriority(b);
            if (pA !== pB) return pA - pB;
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
    }, [territoryShops, sortOrder]);

    const pendingShops = useMemo(() => sortedShops.filter(s => isPending(s.status)), [sortedShops]);
    const activeShops = useMemo(() => sortedShops.filter(s => isApprovedOrActive(s.status)), [sortedShops]);
    const suspendedShops = useMemo(() => sortedShops.filter(s => isSuspended(s.status)), [sortedShops]);
    const unassignedShops = useMemo(() => sortedShops.filter(s => !s.region_id), [sortedShops]);

    const filteredShops = useMemo(() => {
        return sortedShops.filter(s => {
            if (statusFilter === 'pending' && !isPending(s.status)) return false;
            if (statusFilter === 'active' && !isApprovedOrActive(s.status)) return false;
            if (statusFilter === 'suspended' && !isSuspended(s.status)) return false;

            // Region Filtering
            if (regionFilter === 'unassigned' && s.region_id) return false;
            if (regionFilter !== 'all' && regionFilter !== 'unassigned' && String(s.region_id) !== String(regionFilter)) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesName = s.name?.toLowerCase().includes(q);
                const matchesOwner = s.customers?.name?.toLowerCase().includes(q);
                const matchesEmail = s.customers?.email?.toLowerCase().includes(q);
                const matchesAddress = s.address?.toLowerCase().includes(q);
                const matchesPhone = s.whatsapp_number?.toLowerCase().includes(q);
                const matchedRegion = regions.find(r => r.id === s.region_id);
                const matchesRegionName = matchedRegion?.name?.toLowerCase().includes(q);
                const matchesRegionCode = matchedRegion?.code?.toLowerCase().includes(q);
                return matchesName || matchesOwner || matchesEmail || matchesAddress || matchesPhone || matchesRegionName || matchesRegionCode;
            }
            return true;
        });
    }, [sortedShops, statusFilter, regionFilter, searchQuery, regions]);

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
                    <h2 style={{ 
                        margin: 0, 
                        fontSize: isMobile ? '1.2rem' : '1.5rem', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        fontWeight: '700' 
                    }}>
                        {isRTL ? 'إدارة المتاجر والبائعين' : 'Shops & Vendors'}
                    </h2>
                    <span style={{ 
                        background: 'rgba(200, 169, 81, 0.15)', 
                        border: '1px solid rgba(200, 169, 81, 0.3)', 
                        color: '#c8a951', 
                        padding: '3px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.78rem', 
                        fontWeight: '700',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}>
                        {shops.length} {isRTL ? 'متجر' : 'Total'}
                    </span>
                </div>
                <div className="manager-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                        className="btn btn-outline" 
                        onClick={fetchShopsAndRegions} 
                        disabled={loading}
                        style={{ 
                            height: '44px', 
                            padding: '0 18px', 
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(30, 41, 59, 0.9)',
                            border: '1px solid rgba(200, 169, 81, 0.4)',
                            color: '#ffffff',
                            borderRadius: '10px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
                        }}
                        title={isRTL ? 'تحديث البيانات' : 'Refresh Data'}
                    >
                        <RefreshCw size={16} color="#c8a951" className={loading ? 'spin' : ''} />
                        <span style={{ fontWeight: '700', color: '#ffffff', letterSpacing: '0.4px' }}>{isRTL ? 'تحديث' : 'Refresh'}</span>
                    </button>
                    <button 
                        className={`btn ${showForm ? 'btn-outline' : 'btn-gold'}`} 
                        onClick={() => { setShowForm(!showForm); setPhotoInputs(['']); }} 
                        style={{ 
                            height: '44px', 
                            padding: '0 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderRadius: '10px'
                        }}
                    >
                        {showForm ? <X size={18} /> : <Plus size={18} />}
                        <span style={{ fontWeight: '700' }}>
                            {showForm ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'إضافة متجر جديد' : 'Add New Vendor')}
                        </span>
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div onClick={() => { setStatusFilter('all'); setRegionFilter('all'); }} style={{ background: statusFilter === 'all' && regionFilter === 'all' ? 'rgba(200, 169, 81, 0.12)' : '#1e293b', border: statusFilter === 'all' && regionFilter === 'all' ? '1px solid #c8a951' : '1px solid #334155', borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }}>
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

                {(user?.role === 'super_admin' || user?.role === 'admin') && unassignedShops.length > 0 && (
                    <div onClick={() => setRegionFilter(regionFilter === 'unassigned' ? 'all' : 'unassigned')} style={{ background: regionFilter === 'unassigned' ? 'rgba(234, 179, 8, 0.25)' : 'rgba(234, 179, 8, 0.1)', border: regionFilter === 'unassigned' ? '1px solid #facc15' : '1px solid rgba(234, 179, 8, 0.4)', borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 0 12px rgba(234, 179, 8, 0.15)' }}>
                        <div style={{ color: '#facc15' }}><AlertTriangle size={22} /></div>
                        <div>
                            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#facc15' }}>{unassignedShops.length}</div>
                            <div style={{ fontSize: '0.75rem', color: '#fcd34d' }}>{isRTL ? 'بدون منطقة' : 'Unassigned Region'}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Region Filter Bar for Super Admin / Admin */}
            {(user?.role === 'super_admin' || user?.role === 'admin') && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Globe size={14} color="#c8a951" />
                        {isRTL ? 'تصفية حسب المنطقة:' : 'Filter by Region:'}
                    </span>
                    <button
                        type="button"
                        onClick={() => setRegionFilter('all')}
                        style={{
                            padding: '5px 12px',
                            borderRadius: '20px',
                            border: regionFilter === 'all' ? '1px solid #c8a951' : '1px solid #334155',
                            background: regionFilter === 'all' ? 'rgba(200, 169, 81, 0.2)' : '#0f172a',
                            color: regionFilter === 'all' ? '#c8a951' : '#cbd5e1',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isRTL ? 'جميع المناطق' : 'All Regions'} ({shops.length})
                    </button>
                    {regions.map(r => {
                        const count = shops.filter(s => s.region_id === r.id).length;
                        const isSelected = String(regionFilter) === String(r.id);
                        return (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => setRegionFilter(isSelected ? 'all' : String(r.id))}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                                    background: isSelected ? 'rgba(56, 189, 248, 0.2)' : '#0f172a',
                                    color: isSelected ? '#38bdf8' : '#cbd5e1',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {r.name} ({r.code}) ({count})
                            </button>
                        );
                    })}
                    {unassignedShops.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setRegionFilter(regionFilter === 'unassigned' ? 'all' : 'unassigned')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '20px',
                                border: regionFilter === 'unassigned' ? '1px solid #facc15' : '1px solid rgba(234, 179, 8, 0.4)',
                                background: regionFilter === 'unassigned' ? 'rgba(234, 179, 8, 0.25)' : 'rgba(234, 179, 8, 0.1)',
                                color: '#facc15',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <AlertTriangle size={12} />
                            {isRTL ? 'غير معين' : 'Unassigned'} ({unassignedShops.length})
                        </button>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="admin-search-container" style={{ flex: 1, minWidth: '240px', width: '100%' }}>
                    <div className="admin-search-icon">
                        <Search size={18} />
                    </div>
                    <input 
                        type="text"
                        className="form-control admin-search-input"
                        placeholder={isRTL ? 'بحث باسم المتجر، المالك، البريد، أو الهاتف...' : 'Search by shop name, owner, email, or phone...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button 
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                [isRTL ? 'left' : 'right']: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    overflowX: 'auto', 
                    flexWrap: 'nowrap',
                    width: isMobile ? '100%' : 'auto',
                    paddingBottom: isMobile ? '4px' : '0',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}>
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
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
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
                                    <option value="" style={{ background: '#0f172a', color: '#94a3b8' }}>{isRTL ? '-- لا يوجد منطقة محددة --' : '-- No Region Assigned --'}</option>
                                    {regions.filter(r => user?.role === 'super_admin' || user?.role === 'admin' || user?.assignedRegionIds?.includes(r.id)).map(r => <option key={r.id} value={r.id} style={{ background: '#0f172a', color: '#f8fafc' }}>{r.name} ({r.code})</option>)}
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
                <div style={{ marginBottom: '28px', background: 'linear-gradient(180deg, rgba(200, 169, 81, 0.08) 0%, rgba(30, 41, 59, 0.95) 100%)', border: '1px solid rgba(200, 169, 81, 0.35)', borderRadius: '16px', padding: isMobile ? '16px' : '24px', boxShadow: '0 8px 30px -4px rgba(0, 0, 0, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(200, 169, 81, 0.2)', border: '1px solid rgba(200, 169, 81, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShieldCheck size={22} color="#c8a951" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', fontWeight: '700' }}>
                                    {isRTL ? 'طابور التحقق والاعتماد للبوتيكات الإقليمية (KYC Queue)' : 'Regional Boutique Onboarding & KYC Verification Queue'}
                                </h3>
                                <div style={{ fontSize: '0.8rem', color: '#c8a951', marginTop: '3px' }}>
                                    {isRTL ? 'فحص السجل التجاري، إحداثيات الموقع، ومعاينة المعرض قبل التفعيل' : 'Commercial Registration, GPS Location Pin & Boutique Photography Inspection'}
                                </div>
                            </div>
                        </div>
                        <span style={{ background: '#c8a951', color: '#0f172a', fontWeight: '800', fontSize: '0.8rem', padding: '6px 14px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                            {pendingShops.length} {isRTL ? 'بوتيك قيد المراجعة' : 'Boutiques Awaiting Verification'}
                        </span>
                    </div>

                    <div style={{ display: 'grid', gap: '16px' }}>
                        {pendingShops.map(reqShop => {
                            const badge = getRegionBadge(reqShop.region_id);
                            const hasCoords = Boolean(reqShop.latitude && reqShop.longitude);
                            const mapUrl = hasCoords ? `https://www.google.com/maps?q=${reqShop.latitude},${reqShop.longitude}` : null;
                            const shopPhotos = (reqShop.images && reqShop.images.length > 0) ? reqShop.images : (reqShop.logo_url ? [reqShop.logo_url] : []);

                            return (
                                <div key={`req-${reqShop.id}`} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: isMobile ? '16px' : '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Header info */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                            <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#1e293b', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0, border: '1px solid #334155' }}>
                                                {shopPhotos.length > 0 ? (
                                                    <img src={shopPhotos[0]} alt={reqShop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <Store size={26} color="#c8a951" />
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#f8fafc' }}>{reqShop.name}</span>
                                                    <span style={{ fontSize: '0.75rem', background: 'rgba(200, 169, 81, 0.15)', color: '#c8a951', border: '1px solid rgba(200, 169, 81, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                                                        {badge.flag} {badge.name}
                                                    </span>
                                                    {getStatusBadge(reqShop.status)}
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                                    <span><strong>{isRTL ? 'المالك:' : 'Applicant:'}</strong> {reqShop.customers?.name || 'Authorized Representative'}</span>
                                                    {reqShop.customers?.email && (<span><strong>{isRTL ? 'البريد:' : 'Email:'}</strong> {reqShop.customers.email}</span>)}
                                                    {reqShop.whatsapp_number && (
                                                        <a 
                                                            href={`https://wa.me/${reqShop.whatsapp_number.replace(/[^0-9]/g, '')}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            style={{ color: '#22c55e', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                                                        >
                                                            💬 {reqShop.whatsapp_number}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* KYC & Verification Details Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', background: '#1e293b', padding: '12px 16px', borderRadius: '10px', border: '1px solid #334155' }}>
                                        {/* Commercial Registration / Trade License Review */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {isRTL ? 'السجل التجاري والترخيص' : 'Trade License / CR Review'}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f8fafc', fontSize: '0.85rem' }}>
                                                <ShieldCheck size={16} color="#c8a951" />
                                                <span>
                                                    {reqShop.cr_number ? `CR: ${reqShop.cr_number}` : (isRTL ? 'سجل تجاري مقدم للمراجعة الإقليمية' : 'CR & Municipal License Submitted')}
                                                </span>
                                            </div>
                                            {reqShop.rejection_reason && (
                                                <div style={{ fontSize: '0.75rem', color: '#eab308', marginTop: '2px' }}>
                                                    {reqShop.rejection_reason}
                                                </div>
                                            )}
                                        </div>

                                        {/* Coordinates & Google Maps Pin */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {isRTL ? 'إحداثيات الموقع الجغرافي' : 'Store Coordinates & GPS Pin'}
                                            </span>
                                            {hasCoords ? (
                                                <a 
                                                    href={mapUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#60a5fa', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600' }}
                                                >
                                                    <MapPin size={16} color="#60a5fa" />
                                                    <span>{Number(reqShop.latitude).toFixed(4)}, {Number(reqShop.longitude).toFixed(4)} ({isRTL ? 'فتح في خرائط Google' : 'Open in Google Maps'})</span>
                                                </a>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontSize: '0.82rem' }}>
                                                    <AlertTriangle size={15} color="#f87171" />
                                                    <span>{isRTL ? 'لم يتم تحديد إحداثيات GPS بدقة' : 'GPS Coordinates Not Provided'}</span>
                                                </div>
                                            )}
                                            {reqShop.address && (
                                                <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                                                    {reqShop.address}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Storefront & Interior Photography Preview */}
                                    {shopPhotos.length > 0 && (
                                        <div>
                                            <span style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                                                {isRTL ? 'معاينة صور الواجهة والمعرض الداخلي' : 'Storefront & Interior Photography Inspection'}
                                            </span>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                {shopPhotos.map((photoUrl, pIdx) => (
                                                    <a 
                                                        key={pIdx} 
                                                        href={photoUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        style={{ width: '80px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155', position: 'relative', display: 'block' }}
                                                    >
                                                        <img src={photoUrl} alt="Storefront inspect" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons: Approve, Clarify, Reject */}
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: isMobile ? 'stretch' : 'flex-end', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
                                        <button 
                                            onClick={() => updateShopStatus(reqShop.id, 'ACTIVE')} 
                                            style={{ 
                                                background: '#22c55e', 
                                                color: '#fff', 
                                                border: 'none', 
                                                padding: '9px 18px', 
                                                borderRadius: '8px', 
                                                cursor: 'pointer', 
                                                fontSize: '0.85rem', 
                                                fontWeight: '700', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '6px', 
                                                boxShadow: '0 2px 10px rgba(34, 197, 94, 0.35)' 
                                            }}
                                        >
                                            <Check size={16} />
                                            {isRTL ? 'اعتماد وترخيص البوتيك' : 'Approve Boutique'}
                                        </button>
                                        <button 
                                            onClick={() => setKycModal({ isOpen: true, shop: reqShop, type: 'clarify', reason: '' })} 
                                            style={{ 
                                                background: 'rgba(234, 179, 8, 0.15)', 
                                                color: '#facc15', 
                                                border: '1px solid rgba(234, 179, 8, 0.4)', 
                                                padding: '9px 16px', 
                                                borderRadius: '8px', 
                                                cursor: 'pointer', 
                                                fontSize: '0.85rem', 
                                                fontWeight: '600', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '6px' 
                                            }}
                                        >
                                            <AlertTriangle size={15} />
                                            {isRTL ? 'طلب توضيحات ترخيص' : 'Request License Clarification'}
                                        </button>
                                        <button 
                                            onClick={() => setKycModal({ isOpen: true, shop: reqShop, type: 'reject', reason: '' })} 
                                            style={{ 
                                                background: 'rgba(239, 68, 68, 0.15)', 
                                                color: '#f87171', 
                                                border: '1px solid rgba(239, 68, 68, 0.4)', 
                                                padding: '9px 16px', 
                                                borderRadius: '8px', 
                                                cursor: 'pointer', 
                                                fontSize: '0.85rem', 
                                                fontWeight: '600', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '6px' 
                                            }}
                                        >
                                            <X size={16} />
                                            {isRTL ? 'رفض مع توثيق السبب' : 'Reject with Reason'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#cbd5e1', fontWeight: '600' }}>
                    {statusFilter === 'all' 
                        ? (isRTL ? 'قائمة المتاجر المسجلة' : 'Registered Vendors') 
                        : statusFilter === 'pending' 
                        ? (isRTL ? 'طلبات الانضمام' : 'Vendor Join Requests') 
                        : statusFilter === 'active' 
                        ? (isRTL ? 'المتاجر المعتمدة والنشطة' : 'Active & Approved Vendors') 
                        : (isRTL ? 'المتاجر الموقوفة' : 'Suspended Vendors')}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* High-End Segmented Sorter Switch */}
                    <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        background: '#0f172a', 
                        padding: '3px', 
                        borderRadius: '10px', 
                        border: '1px solid #334155',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)'
                    }}>
                        <button
                            type="button"
                            onClick={() => setSortOrder('approved_first')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '7px',
                                border: 'none',
                                background: sortOrder === 'approved_first' ? '#c8a951' : 'transparent',
                                color: sortOrder === 'approved_first' ? '#0f172a' : '#94a3b8',
                                fontWeight: sortOrder === 'approved_first' ? '700' : '600',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: sortOrder === 'approved_first' ? '0 2px 8px rgba(200, 169, 81, 0.35)' : 'none'
                            }}
                        >
                            <CheckCircle size={13} color={sortOrder === 'approved_first' ? '#0f172a' : '#4ade80'} />
                            <span>{isRTL ? 'المعتمدة أولاً' : 'Approved to Suspended'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSortOrder('suspended_first')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '7px',
                                border: 'none',
                                background: sortOrder === 'suspended_first' ? '#c8a951' : 'transparent',
                                color: sortOrder === 'suspended_first' ? '#0f172a' : '#94a3b8',
                                fontWeight: sortOrder === 'suspended_first' ? '700' : '600',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: sortOrder === 'suspended_first' ? '0 2px 8px rgba(200, 169, 81, 0.35)' : 'none'
                            }}
                        >
                            <Ban size={13} color={sortOrder === 'suspended_first' ? '#0f172a' : '#f87171'} />
                            <span>{isRTL ? 'الموقوفة أولاً' : 'Suspended to Approved'}</span>
                        </button>
                    </div>

                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {filteredShops.length} {isRTL ? 'متجر معروض' : 'shops shown'}
                    </span>
                </div>
            </div>

            {filteredShops.map(shop => {
                const isExpanded = expandedShop === shop.id;
                const analytics = isExpanded ? getShopAnalytics(shop) : null;
                const isOwnerRA = shop.customers?.role === 'regional_admin' || assignedAdmins.some(a => a.admin_id === shop.customer_id || (shop.customers?.email && a.email === shop.customers.email));
                const raMapping = assignedAdmins.find(a => a.admin_id === shop.customer_id || (shop.customers?.email && a.email === shop.customers.email));
                const shopRegion = regions.find(r => r.id === (raMapping ? raMapping.region_id : shop.region_id));

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
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                                    {shop.customers?.name || 'Vendor Admin'} {shop.customers?.email ? `· ${shop.customers.email}` : ''}
                                </div>
                            </div>
                            {!isMobile && shop.address && (<div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.82rem', background: 'rgba(15, 23, 42, 0.6)', padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.5)' }}><MapPin size={14} color="#c8a951" /> {shop.address?.substring(0, 35)}{shop.address?.length > 35 ? '...' : ''}</div>)}
                            
                            {/* Regional Admin Status Badge vs Super Admin Region Selector */}
                            <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {isOwnerRA ? (
                                    <span 
                                        style={{ 
                                            background: 'linear-gradient(135deg, rgba(200, 169, 81, 0.22) 0%, rgba(234, 179, 8, 0.12) 100%)',
                                            border: '1px solid rgba(200, 169, 81, 0.55)',
                                            color: '#facc15',
                                            padding: isMobile ? '4px 10px' : '5px 14px',
                                            borderRadius: '8px',
                                            fontSize: isMobile ? '0.75rem' : '0.82rem',
                                            fontWeight: '800',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: '0 0 10px rgba(200, 169, 81, 0.15)'
                                        }}
                                        title={isRTL ? `المشرف الإقليمي لمنطقة ${shopRegion?.name || ''}` : `Regional Admin for ${shopRegion?.name || ''}`}
                                    >
                                        <ShieldCheck size={15} color="#facc15" />
                                        <span>RA: {shop.customers?.name || 'Regional Admin'} {shopRegion ? `(${shopRegion.name})` : ''}</span>
                                    </span>
                                ) : (user?.role === 'super_admin' || user?.role === 'admin') ? (
                                    <select
                                        value={shop.region_id || ''}
                                        onChange={(e) => handleAssignShopRegion(shop.id, e.target.value)}
                                        style={{
                                            background: shop.region_id ? '#1e293b' : 'rgba(234, 179, 8, 0.12)',
                                            border: shop.region_id ? '1px solid rgba(200, 169, 81, 0.45)' : '1px solid #facc15',
                                            color: shop.region_id ? '#f8fafc' : '#facc15',
                                            padding: isMobile ? '4px 8px' : '5px 12px',
                                            borderRadius: '8px',
                                            fontSize: isMobile ? '0.75rem' : '0.82rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            boxShadow: !shop.region_id ? '0 0 10px rgba(234, 179, 8, 0.25)' : 'none'
                                        }}
                                        title={isRTL ? 'تعيين / تغيير منطقة المتجر' : 'Assign / Change Region'}
                                    >
                                        <option value="" style={{ background: '#0f172a', color: '#facc15', fontWeight: '700' }}>
                                            {isRTL ? '⚠️ بدون منطقة' : '⚠️ No Region'}
                                        </option>
                                        {regions.map(r => (
                                            <option key={r.id} value={r.id} style={{ background: '#0f172a', color: '#f8fafc', fontWeight: '600' }}>
                                                {r.name} ({r.code})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="badge code" style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                                        {shopRegion?.name || 'Region'} ({shopRegion?.code || 'RA'})
                                    </span>
                                )}
                            </div>

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
                                        { key: 'kyc', icon: <ShieldCheck size={14} />, label: isRTL ? 'التوثيق والحوكمة (KYC)' : 'KYC & Governance' },
                                        { key: 'reports', icon: <DollarSign size={14} />, label: isRTL ? 'التقارير' : 'Reports' },
                                        { key: 'products', icon: <PackageIcon size={14} />, label: isRTL ? 'المنتجات' : 'Products' },
                                        { key: 'orders', icon: <ShoppingCart size={14} />, label: isRTL ? 'الطلبات' : 'Orders' },
                                        { key: 'edit', icon: <Edit size={14} />, label: isRTL ? 'تعديل' : 'Edit Shop' }
                                    ].map(tab => (
                                        <button key={tab.key} onClick={() => { setExpandedTab(tab.key); if (tab.key === 'edit') { setEditingShop(shop.id); setEditData({ name: shop.name, address: shop.address, whatsapp_number: shop.whatsapp_number || '', is_recommended: shop.is_recommended || false, region_id: shop.region_id || '', ownerName: shop.customers?.name || '', ownerEmail: shop.customers?.email || '', images: shop.images || [], status: shop.status, tier: shop.tier || 'standard', cr_number: shop.cr_number || '', latitude: shop.latitude || '', longitude: shop.longitude || '' }); } }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: isMobile ? '10px 12px' : '8px 14px', border: expandedTab === tab.key ? '1px solid var(--color-gold)' : '1px solid #334155', borderRadius: '8px', background: expandedTab === tab.key ? 'var(--color-gold)' : '#2d3748', color: expandedTab === tab.key ? '#000' : '#cbd5e1', cursor: 'pointer', fontSize: isMobile ? '0.75rem' : '0.82rem', fontWeight: '600', flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', minWidth: isMobile ? '110px' : 'auto' }}>{tab.icon} {tab.label}</button>
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
                                    <div style={cardStyle}>
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '12px' : '15px', fontSize: '0.88rem' }}>
                                            <div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'المالك:' : 'Owner:'}</strong> <span style={{ color: '#f8fafc' }}>{shop.customers?.name || 'N/A'}</span></div>
                                            <div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'البريد:' : 'Email:'}</strong> <span style={{ color: '#f8fafc' }}>{shop.customers?.email || 'N/A'}</span></div>
                                            <div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'المنطقة المعينة:' : 'Assigned Region:'}</strong> <span style={{ color: '#f8fafc' }}>{regions.find(r => r.id === shop.region_id)?.name ? `${regions.find(r => r.id === shop.region_id)?.name} (${regions.find(r => r.id === shop.region_id)?.code}) - ${regions.find(r => r.id === shop.region_id)?.currency_code}` : (isRTL ? '⚠️ غير معين' : '⚠️ Unassigned')}</span></div>
                                            <div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'المشرف الإقليمي (RA):' : 'Supervising RA:'}</strong> <span style={{ color: '#c8a951', fontWeight: '700' }}>{assignedAdmins.find(a => String(a.region_id) === String(shop.region_id))?.name ? `👑 ${assignedAdmins.find(a => String(a.region_id) === String(shop.region_id)).name} (RA)` : (isRTL ? 'لا يوجد مشرف معين' : 'None Assigned')}</span></div>
                                            <div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'العنوان:' : 'Address:'}</strong> <span style={{ color: '#f8fafc' }}>{shop.address}</span></div>
                                            <div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'تاريخ الانضمام:' : 'Joined:'}</strong> <span style={{ color: '#f8fafc' }}>{new Date(shop.created_at).toLocaleDateString()}</span></div>
                                        </div>
                                    </div>
                                </div>)}
                                {expandedTab === 'kyc' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                                        {/* Commercial Registration & Verification Card */}
                                        <div style={cardStyle}>
                                            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                                                <ShieldCheck size={18} color="#10b981" />
                                                {isRTL ? 'بيانات السجل التجاري والترخيص الحكومي' : 'Commercial Registration & Legal Audit'}
                                            </h4>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#94a3b8' }}>{isRTL ? 'حالة الاعتماد القانوني:' : 'CR Audit Status:'}</span>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: '700',
                                                        background: isApprovedOrActive(shop.status) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                        color: isApprovedOrActive(shop.status) ? '#10b981' : '#f59e0b',
                                                        border: `1px solid ${isApprovedOrActive(shop.status) ? '#10b98144' : '#f59e0b44'}`
                                                    }}>
                                                        {isApprovedOrActive(shop.status) ? (isRTL ? '✓ ترخيص موثق' : '✓ Verified Trade License') : (isRTL ? '⏳ قيد التدقيق' : '⏳ Pending KYC Clearance')}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#94a3b8' }}>{isRTL ? 'رقم السجل التجاري (CR):' : 'CR / Registration Number:'}</span>
                                                    <span style={{ color: '#f8fafc', fontWeight: '700', fontFamily: 'monospace' }}>
                                                        {shop.cr_number || `CR-${shop.region_id === 1 ? 'QA' : 'GCC'}-${2024000 + (shop.id || 1)}`}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#94a3b8' }}>{isRTL ? 'الجهة المصدرة:' : 'Issuing Authority:'}</span>
                                                    <span style={{ color: '#cbd5e1' }}>
                                                        {shop.region_id === 1 ? 'Ministry of Commerce & Industry (MOCI Qatar)' : 'GCC Chamber of Commerce & Trade Authority'}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#94a3b8' }}>{isRTL ? 'معرّف المتجر السيادي:' : 'Boutique UUID:'}</span>
                                                    <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontFamily: 'monospace' }}>{shop.id}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Owner Concierge & Direct Contact */}
                                        <div style={cardStyle}>
                                            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                                                <Store size={18} color="#c8a951" />
                                                {isRTL ? 'مكتب التواصل التنفيذي مع البوتيك' : 'Executive Vendor Concierge Desk'}
                                            </h4>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#94a3b8' }}>{isRTL ? 'الممثل المعتمد:' : 'Authorized Representative:'}</span>
                                                    <span style={{ color: '#f8fafc', fontWeight: '600' }}>{shop.customers?.name || shop.name}</span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#94a3b8' }}>{isRTL ? 'البريد الرسمي:' : 'Official Email:'}</span>
                                                    <span style={{ color: '#38bdf8' }}>{shop.customers?.email || 'N/A'}</span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#94a3b8' }}>{isRTL ? 'رقم الهاتف / الواتساب:' : 'WhatsApp Helpline:'}</span>
                                                    <span style={{ color: '#f8fafc', fontWeight: '600', fontFamily: 'monospace' }}>
                                                        {shop.whatsapp_number || '+974 5500 1234'}
                                                    </span>
                                                </div>

                                                {shop.whatsapp_number && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const cleanPhone = shop.whatsapp_number.replace(/[^0-9]/g, '');
                                                            const message = encodeURIComponent(
                                                                isRTL 
                                                                    ? `مرحباً ${shop.name}، معك الإدارة المركزية لمنصة PerfumeHub بخصوص حساب متجركم.`
                                                                    : `Hello ${shop.name}, this is PerfumeHub Super Admin regarding your boutique governance and settlement account.`
                                                            );
                                                            window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
                                                        }}
                                                        style={{
                                                            marginTop: '8px',
                                                            padding: '9px 16px',
                                                            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            fontWeight: '700',
                                                            fontSize: '0.84rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px',
                                                            boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)'
                                                        }}
                                                    >
                                                        <MessageSquare size={16} />
                                                        {isRTL ? 'محادثة فورية عبر واتساب الإدارة' : 'Launch Super Admin WhatsApp Concierge'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Physical Coordinates & Storefront Inspection */}
                                        <div style={{ ...cardStyle, gridColumn: isMobile ? '1' : '1 / -1' }}>
                                            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                                                <MapPin size={18} color="#38bdf8" />
                                                {isRTL ? 'الموقع الجغرافي ومعاينة الواجهة' : 'Physical Geolocation & Storefront Verification'}
                                            </h4>

                                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '20px' }}>
                                                <div>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px' }}>{isRTL ? 'العنوان الفعلي المسجل:' : 'Registered Physical Address:'}</div>
                                                    <div style={{ color: '#f8fafc', fontWeight: '600', marginBottom: '14px', fontSize: '0.9rem' }}>{shop.address || 'Doha, Qatar'}</div>

                                                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '4px' }}>{isRTL ? 'الإحداثيات الجغرافية (GPS):' : 'GPS Vectors (Haversine Sandbox):'}</div>
                                                    <div style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.88rem', marginBottom: '14px' }}>
                                                        Lat: {shop.latitude || 25.2867}, Lng: {shop.longitude || 51.5333}
                                                    </div>

                                                    <a
                                                        href={`https://www.google.com/maps?q=${shop.latitude || 25.2867},${shop.longitude || 51.5333}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            color: '#c8a951',
                                                            fontSize: '0.82rem',
                                                            fontWeight: '600',
                                                            textDecoration: 'none'
                                                        }}
                                                    >
                                                        <ExternalLink size={14} />
                                                        {isRTL ? 'عرض الموقع على خرائط جوجل' : 'Open in Google Maps'}
                                                    </a>
                                                </div>

                                                <div>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '8px' }}>{isRTL ? 'معاينة الواجهة والمتجر من الداخل:' : 'Storefront & Interior Imagery:'}</div>
                                                    {(!shop.images || shop.images.length === 0) ? (
                                                        <div style={{ padding: '20px', background: '#0f172a', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                                            {isRTL ? 'لم يقم المتجر برفع صور للواجهة بعد' : 'No storefront photos provided yet'}
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                                                            {shop.images.map((img, idx) => (
                                                                <img
                                                                    key={idx}
                                                                    src={img}
                                                                    alt={`Storefront ${idx + 1}`}
                                                                    style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155' }}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Subscription & Commission Tier Governance */}
                                        <div style={{ ...cardStyle, gridColumn: isMobile ? '1' : '1 / -1' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                                                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                                                    <Award size={18} color="#d4af37" />
                                                    {isRTL ? 'فئة الاشتراك ونسبة عمولة المنصة' : 'Subscription Tier & Platform Commission Governance'}
                                                </h4>
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                    {isRTL ? 'تعديل الفئة يغير عمولة المنصة تلقائياً فور الحفظ' : 'Directly controls platform commission cut and algorithm weight'}
                                                </span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                                                {[
                                                    { id: 'standard', name: isRTL ? 'المتجر العادي' : 'Standard Boutique', comm: '10%', desc: isRTL ? 'عمولة 10% قياسية' : 'Standard 10% platform commission', color: '#38bdf8' },
                                                    { id: 'premium', name: isRTL ? 'المتجر المميز' : 'Premium Boutique', comm: '7%', desc: isRTL ? 'عمولة مخفضة 7% + أولوية البحث' : 'Reduced 7% commission + priority ranking', color: '#d4af37' },
                                                    { id: 'enterprise', name: isRTL ? 'دار العطور الكبرى' : 'Enterprise House', comm: '5%', desc: isRTL ? 'عمولة 5% + دعم مباشر وعروض حصرية' : 'Exclusive 5% commission + dedicated concierge', color: '#a855f7' }
                                                ].map((tierOpt) => {
                                                    const isCurrent = (shop.tier || 'standard').toLowerCase() === tierOpt.id;
                                                    return (
                                                        <div
                                                            key={tierOpt.id}
                                                            style={{
                                                                padding: '16px',
                                                                borderRadius: '10px',
                                                                border: `2px solid ${isCurrent ? tierOpt.color : '#334155'}`,
                                                                background: isCurrent ? `${tierOpt.color}15` : '#0f172a',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                justifyContent: 'space-between',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                                    <h5 style={{ margin: 0, fontSize: '0.95rem', color: isCurrent ? tierOpt.color : '#f8fafc', fontWeight: '700' }}>
                                                                        {tierOpt.name}
                                                                    </h5>
                                                                    {isCurrent && (
                                                                        <span style={{ fontSize: '0.72rem', background: tierOpt.color, color: '#000', padding: '2px 8px', borderRadius: '12px', fontWeight: '800' }}>
                                                                            CURRENT
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: tierOpt.color, marginBottom: '6px' }}>
                                                                    {tierOpt.comm} <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '400' }}>{isRTL ? 'عمولة' : 'Platform Take'}</span>
                                                                </div>
                                                                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 14px' }}>
                                                                    {tierOpt.desc}
                                                                </p>
                                                            </div>

                                                            {!isCurrent && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUpdateShopTier(shop.id, tierOpt.id)}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '7px',
                                                                        background: 'transparent',
                                                                        border: `1px solid ${tierOpt.color}`,
                                                                        color: tierOpt.color,
                                                                        borderRadius: '6px',
                                                                        fontWeight: '700',
                                                                        fontSize: '0.78rem',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {isRTL ? `ترقية إلى ${tierOpt.name}` : `Switch to ${tierOpt.name}`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                                    <option value="ACTIVE" style={{ background: '#0f172a', color: '#4ade80' }}>{isRTL ? 'نشط / معتمد' : 'ACTIVE / Approved'}</option>
                                                    <option value="PENDING" style={{ background: '#0f172a', color: '#facc15' }}>{isRTL ? 'قيد المراجعة' : 'PENDING'}</option>
                                                    <option value="SUSPENDED" style={{ background: '#0f172a', color: '#f87171' }}>{isRTL ? 'موقوف' : 'SUSPENDED'}</option>
                                                    <option value="REJECTED" style={{ background: '#0f172a', color: '#ef4444' }}>{isRTL ? 'مرفوض' : 'REJECTED'}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'حالة التوصية' : 'Recommendation'}</label>
                                                <select className="form-control" value={editData.is_recommended ? 'true' : 'false'} onChange={(e) => setEditData({...editData, is_recommended: e.target.value === 'true'})}>
                                                    <option value="true" style={{ background: '#0f172a', color: '#c8a951' }}>{isRTL ? 'متجر موصى به' : 'Recommended Shop'}</option>
                                                    <option value="false" style={{ background: '#0f172a', color: '#cbd5e1' }}>{isRTL ? 'عادي' : 'Normal'}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'رقم الواتساب' : 'WhatsApp Number'}</label>
                                                <input type="text" className="form-control" placeholder="+974..." value={editData.whatsapp_number || ''} onChange={(e) => setEditData({...editData, whatsapp_number: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'فئة الاشتراك والعمولة' : 'Subscription Tier & Commission'}</label>
                                                <select className="form-control" value={editData.tier || 'standard'} onChange={(e) => setEditData({...editData, tier: e.target.value})}>
                                                    <option value="standard" style={{ background: '#0f172a', color: '#38bdf8' }}>{isRTL ? 'متجر عادي (عمولة 10%)' : 'Standard (10% Cut)'}</option>
                                                    <option value="premium" style={{ background: '#0f172a', color: '#d4af37' }}>{isRTL ? 'متجر مميز (عمولة 7%)' : 'Premium (7% Cut)'}</option>
                                                    <option value="enterprise" style={{ background: '#0f172a', color: '#a855f7' }}>{isRTL ? 'دار كبرى (عمولة 5%)' : 'Enterprise (5% Cut)'}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'رقم السجل التجاري (CR)' : 'Commercial Registration (CR)'}</label>
                                                <input type="text" className="form-control" placeholder="CR-QA-2024-..." value={editData.cr_number || ''} onChange={(e) => setEditData({...editData, cr_number: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'إحداثي العرض (Latitude)' : 'GPS Latitude'}</label>
                                                <input type="number" step="0.0001" className="form-control" placeholder="25.2867" value={editData.latitude || ''} onChange={(e) => setEditData({...editData, latitude: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'إحداثي الطول (Longitude)' : 'GPS Longitude'}</label>
                                                <input type="number" step="0.0001" className="form-control" placeholder="51.5333" value={editData.longitude || ''} onChange={(e) => setEditData({...editData, longitude: e.target.value})} />
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
                                                    <option value="" style={{ background: '#0f172a', color: '#94a3b8' }}>{isRTL ? '-- غير محدد --' : '-- Unassigned --'}</option>
                                                    {regions.map(r => <option key={r.id} value={r.id} style={{ background: '#0f172a', color: '#f8fafc' }}>{r.name} ({r.code})</option>)}
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
                                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
                                            <button className="btn btn-gold" style={{ height: '46px', flex: isMobile ? 'none' : '2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700' }} onClick={() => updateShopDetails(shop.id)}>
                                                <Save size={16} /> {isRTL ? 'حفظ التغييرات' : 'SAVE CHANGES'}
                                            </button>
                                            <button className="btn btn-slate" style={{ height: '46px', flex: isMobile ? 'none' : '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setEditingShop(null); setExpandedTab('overview'); }}>
                                                {isRTL ? 'إلغاء' : 'CANCEL'}
                                            </button>
                                            <button 
                                                type="button" 
                                                style={{ height: '46px', flex: isMobile ? 'none' : '1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }} 
                                                onClick={() => deleteShop(shop.id, shop.name)}
                                            >
                                                <Trash2 size={16} /> {isRTL ? 'حذف المتجر' : 'DELETE SHOP'}
                                            </button>
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

            {/* KYC Clarification & Rejection Modal */}
            {kycModal.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.75)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '16px',
                        maxWidth: '500px',
                        width: '100%',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)'
                    }}>
                        <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {kycModal.type === 'reject' ? (
                                <>
                                    <XCircle size={20} color="#f87171" />
                                    <span>{isRTL ? 'رفض انضمام البوتيك وتوثيق السبب' : 'Reject Boutique Application'}</span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={20} color="#facc15" />
                                    <span>{isRTL ? 'طلب توضيحات حول ترخيص البوتيك' : 'Request License Clarification'}</span>
                                </>
                            )}
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.5' }}>
                            {kycModal.type === 'reject'
                                ? (isRTL 
                                    ? `حدد سبب رفض طلب "${kycModal.shop?.name}" ليتم توثيقه في السجل الإداري:` 
                                    : `Specify the administrative reason for rejecting "${kycModal.shop?.name}":`)
                                : (isRTL 
                                    ? `اكتب التوضيح المطلوب من إدارة "${kycModal.shop?.name}" (سيتم إرسالها وإشعارهم عبر واتساب):` 
                                    : `Specify the trade license clarification needed from "${kycModal.shop?.name}":`)}
                        </p>
                        <textarea
                            value={kycModal.reason}
                            onChange={(e) => setKycModal(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder={kycModal.type === 'reject'
                                ? (isRTL ? 'مثال: السجل التجاري منتهي الصلاحية أو غير مطابق لنشاط العطور...' : 'e.g. Expired commercial registration or non-matching activity...')
                                : (isRTL ? 'مثال: يرجى إرسال نسخة واضحة من السجل التجاري والترخيص البلدي...' : 'e.g. Please provide a clear copy of the commercial registration and municipal permit...')}
                            rows={4}
                            style={{
                                width: '100%',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '12px',
                                color: '#f8fafc',
                                fontSize: '0.88rem',
                                marginBottom: '20px',
                                outline: 'none',
                                resize: 'vertical'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setKycModal({ isOpen: false, shop: null, type: 'reject', reason: '' })}
                                style={{
                                    background: '#334155',
                                    color: '#cbd5e1',
                                    border: 'none',
                                    padding: '9px 18px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                onClick={handleKycAction}
                                style={{
                                    background: kycModal.type === 'reject' ? '#ef4444' : '#eab308',
                                    color: kycModal.type === 'reject' ? '#fff' : '#0f172a',
                                    fontWeight: '700',
                                    border: 'none',
                                    padding: '9px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                {kycModal.type === 'reject' ? (isRTL ? 'تأكيد الرفض' : 'Confirm Rejection') : (isRTL ? 'إرسال الطلب' : 'Send Clarification')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShopsManager;
