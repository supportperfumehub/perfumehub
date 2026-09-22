import React, { useState, useContext, useEffect } from 'react';
import { useOutletContext, Navigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ShopContext } from '../../context/ShopContext';
import ProductManager from '../../components/Admin/ProductManager';
import OrderManager from '../../components/Admin/OrderManager';
import ReservationManager from '../../components/Admin/ReservationManager';
import DeviceManager from '../../components/Admin/DeviceManager';
import ConfirmModal from '../../components/Common/ConfirmModal';
import '../Admin/Admin.css'; // Use the premium admin styles
import AddBranchModal from '../../components/Vendor/AddBranchModal';
import { 
    Store, Package as PackageIcon, Target, Settings, Save, Plus, X, 
    Image as ImageIcon, Home, CalendarCheck, CreditCard, CheckCircle, 
    Zap, ShieldCheck, Smartphone, Upload, Trash2, MapPin, Phone, Clock, 
    Truck, Bell, MessageSquare, Shield, Layers, ChevronDown, TrendingUp, 
    DollarSign, Building2, Eye, ArrowUpRight, Download, Wallet, AlertCircle, RefreshCw,
    Camera, User as UserIcon
} from 'lucide-react';
import api from '../../utils/api_v1_0_2';

const VendorPanel = () => {
    const { isRTL = false } = useOutletContext() || {};
    const { user, isVendor, isAdmin, updateUser } = useContext(AuthContext);
    const { showToast } = useContext(ShopContext);
    const isDualAdmin = isAdmin || user?.role === 'regional_admin' || user?.role === 'super_admin';
    
    // Multi-shop states
    const [myShops, setMyShops] = useState([]);
    const [selectedShopId, setSelectedShopId] = useState('all'); // 'all' for All-Round View or specific shop ID
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [isShopSwitcherOpen, setIsShopSwitcherOpen] = useState(false);
    const [overviewStats, setOverviewStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalReservations: 0,
        loading: false
    });

    const primaryShopId = user?.shop_id;
    const effectiveShopId = selectedShopId === 'all' ? (primaryShopId || (myShops[0]?.id || null)) : selectedShopId;
    const [activeTab, setActiveTab] = useState('overview'); // Default to All-Round Overview
    const [shopData, setShopData] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [vendorPrefs, setVendorPrefs] = useState({
        isAcceptingOrders: true,
        openTime: '09:00',
        closeTime: '22:00',
        weekendHours: '04:00 PM - 11:30 PM',
        allowStorePickup: true,
        allowHomeDelivery: true,
        deliveryWindow: 'same_day',
        whatsappGreeting: '',
        notifyLowStock: true,
        notifyNewReservations: true,
        low_stock_threshold: 5
    });

    // Database-backed shop settings fetcher (Zero localStorage leakage)
    const fetchShopSettings = async (targetId) => {
        if (!targetId) return;
        try {
            const res = await api.get(`/shops/${targetId}/settings`);
            if (res.data?.settings) {
                setVendorPrefs(prev => ({
                    ...prev,
                    ...res.data.settings
                }));
            }
        } catch (err) {
            console.warn('Could not load shop settings from server:', err);
        }
    };

    useEffect(() => {
        if (effectiveShopId) {
            fetchShopSettings(effectiveShopId);
        }
    }, [effectiveShopId]);

    // Financials & Payouts State
    const [financials, setFinancials] = useState({
        gross_sales: 0,
        commission_rate: 0.10,
        platform_fee: 0,
        net_earnings: 0,
        total_paid_out: 0,
        available_balance: 0,
        transactions: []
    });
    const [payoutInfo, setPayoutInfo] = useState({
        bank_name: '',
        account_name: '',
        iban: '',
        swift: ''
    });
    const [loadingFinancials, setLoadingFinancials] = useState(false);
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutNotes, setPayoutNotes] = useState('');
    const [payoutSubmitting, setPayoutSubmitting] = useState(false);
    const [savingPayoutInfo, setSavingPayoutInfo] = useState(false);

    const fetchFinancials = async () => {
        if (!effectiveShopId) return;
        try {
            setLoadingFinancials(true);
            const [finRes, infoRes] = await Promise.all([
                api.get(`/shops/${effectiveShopId}/financials`).catch(() => ({ data: {} })),
                api.get(`/shops/${effectiveShopId}/payout-info`).catch(() => ({ data: {} }))
            ]);
            if (finRes.data?.financials) {
                setFinancials(finRes.data.financials);
            }
            if (infoRes.data?.payout_info) {
                setPayoutInfo(infoRes.data.payout_info);
            }
        } catch (err) {
            console.error('Error fetching financials:', err);
        } finally {
            setLoadingFinancials(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'financials') {
            fetchFinancials();
        }
    }, [activeTab, effectiveShopId]);

    const handleSavePayoutInfo = async (e) => {
        if (e) e.preventDefault();
        if (!effectiveShopId) return;
        try {
            setSavingPayoutInfo(true);
            await api.put(`/shops/${effectiveShopId}/payout-info`, payoutInfo);
            showToast(isRTL ? 'تم حفظ الحساب البنكي بنجاح' : 'Bank details saved successfully', 'success');
        } catch (err) {
            console.error('Failed to save payout info:', err);
            showToast(isRTL ? 'فشل حفظ الحساب البنكي' : 'Failed to save bank details', 'error');
        } finally {
            setSavingPayoutInfo(false);
        }
    };

    const handleRequestPayout = async (e) => {
        if (e) e.preventDefault();
        const amt = parseFloat(payoutAmount);
        if (isNaN(amt) || amt <= 0) {
            alert(isRTL ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
            return;
        }
        if (amt > financials.available_balance) {
            alert(isRTL ? 'المبلغ المطلوب يتجاوز الرصيد المتاح' : 'Requested amount exceeds available balance');
            return;
        }
        try {
            setPayoutSubmitting(true);
            await api.post(`/shops/${effectiveShopId}/request-payout`, {
                amount: amt,
                notes: payoutNotes
            });
            showToast(isRTL ? 'تم إرسال طلب سحب الأرباح بنجاح!' : 'Payout request submitted successfully!', 'success');
            setIsPayoutModalOpen(false);
            setPayoutAmount('');
            setPayoutNotes('');
            fetchFinancials();
        } catch (err) {
            console.error('Payout request error:', err);
            showToast(err.response?.data?.error || (isRTL ? 'فشل إرسال طلب السحب' : 'Failed to submit payout request'), 'error');
        } finally {
            setPayoutSubmitting(false);
        }
    };

    const handleExportCSV = () => {
        const rows = [
            ['Transaction ID', 'Date', 'Type', 'Amount (QAR)', 'Platform Fee 10% (QAR)', 'Net (QAR)', 'Status'],
            ...(financials.transactions || []).map(t => [
                t.id,
                t.date || t.created_at || new Date().toISOString(),
                t.type || 'Order Sale',
                t.amount,
                t.fee || (Number(t.amount) * 0.1).toFixed(2),
                (Number(t.amount) * 0.9).toFixed(2),
                t.status || 'Completed'
            ])
        ];
        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `financial_ledger_shop_${effectiveShopId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Luxury Web Audio Chime Synthesizer
    const playLuxuryChime = () => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            const freqs = [880, 1108.73, 1318.51];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
                gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.8);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.08);
                osc.stop(ctx.currentTime + idx * 0.08 + 0.85);
            });
        } catch (e) {
            console.warn('Audio chime error:', e);
        }
    };

    // Reservation Polling & Instant Notification
    const prevResvCount = React.useRef(null);
    useEffect(() => {
        if (!effectiveShopId || !vendorPrefs.notifyNewReservations) return;
        const checkNewReservations = async () => {
            try {
                const res = await api.get(`/reservations?shop_id=${effectiveShopId}`);
                const list = Array.isArray(res.data) ? res.data : [];
                if (prevResvCount.current !== null && list.length > prevResvCount.current) {
                    playLuxuryChime();
                    showToast(isRTL ? '🔔 حجز عطور جديد وصل للفرع!' : '🔔 New Click & Collect reservation received!', 'info');
                }
                prevResvCount.current = list.length;
            } catch (e) {}
        };
        checkNewReservations();
        const interval = setInterval(checkNewReservations, 30000);
        return () => clearInterval(interval);
    }, [effectiveShopId, vendorPrefs.notifyNewReservations]);

    // Billing & Subscriptions state
    const [mySubscription, setMySubscription] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [loadingBilling, setLoadingBilling] = useState(false);
    const [subConfirmModal, setSubConfirmModal] = useState({
        isOpen: false,
        plan: null
    });
    const [cancelConfirmModal, setCancelConfirmModal] = useState(false);

    const fetchBillingData = async () => {
        if (!user?.id) return;
        try {
            setLoadingBilling(true);
            const [subRes, plansRes] = await Promise.all([
                api.get('/subscriptions/my-subscription'),
                api.get('/subscriptions/plans')
            ]);
            setMySubscription(subRes.data && subRes.data.id ? subRes.data : null);
            setAvailablePlans(plansRes.data || []);
        } catch (error) {
            console.error("Error fetching billing data:", error);
        } finally {
            setLoadingBilling(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'billing') {
            fetchBillingData();
        }
    }, [activeTab, user?.id]);

    const handleSubscribe = async () => {
        const plan = subConfirmModal.plan;
        if (!plan) return;
        try {
            setLoadingBilling(true);
            const res = await api.post('/subscriptions/create-checkout-session', { 
                planId: plan.id,
                shopId: effectiveShopId
            });
            if (res.data?.url && res.data.url.startsWith('http')) {
                window.location.href = res.data.url;
                return;
            }
            showToast(isRTL ? 'تم الاشتراك بنجاح وترقية المتجر إلى الباقة المميزة!' : 'Subscribed successfully! Shop elevated to Premium tier.', 'success');
            setSubConfirmModal({ isOpen: false, plan: null });
            fetchBillingData();
        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.error || (isRTL ? 'فشل الاشتراك' : 'Subscription failed'), 'error');
        } finally {
            setLoadingBilling(false);
        }
    };

    const handleCancelSubscription = async () => {
        try {
            const res = await api.post('/subscriptions/cancel');
            if (res.status === 200 || res.data.message) {
                showToast(isRTL ? 'تم إلغاء الاشتراك بنجاح' : 'Subscription canceled successfully', 'success');
                setCancelConfirmModal(false);
                fetchBillingData();
            }
        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.error || (isRTL ? 'فشل إلغاء الاشتراك' : 'Failed to cancel subscription'), 'error');
        }
    };

    const fetchMyShops = async () => {
        if (!user?.id) return;
        try {
            const res = await api.get('/shops/my-shops');
            const list = res.data?.shops || [];
            setMyShops(list);
            if (list.length > 0) {
                if (selectedShopId !== 'all') {
                    const matched = list.find(s => String(s.id) === String(selectedShopId));
                    setShopData(matched || list[0]);
                } else {
                    setShopData(list[0]);
                }
            }
        } catch (err) {
            console.error("Error fetching my shops:", err);
        }
    };

    const fetchOverviewStats = async () => {
        if (!user?.id) return;
        try {
            setOverviewStats(prev => ({ ...prev, loading: true }));
            const [ordersRes, resvRes, invRes] = await Promise.all([
                api.get('/orders?shop_id=all').catch(() => ({ data: [] })),
                api.get('/reservations?shop_id=all').catch(() => ({ data: [] })),
                api.get('/inventory?all=true').catch(() => ({ data: [] }))
            ]);

            const ordersList = Array.isArray(ordersRes.data) ? ordersRes.data : [];
            const resvList = Array.isArray(resvRes.data) ? resvRes.data : [];
            const invList = Array.isArray(invRes.data) ? invRes.data : [];

            const totalRev = ordersList.reduce((acc, o) => acc + (Number(o.total) || Number(o.total_amount) || 0), 0);

            const threshold = vendorPrefs.low_stock_threshold || 5;
            const lowItems = invList.filter(item => {
                const stockVal = Number(item.stock ?? item.quantity ?? 0);
                return stockVal <= threshold;
            });
            setLowStockItems(lowItems);

            setOverviewStats({
                totalRevenue: totalRev,
                totalOrders: ordersList.length,
                totalProducts: invList.length,
                totalReservations: resvList.length,
                loading: false
            });
        } catch (e) {
            console.error("Error fetching overview stats:", e);
            setOverviewStats(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        fetchMyShops();
        fetchOverviewStats();
    }, [user?.id]);

    useEffect(() => {
        if (selectedShopId !== 'all' && myShops.length > 0) {
            const matched = myShops.find(s => String(s.id) === String(selectedShopId));
            if (matched) setShopData(matched);
        }
    }, [selectedShopId, myShops]);

    useEffect(() => {
        const closeSwitcher = (e) => {
            if (!e.target.closest('.vendor-shop-switcher-container')) {
                setIsShopSwitcherOpen(false);
            }
        };
        document.addEventListener('click', closeSwitcher);
        return () => document.removeEventListener('click', closeSwitcher);
    }, []);

    const handleSelectShop = (id) => {
        setSelectedShopId(id);
        setIsShopSwitcherOpen(false);
        if (id === 'all') {
            if (myShops.length > 0) setShopData(myShops[0]);
        } else {
            const matched = myShops.find(s => String(s.id) === String(id));
            if (matched) setShopData(matched);
        }
    };

    const handleBranchCreated = (newShop) => {
        showToast(isRTL ? 'تم إنشاء الفرع الجديد بنجاح!' : 'New branch created successfully!', 'success');
        setMyShops(prev => [...prev, newShop]);
        setSelectedShopId(newShop.id);
        setShopData(newShop);
        setActiveTab('settings');
        fetchOverviewStats();
    };

    // If somehow landed here without vendor/admin/regional_admin role (moved after hooks to prevent rules of hooks violation)
    if (!isVendor && user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'regional_admin') {
        return <Navigate to="/" replace />;
    }

    const handleImageUpload = (e) => {
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
                        
                        const currentImages = Array.isArray(shopData.images) ? shopData.images : [];
                        setShopData({
                            ...shopData,
                            images: [...currentImages, compressedBase64]
                        });
                        
                        fileInput.value = ''; // Reset input to allow uploading same image
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
                    fileInput.value = ''; // Reset on error too
                    URL.revokeObjectURL(objectUrl);
                    window._activeImageRefs.delete(img);
                };
                img.src = objectUrl;
            }
        } catch (err) {
            alert("Error in handleImageUpload: " + err.message);
        }
    };

    const removeImage = (index) => {
        const updatedImages = [...(shopData.images || [])];
        updatedImages.splice(index, 1);
        setShopData({ ...shopData, images: updatedImages });
    };

    const handleLogoUpload = (e) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            const objectUrl = URL.createObjectURL(file);
            const img = new window.Image();

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                    setShopData(prev => ({ 
                        ...prev, 
                        logo_url: compressedBase64,
                        images: [compressedBase64]
                    }));
                    URL.revokeObjectURL(objectUrl);
                } catch (err) {
                    console.error(err);
                    URL.revokeObjectURL(objectUrl);
                }
            };
            img.src = objectUrl;
            e.target.value = '';
        } catch (err) {
            console.error(err);
        }
    };

    const removeLogo = () => {
        setShopData(prev => ({ ...prev, logo_url: '', images: [] }));
    };

    // User Avatar Management Helpers
    const getUserInitials = (name) => {
        if (!name) return 'V';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileModalTab, setProfileModalTab] = useState('user'); // 'user' or 'shop'
    const [isUploadingUserAvatar, setIsUploadingUserAvatar] = useState(false);

    const handleUserAvatarUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast(isRTL ? 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)' : 'Image is too large (max 5MB)', 'error');
            return;
        }

        setIsUploadingUserAvatar(true);
        const reader = new FileReader();
        reader.onload = () => {
            const img = new window.Image();
            img.onload = async () => {
                try {
                    const canvas = document.createElement('canvas');
                    const maxDim = 400;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxDim) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressed = canvas.toDataURL('image/jpeg', 0.85);

                    const res = await api.put(`/users/${user.id}`, { avatar_url: compressed });
                    const newAvatar = res.data?.user?.avatar_url || compressed;
                    if (updateUser) updateUser({ avatar_url: newAvatar });
                    showToast(isRTL ? 'تم تحديث صورتك الشخصية بنجاح!' : 'Personal profile photo updated successfully!', 'success');
                } catch (err) {
                    console.error('Failed to update avatar:', err);
                    showToast(isRTL ? 'فشل تحديث الصورة الشخصية' : 'Failed to update profile photo', 'error');
                } finally {
                    setIsUploadingUserAvatar(false);
                    e.target.value = '';
                }
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveUserAvatar = async () => {
        if (!window.confirm(isRTL ? 'هل أنت متأكد من رغبتك في حذف صورتك الشخصية؟' : 'Are you sure you want to remove your personal profile photo?')) return;
        setIsUploadingUserAvatar(true);
        try {
            await api.put(`/users/${user.id}`, { avatar_url: '' });
            if (updateUser) updateUser({ avatar_url: '' });
            showToast(isRTL ? 'تم حذف الصورة الشخصية' : 'Personal profile photo removed', 'info');
        } catch (err) {
            console.error('Failed to remove avatar:', err);
            showToast(isRTL ? 'فشل حذف الصورة' : 'Failed to remove photo', 'error');
        } finally {
            setIsUploadingUserAvatar(false);
        }
    };

    const tabs = [
        { id: 'overview', label: isRTL ? 'نظرة شاملة' : 'All-Round View', icon: <Layers size={20} /> },
        { id: 'products', label: isRTL ? 'منتجاتي' : 'My Products', icon: <PackageIcon size={20} /> },
        { id: 'orders', label: isRTL ? 'طلبات المتجر' : 'Shop Orders', icon: <Target size={20} /> },
        { id: 'reservations', label: isRTL ? 'الحجوزات' : 'Reservations', icon: <CalendarCheck size={20} /> },
        { id: 'devices', label: isRTL ? 'إدارة الأجهزة' : 'Manage Devices', icon: <Smartphone size={20} /> },
        { id: 'financials', label: isRTL ? 'المالية والأرباح' : 'Financials & Payouts', icon: <DollarSign size={20} /> },
        { id: 'settings', label: isRTL ? 'إعدادات الفرع' : 'Shop Settings', icon: <Settings size={20} /> },
        { id: 'billing', label: isRTL ? 'الاشتراكات والفوترة' : 'Billing & Subscription', icon: <CreditCard size={20} /> }
    ];

    const filteredTabs = tabs;

    return (
        <div className={`admin-dashboard vendor-panel-dashboard ${isRTL ? 'rtl' : 'ltr'}`}>
            {/* Sidebar Navigation */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <h2>{isRTL ? 'لوحة البائع' : 'Vendor Panel'}</h2>
                    <div className="sidebar-header-right">
                        <span className="role-badge">
                            {isRTL ? 'بائع معتمد' : 'Vendor'}
                        </span>
                        <Link to="/" className="mobile-storefront-link" title={isRTL ? 'المتجر الرئيسي' : 'Storefront'}>
                            <Home size={16} />
                            <span>{isRTL ? 'المتجر' : 'Store'}</span>
                        </Link>
                    </div>
                </div>

                {/* Vendor Personal Merchant Profile Pill */}
                <div 
                    className="vendor-sidebar-profile-card"
                    onClick={() => { setProfileModalTab('user'); setIsProfileModalOpen(true); }}
                    style={{
                        margin: '10px 14px 18px',
                        padding: '10px 12px',
                        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(15, 23, 42, 0.7) 100%)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    title={isRTL ? 'تعديل الصورة الشخصية' : 'Edit Profile Photo'}
                >
                    <div style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '2px solid #d4af37',
                            background: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt={user?.name || 'Vendor'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                    {getUserInitials(user?.name)}
                                </span>
                            )}
                        </div>
                        <div style={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#d4af37',
                            color: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
                        }}>
                            <Camera size={9} />
                        </div>
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.name || (isRTL ? 'التاجر' : 'Vendor Merchant')}
                        </div>
                        <div style={{ color: '#c8a951', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Camera size={11} />
                            <span>{isRTL ? 'تعديل الصورة الشخصية' : 'Edit Profile Photo'}</span>
                        </div>
                    </div>
                </div>
                
                <nav className="sidebar-nav">
                    {filteredTabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="nav-icon">{tab.icon}</span>
                            <span className="nav-label">{tab.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {isDualAdmin && (
                        <Link to="/admin" className="nav-item switch-admin-btn" style={{
                            textDecoration: 'none',
                            color: '#000',
                            background: 'linear-gradient(135deg, #d4af37 0%, #f3e8b2 50%, #b8860b 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            marginBottom: '10px',
                            boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)'
                        }}>
                            <Settings size={18} color="#000" />
                            <span>{isRTL ? 'لوحة إدارة الإقليم (Admin)' : 'Territory Admin Dashboard'}</span>
                        </Link>
                    )}
                    <Link to="/" className="nav-item" style={{ textDecoration: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }}>
                        <Home size={20} />
                        <span>{isRTL ? 'العودة للرئيسية' : 'Back to Home'}</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="admin-main">
                <header className="admin-topbar">
                    <div className="welcome-text">
                        <h1>
                            {isRTL ? 'مرحباً، ' : 'Welcome back, '}
                            <span className="gold-gradient-text">
                                {selectedShopId === 'all' 
                                    ? (user?.name || (isRTL ? 'المالك' : 'Vendor'))
                                    : (shopData?.name || user?.name || (isRTL ? 'المتجر' : 'Shop'))}
                            </span>
                        </h1>
                        <p>
                            {selectedShopId === 'all' 
                                ? (isRTL ? 'عرض النظرة الشاملة المجمعة لجميع الفروع والعمليات.' : "All-Round consolidated view across all your boutique branches.") 
                                : (isRTL ? 'إليك نظرة عامة على عمليات ومنتجات هذا الفرع.' : `Managing operations for ${shopData?.name || 'this branch'}.`)}
                        </p>
                    </div>

                    <div className="admin-topbar-controls vendor-topbar-controls">
                        {/* Switch to Territory Admin Dashboard if dual role */}
                        {isDualAdmin && (
                            <Link to="/admin" className="topbar-admin-link" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 14px',
                                background: 'rgba(212, 175, 55, 0.15)',
                                border: '1px solid rgba(212, 175, 55, 0.4)',
                                borderRadius: '10px',
                                color: '#d4af37',
                                textDecoration: 'none',
                                fontSize: '0.84rem',
                                fontWeight: '700'
                            }} title={isRTL ? 'الذهاب إلى لوحة إدارة الإقليم' : 'Switch to Territory Admin Dashboard'}>
                                <Settings size={16} />
                                <span>{isRTL ? 'لوحة الإدارة' : 'Admin Panel'}</span>
                            </Link>
                        )}
                        {/* Shop Switcher Dropdown */}
                        <div className="vendor-shop-switcher-container" style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsShopSwitcherOpen(prev => !prev); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 16px',
                                    background: 'rgba(212, 175, 55, 0.12)',
                                    border: '1px solid rgba(212, 175, 55, 0.35)',
                                    borderRadius: '10px',
                                    color: '#f8fafc',
                                    fontSize: '0.88rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                {selectedShopId === 'all' ? (
                                    <>
                                        <span style={{ fontSize: '1rem' }}>🌐</span>
                                        <span>{isRTL ? 'جميع الفروع (نظرة شاملة)' : 'All Shops (All-Round)'}</span>
                                    </>
                                ) : (
                                    <>
                                        <span style={{ fontSize: '1rem' }}>🏬</span>
                                        <span>{myShops.find(s => String(s.id) === String(selectedShopId))?.name || (isRTL ? 'المتجر' : 'Shop')}</span>
                                    </>
                                )}
                                <ChevronDown size={14} style={{ transform: isShopSwitcherOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>

                            {isShopSwitcherOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '115%',
                                    [isRTL ? 'left' : 'right']: 0,
                                    width: '280px',
                                    background: '#18181b',
                                    border: '1px solid rgba(212, 175, 55, 0.3)',
                                    borderRadius: '12px',
                                    boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
                                    zIndex: 999,
                                    padding: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectShop('all')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            background: selectedShopId === 'all' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                                            border: selectedShopId === 'all' ? '1px solid rgba(212, 175, 55, 0.4)' : 'none',
                                            borderRadius: '8px',
                                            color: selectedShopId === 'all' ? '#d4af37' : '#e2e8f0',
                                            cursor: 'pointer',
                                            textAlign: isRTL ? 'right' : 'left',
                                            fontSize: '0.86rem',
                                            fontWeight: '600'
                                        }}
                                    >
                                        <span>🌐</span>
                                        <span>{isRTL ? 'جميع الفروع (نظرة شاملة)' : 'All Shops (All-Round View)'}</span>
                                    </button>

                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '2px 8px', fontWeight: 'bold' }}>
                                        {isRTL ? 'فروع ومتاجر حسابك:' : 'YOUR BOUTIQUE BRANCHES:'}
                                    </div>

                                    {myShops.map(shop => (
                                        <button
                                            key={shop.id}
                                            type="button"
                                            onClick={() => handleSelectShop(shop.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                                padding: '8px 12px',
                                                background: String(selectedShopId) === String(shop.id) ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                                                border: String(selectedShopId) === String(shop.id) ? '1px solid rgba(212, 175, 55, 0.4)' : 'none',
                                                borderRadius: '8px',
                                                color: String(selectedShopId) === String(shop.id) ? '#d4af37' : '#e2e8f0',
                                                cursor: 'pointer',
                                                textAlign: isRTL ? 'right' : 'left',
                                                fontSize: '0.84rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                <span>🏬</span>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                                                    {shop.name}
                                                </span>
                                            </div>
                                            {String(selectedShopId) === String(shop.id) && <CheckCircle size={14} color="#d4af37" />}
                                        </button>
                                    ))}

                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

                                    <button
                                        type="button"
                                        onClick={() => { setIsShopSwitcherOpen(false); setIsBranchModalOpen(true); }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '9px 12px',
                                            background: 'rgba(212, 175, 55, 0.1)',
                                            border: '1px dashed var(--color-gold, #d4af37)',
                                            borderRadius: '8px',
                                            color: 'var(--color-gold, #d4af37)',
                                            cursor: 'pointer',
                                            fontSize: '0.84rem',
                                            fontWeight: '700'
                                        }}
                                    >
                                        <Plus size={14} />
                                        <span>{isRTL ? 'إضافة فرع جديد' : 'Add New Branch'}</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Add Branch Action Button */}
                        <button
                            type="button"
                            onClick={() => setIsBranchModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '9px 16px',
                                background: 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#000',
                                fontSize: '0.86rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)'
                            }}
                        >
                            <Plus size={16} />
                            <span>{isRTL ? 'فرع جديد' : 'New Branch'}</span>
                        </button>

                        {/* Topbar Personal Profile Avatar Widget */}
                        <div 
                            className="vendor-topbar-avatar-widget"
                            onClick={() => { setProfileModalTab('user'); setIsProfileModalOpen(true); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '4px 12px 4px 6px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                borderRadius: '30px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            title={isRTL ? 'إدارة صورتك الشخصية وشعار المتجر' : 'Manage Profile Photo & Shop Logo'}
                        >
                            <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: '2px solid #d4af37',
                                    background: '#1e293b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt={user?.name || 'Vendor'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '0.88rem' }}>
                                            {getUserInitials(user?.name)}
                                        </span>
                                    )}
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    bottom: -1,
                                    right: -1,
                                    width: '15px',
                                    height: '15px',
                                    borderRadius: '50%',
                                    background: '#d4af37',
                                    color: '#000',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
                                }}>
                                    <Camera size={9} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, textAlign: isRTL ? 'right' : 'left' }}>
                                <span style={{ color: '#f8fafc', fontSize: '0.84rem', fontWeight: '600', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user?.name || (isRTL ? 'التاجر' : 'Vendor')}
                                </span>
                                <span style={{ color: '#c8a951', fontSize: '0.70rem', fontWeight: '600' }}>
                                    {isRTL ? 'تعديل الصورة' : 'Edit Photo'}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="main-content-wrapper">
                    {/* 1. All-Round Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="vendor-overview-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Low Stock Alert Banner */}
                            {lowStockItems.length > 0 && (
                                <div style={{
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    borderRadius: '12px',
                                    padding: '14px 18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <AlertCircle size={22} color="#f59e0b" style={{ flexShrink: 0 }} />
                                        <div>
                                            <div style={{ color: '#f59e0b', fontWeight: '700', fontSize: '0.9rem' }}>
                                                {isRTL ? `تنبيه المخزون: ${lowStockItems.length} عطور قاربت على النفاد` : `Low Stock Alert: ${lowStockItems.length} fragrance products running low`}
                                            </div>
                                            <div style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '2px' }}>
                                                {isRTL 
                                                    ? 'عطور في فروعك تحتوي على 5 قطع أو أقل. يرجى تزويد المخزون لضمان استمرار المبيعات.' 
                                                    : 'Fragrance items with 5 or fewer units remaining. Restock to prevent order fulfillment disruption.'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('products')}
                                        style={{
                                            padding: '7px 14px',
                                            background: '#f59e0b',
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '700',
                                            fontSize: '0.82rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span>{isRTL ? 'إدارة المخزون الآن' : 'Manage Inventory'}</span>
                                        <ArrowUpRight size={14} />
                                    </button>
                                </div>
                            )}

                            {/* KPI Metrics Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid rgba(212, 175, 55, 0.25)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37' }}>
                                        <TrendingUp size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isRTL ? 'إجمالي المبيعات المجمعة' : 'Total Combined Sales'}</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>
                                            {Math.round(overviewStats.totalRevenue).toLocaleString()} {isRTL ? 'ر.ق' : 'QAR'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                                        <Target size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isRTL ? 'إجمالي طلبات الفروع' : 'Total Orders (All Branches)'}</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>
                                            {overviewStats.totalOrders}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                                        <PackageIcon size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isRTL ? 'المنتجات في المخزون' : 'Active Products in Stock'}</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>
                                            {overviewStats.totalProducts}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f472b6' }}>
                                        <CalendarCheck size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isRTL ? 'الحجوزات والاستلام' : 'In-Store Reservations'}</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>
                                            {overviewStats.totalReservations}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Branches Card Grid */}
                            <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Store size={20} color="#d4af37" />
                                            {isRTL ? 'فروع ومتاجر حسابك' : 'Your Boutiques & Branches'}
                                            <span style={{ fontSize: '0.8rem', background: 'rgba(212, 175, 55, 0.15)', color: '#d4af37', padding: '2px 8px', borderRadius: '12px' }}>
                                                {myShops.length}
                                            </span>
                                        </h2>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                                            {isRTL ? 'إدارة كل فرع على حدة، وتعديل بياناته ومنتجاته وساعات عمله' : 'Manage each branch individually or switch to inspect specific catalog and orders'}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsBranchModalOpen(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 14px',
                                            background: 'rgba(212, 175, 55, 0.15)',
                                            border: '1px solid rgba(212, 175, 55, 0.4)',
                                            borderRadius: '8px',
                                            color: '#d4af37',
                                            fontSize: '0.84rem',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        <Plus size={15} />
                                        {isRTL ? 'إضافة فرع جديد' : 'Add New Branch'}
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                    {myShops.map(shop => {
                                        const isCurrent = String(selectedShopId) === String(shop.id);
                                        return (
                                            <div 
                                                key={shop.id}
                                                style={{
                                                    background: '#18181b',
                                                    border: isCurrent ? '1px solid var(--color-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                                                    borderRadius: '12px',
                                                    padding: '18px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    position: 'relative'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {shop.logo_url || (shop.images && shop.images[0]) ? (
                                                        <img 
                                                            src={shop.logo_url || shop.images[0]} 
                                                            alt={shop.name} 
                                                            style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                                                        />
                                                    ) : (
                                                        <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37' }}>
                                                            <Store size={22} />
                                                        </div>
                                                    )}
                                                    <div style={{ overflow: 'hidden', flex: 1 }}>
                                                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {shop.name}
                                                        </h4>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                            <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                                                {isRTL ? 'معتمد' : 'Approved'}
                                                            </span>
                                                            {isCurrent && (
                                                                <span style={{ fontSize: '0.72rem', background: 'rgba(212, 175, 55, 0.15)', color: '#d4af37', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                                                                    {isRTL ? 'الفرع النشط' : 'Active Selection'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <MapPin size={13} color="#60a5fa" />
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shop.address || 'Qatar'}</span>
                                                    </div>
                                                    {shop.whatsapp_number && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Phone size={13} color="#34d399" />
                                                            <span>{shop.whatsapp_number}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedShopId(shop.id);
                                                            setShopData(shop);
                                                            setActiveTab('products');
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            padding: '7px 10px',
                                                            background: 'rgba(212, 175, 55, 0.15)',
                                                            border: '1px solid rgba(212, 175, 55, 0.35)',
                                                            borderRadius: '6px',
                                                            color: '#d4af37',
                                                            fontSize: '0.78rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {isRTL ? 'المنتجات' : 'Products'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedShopId(shop.id);
                                                            setShopData(shop);
                                                            setActiveTab('orders');
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            padding: '7px 10px',
                                                            background: 'rgba(255,255,255,0.06)',
                                                            border: '1px solid rgba(255,255,255,0.12)',
                                                            borderRadius: '6px',
                                                            color: '#e2e8f0',
                                                            fontSize: '0.78rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {isRTL ? 'الطلبات' : 'Orders'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedShopId(shop.id);
                                                            setShopData(shop);
                                                            setActiveTab('settings');
                                                        }}
                                                        style={{
                                                            padding: '7px 10px',
                                                            background: 'rgba(255,255,255,0.06)',
                                                            border: '1px solid rgba(255,255,255,0.12)',
                                                            borderRadius: '6px',
                                                            color: '#cbd5e1',
                                                            fontSize: '0.78rem',
                                                            cursor: 'pointer'
                                                        }}
                                                        title={isRTL ? 'إعدادات الفرع' : 'Branch Settings'}
                                                    >
                                                        <Settings size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Add Branch Card */}
                                    <div
                                        onClick={() => setIsBranchModalOpen(true)}
                                        style={{
                                            background: 'rgba(212, 175, 55, 0.04)',
                                            border: '1px dashed rgba(212, 175, 55, 0.4)',
                                            borderRadius: '12px',
                                            padding: '24px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            minHeight: '160px'
                                        }}
                                    >
                                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37' }}>
                                            <Plus size={22} />
                                        </div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#d4af37' }}>
                                            {isRTL ? 'إضافة فرع أو متجر جديد' : 'Add New Branch'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                                            {isRTL ? 'توسيع عملياتك بإضافة فرع جديد تحت حسابك' : 'Expand your boutique network in Qatar'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && <ProductManager isRTL={isRTL} shopId={effectiveShopId} isVendorContext={true} />}
                    {activeTab === 'orders' && <OrderManager isRTL={isRTL} shopId={effectiveShopId} />}
                    {activeTab === 'reservations' && <ReservationManager isRTL={isRTL} shopId={effectiveShopId} />}
                    {activeTab === 'devices' && <DeviceManager isRTL={isRTL} />}

                    {/* ── Financials & Payouts Tab ── */}
                    {activeTab === 'financials' && effectiveShopId && (
                        <div className="admin-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: 0 }}>
                                <div>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
                                        <DollarSign size={26} color="#c8a951" />
                                        {isRTL ? 'المالية، الأرباح ومسير الحساب' : 'Financials, Payouts & Settlement Ledger'}
                                    </h2>
                                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '6px 0 0 0' }}>
                                        {isRTL ? 'شفافية مالية مطلقة: مبيعات المتجر، استقطاع عمولة المنصة 10%، وإدارة الحوالات البنكية المباشرة.' : 'Complete financial transparency: gross boutique sales, automated 10% commission deductions, and direct IBAN wire settlements.'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={handleExportCSV}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            color: '#f8fafc',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            fontSize: '0.84rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <Download size={15} />
                                        {isRTL ? 'تحميل سجل الحساب (CSV)' : 'Export Ledger (CSV)'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsPayoutModalOpen(true)}
                                        style={{
                                            background: 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)',
                                            border: 'none',
                                            color: '#000000',
                                            padding: '8px 18px',
                                            borderRadius: '8px',
                                            fontSize: '0.84rem',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 4px 12px rgba(200, 169, 81, 0.3)'
                                        }}
                                    >
                                        <Wallet size={15} />
                                        {isRTL ? 'طلب سحب أرباح' : 'Request Payout'}
                                    </button>
                                </div>
                            </div>

                            {/* 4 Luxury KPI Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>{isRTL ? 'إجمالي المبيعات (Gross)' : 'Gross Sales'}</span>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                                            <TrendingUp size={18} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc' }}>
                                        {Number(financials.gross_sales || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>QAR</span>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                                        {isRTL ? 'مجموع مبيعات الفروع المعتمدة' : 'Cumulative verified boutique orders'}
                                    </div>
                                </div>

                                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>{isRTL ? 'عمولة المنصة (10%)' : 'Platform Commission (10%)'}</span>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                                            <Layers size={18} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f87171' }}>
                                        -{Number(financials.platform_fee || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#fca5a5' }}>QAR</span>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                                        {isRTL ? 'خصم تلقائي 10% للبنية التحتية' : '10% fixed marketplace infrastructure fee'}
                                    </div>
                                </div>

                                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid rgba(200, 169, 81, 0.45)', boxShadow: '0 4px 20px rgba(200, 169, 81, 0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#c8a951', fontWeight: '700' }}>{isRTL ? 'الرصيد المتاح للسحب' : 'Available for Payout'}</span>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(200, 169, 81, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8a951' }}>
                                            <Wallet size={18} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#c8a951' }}>
                                        {Number(financials.available_balance || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#ebb637' }}>QAR</span>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: '#4ade80', marginTop: '6px', fontWeight: '600' }}>
                                        ✓ {isRTL ? 'صافي أرباح جاهز للتحويل البنكي' : 'Net ready for immediate IBAN transfer'}
                                    </div>
                                </div>

                                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>{isRTL ? 'إجمالي المسحوبات المكتملة' : 'Total Paid Out'}</span>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                                            <CheckCircle size={18} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc' }}>
                                        {Number(financials.total_paid_out || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>QAR</span>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                                        {isRTL ? 'حوالات مصرفية مكتملة وموثقة' : 'Completed bank wire settlements'}
                                    </div>
                                </div>
                            </div>

                            {/* Bank Details Registration Card */}
                            <div className="settings-section-card" style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '24px' }}>
                                <div className="settings-section-header" style={{ marginBottom: '16px' }}>
                                    <h3 className="settings-section-title" style={{ fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Building2 size={18} color="#c8a951" />
                                        {isRTL ? 'بيانات الحساب البنكي لتحويل الأرباح (IBAN)' : 'Direct Boutique Settlement Account (IBAN Registration)'}
                                    </h3>
                                    <p className="settings-section-desc" style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                                        {isRTL ? 'سجل بيانات حسابك البنكي المعتمد في دولة قطر لإيداع الأرباح الدورية' : 'Register your verified bank account in Qatar for automated bi-weekly earnings settlements'}
                                    </p>
                                </div>

                                <form onSubmit={handleSavePayoutInfo}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                                                {isRTL ? 'اسم البنك' : 'Bank Name'}
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                placeholder="Qatar National Bank (QNB) / Masraf Al Rayan"
                                                value={payoutInfo.bank_name || ''}
                                                onChange={(e) => setPayoutInfo(prev => ({ ...prev, bank_name: e.target.value }))}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                                                {isRTL ? 'اسم صاحب الحساب (مطابق للرخصة)' : 'Account Beneficiary Name'}
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                placeholder="Perfume Boutique W.L.L"
                                                value={payoutInfo.account_name || ''}
                                                onChange={(e) => setPayoutInfo(prev => ({ ...prev, account_name: e.target.value }))}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                                                {isRTL ? 'رقم الآيبان (IBAN)' : 'IBAN Number'}
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                placeholder="QA00QNBA000000000000000000000"
                                                value={payoutInfo.iban || ''}
                                                onChange={(e) => setPayoutInfo(prev => ({ ...prev, iban: e.target.value }))}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                                                {isRTL ? 'رمز السويفت (SWIFT / BIC)' : 'SWIFT / BIC Code'}
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                placeholder="QNBAQAQA"
                                                value={payoutInfo.swift || ''}
                                                onChange={(e) => setPayoutInfo(prev => ({ ...prev, swift: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end' }}>
                                        <button
                                            type="submit"
                                            disabled={savingPayoutInfo}
                                            style={{
                                                background: '#c8a951',
                                                color: '#000',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '8px 20px',
                                                fontWeight: '700',
                                                fontSize: '0.84rem',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <Save size={14} />
                                            {savingPayoutInfo ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ الحساب البنكي' : 'Save Bank Details')}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Financial Transactions Ledger Table */}
                            <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Layers size={18} color="#c8a951" />
                                        {isRTL ? 'مسير العمليات المالية (Ledger)' : 'Boutique Settlement Journal'}
                                    </h3>
                                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                        {(financials.transactions || []).length} {isRTL ? 'معاملة مسجلة' : 'Recorded Transactions'}
                                    </span>
                                </div>

                                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                                    <table className="admin-table" style={{ width: '100%', margin: 0 }}>
                                        <thead>
                                            <tr>
                                                <th>{isRTL ? 'المعاملة' : 'Transaction Ref'}</th>
                                                <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                                <th>{isRTL ? 'النوع' : 'Type'}</th>
                                                <th style={{ textAlign: 'right' }}>{isRTL ? 'المبلغ الإجمالي' : 'Gross (QAR)'}</th>
                                                <th style={{ textAlign: 'right' }}>{isRTL ? 'عمولة المنصة 10%' : 'Fee 10%'}</th>
                                                <th style={{ textAlign: 'right' }}>{isRTL ? 'الصافي' : 'Net Available'}</th>
                                                <th style={{ textAlign: 'center' }}>{isRTL ? 'الحالة' : 'Status'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(financials.transactions || []).length > 0 ? (
                                                financials.transactions.map((t, idx) => (
                                                    <tr key={t.id || idx}>
                                                        <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#c8a951' }}>
                                                            #{String(t.id).slice(0, 8)}
                                                        </td>
                                                        <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                                                            {new Date(t.date || t.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td style={{ fontSize: '0.82rem' }}>
                                                            {t.type || 'Order Sale'}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#f8fafc' }}>
                                                            {Number(t.amount || 0).toFixed(2)}
                                                        </td>
                                                        <td style={{ textAlign: 'right', color: '#f87171' }}>
                                                            -{Number(t.fee || (t.amount * 0.1)).toFixed(2)}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: '800', color: '#4ade80' }}>
                                                            +{Number(t.net || (t.amount * 0.9)).toFixed(2)}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: '700' }}>
                                                                {t.status || 'Settled'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                                        {isRTL ? 'لا توجد معاملات مالية مسجلة بعد' : 'No financial transactions recorded yet for this branch.'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Request Payout Modal */}
                            {isPayoutModalOpen && (
                                <div style={{
                                    position: 'fixed',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.8)',
                                    backdropFilter: 'blur(5px)',
                                    zIndex: 99999,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '20px'
                                }}>
                                    <div style={{ background: '#1e293b', border: '1px solid #c8a951', borderRadius: '14px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
                                                <Wallet size={18} color="#c8a951" />
                                                {isRTL ? 'طلب سحب الأرباح' : 'Request Earnings Payout'}
                                            </h3>
                                            <button type="button" onClick={() => setIsPayoutModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
                                        </div>

                                        <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #334155' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isRTL ? 'الرصيد المتاح للسحب حالياً:' : 'Available Balance:'}</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#c8a951', marginTop: '2px' }}>
                                                {Number(financials.available_balance || 0).toLocaleString()} QAR
                                            </div>
                                        </div>

                                        <form onSubmit={handleRequestPayout}>
                                            <div className="form-group" style={{ marginBottom: '14px' }}>
                                                <label className="form-label" style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                                                    {isRTL ? 'المبلغ المطلوب سحبه (ر.ق)' : 'Requested Amount (QAR)'}
                                                </label>
                                                <input 
                                                    type="number"
                                                    step="0.01"
                                                    min="1"
                                                    max={financials.available_balance}
                                                    required
                                                    className="form-control"
                                                    placeholder="0.00"
                                                    value={payoutAmount}
                                                    onChange={(e) => setPayoutAmount(e.target.value)}
                                                />
                                            </div>

                                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                                <label className="form-label" style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                                                    {isRTL ? 'ملاحظات لقسم المالية (اختياري)' : 'Notes for Settlement Team (Optional)'}
                                                </label>
                                                <textarea 
                                                    className="form-control"
                                                    rows="2"
                                                    placeholder={isRTL ? 'مثال: أرباح منتصف الشهر' : 'e.g. Mid-month fragrance sales disbursement'}
                                                    value={payoutNotes}
                                                    onChange={(e) => setPayoutNotes(e.target.value)}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPayoutModalOpen(false)}
                                                    style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}
                                                >
                                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={payoutSubmitting}
                                                    style={{ background: '#c8a951', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: '800', cursor: 'pointer' }}
                                                >
                                                    {payoutSubmitting ? (isRTL ? 'جاري الإرسال...' : 'Submitting...') : (isRTL ? 'تأكيد السحب' : 'Confirm Payout')}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && effectiveShopId && (
                        <div className="admin-section">
                            <div className="manager-header" style={{ marginBottom: '24px' }}>
                                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Settings size={24} color="#c8a951" /> 
                                    {isRTL ? 'إعدادات وخيارات المتجر' : 'Shop Settings & Preferences'}
                                </h2>
                                <p style={{ color: '#94a3b8', fontSize: '0.86rem', margin: '6px 0 0 0' }}>
                                    {isRTL ? 'تحكم ببيانات المتجر، أوقات العمل، خيارات التوصيل، رسائل الطلبات، والتنبيهات' : 'Manage your boutique profile, business hours, delivery options, custom messages, and smart alerts'}
                                </p>
                            </div>
                            
                            {shopData ? (
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    setSavingSettings(true);
                                    try {
                                        const [res, settingsRes] = await Promise.all([
                                            api.put(`/shops/${effectiveShopId}`, {
                                                name: shopData.name,
                                                logo_url: shopData.logo_url,
                                                whatsapp_number: shopData.whatsapp_number,
                                                address: shopData.address,
                                                images: shopData.images
                                            }),
                                            api.put(`/shops/${effectiveShopId}/settings`, vendorPrefs)
                                        ]);

                                        if (res.status === 200 || res.data.success || settingsRes.status === 200) {
                                            showToast(isRTL ? 'تم حفظ جميع إعدادات المتجر في قاعدة البيانات بنجاح!' : 'All shop settings saved to database successfully!', 'success');
                                            if (res.data.shop) {
                                                setShopData(res.data.shop);
                                            }
                                        } else {
                                            showToast(`${isRTL ? 'فشل الحفظ' : 'Failed to save'}: ${res.data.error || res.data.message || 'Unknown error'}`, 'error');
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        showToast(e.response?.data?.error || (isRTL ? 'خطأ في الاتصال بالخادم' : 'Server connection error'), 'error');
                                    } finally {
                                        setSavingSettings(false);
                                    }
                                }}>
                                    {/* 1. Boutique Profile & Visual Identity */}
                                    <div className="settings-section-card">
                                        <div className="settings-section-header">
                                            <h3 className="settings-section-title">
                                                <Store size={18} color="#c8a951" />
                                                {isRTL ? 'معلومات وهوية المتجر' : 'Boutique Profile & Contact'}
                                            </h3>
                                            <p className="settings-section-desc">
                                                {isRTL ? 'البيانات الأساسية التي تظهر للعملاء في دليل المتاجر والصفحة الرئيسية' : 'Primary store identity visible across customer discovery and shop listings'}
                                            </p>
                                        </div>

                                        {/* Visual Identities Grid: Personal Merchant Avatar + Boutique Shop Logo */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                                            {/* Card 1: Personal Merchant Profile Photo */}
                                            <div className="vendor-logo-section" style={{ margin: 0, height: '100%', boxSizing: 'border-box' }}>
                                                <div className="vendor-logo-preview" style={{ borderRadius: '50%', border: '2px solid #d4af37' }}>
                                                    {user?.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user?.name || 'Vendor'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '1.6rem' }}>
                                                            {getUserInitials(user?.name)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="vendor-logo-info">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                        <UserIcon size={16} color="#c8a951" />
                                                        <h4 style={{ margin: 0, fontSize: '0.96rem', color: '#f8fafc', fontWeight: '700' }}>
                                                            {isRTL ? 'صورتك الشخصية (التاجر)' : 'Personal Merchant Photo'}
                                                        </h4>
                                                    </div>
                                                    <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                                                        {isRTL ? 'صورتك الشخصية كمالك للمتجر تظهر في الهوية وإشعارات الإدارة' : 'Your merchant face shown on dashboard, partner credentials, and orders'}
                                                    </p>
                                                    <div className="vendor-logo-actions">
                                                        <label 
                                                            htmlFor="vendor-user-avatar-input-settings" 
                                                            className="btn-logo-upload"
                                                            style={{ opacity: isUploadingUserAvatar ? 0.7 : 1, cursor: isUploadingUserAvatar ? 'wait' : 'pointer' }}
                                                        >
                                                            {isUploadingUserAvatar ? <RefreshCw size={14} className="spin-animation" /> : <Camera size={14} />}
                                                            <span>
                                                                {isUploadingUserAvatar 
                                                                    ? (isRTL ? 'جاري التحميل...' : 'Uploading...') 
                                                                    : (user?.avatar_url ? (isRTL ? 'تغيير صورتك' : 'Change Photo') : (isRTL ? 'رفع صورتك' : 'Upload Photo'))}
                                                            </span>
                                                        </label>
                                                        <input 
                                                            type="file" 
                                                            id="vendor-user-avatar-input-settings" 
                                                            accept="image/*" 
                                                            style={{ display: 'none' }} 
                                                            onChange={handleUserAvatarUpload} 
                                                            disabled={isUploadingUserAvatar}
                                                        />
                                                        {user?.avatar_url && (
                                                            <button 
                                                                type="button" 
                                                                className="btn-logo-remove" 
                                                                onClick={handleRemoveUserAvatar}
                                                                disabled={isUploadingUserAvatar}
                                                            >
                                                                <Trash2 size={14} />
                                                                <span>{isRTL ? 'حذف' : 'Remove'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card 2: Boutique Shop Logo & Brand */}
                                            {(() => {
                                                const currentLogo = shopData?.logo_url || (Array.isArray(shopData?.images) && shopData.images.length > 0 ? shopData.images[0] : '');
                                                return (
                                                    <div className="vendor-logo-section" style={{ margin: 0, height: '100%', boxSizing: 'border-box' }}>
                                                        <div className="vendor-logo-preview" style={{ borderRadius: '14px' }}>
                                                            {currentLogo ? (
                                                                <img src={currentLogo} alt="Shop Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <Store size={34} color="#c8a951" />
                                                            )}
                                                        </div>
                                                        <div className="vendor-logo-info">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                                <Store size={16} color="#c8a951" />
                                                                <h4 style={{ margin: 0, fontSize: '0.96rem', color: '#f8fafc', fontWeight: '700' }}>
                                                                    {isRTL ? 'شعار وهوية المتجر' : 'Boutique Storefront Logo'}
                                                                </h4>
                                                            </div>
                                                            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                                                                {isRTL ? 'شعار الفرع يظهر للعملاء في دليل المتاجر والصفحة الرئيسية' : 'Public boutique logo displayed to customers across store discovery'}
                                                            </p>
                                                            <div className="vendor-logo-actions">
                                                                <label 
                                                                    htmlFor="vendor-logo-file-input" 
                                                                    className="btn-logo-upload"
                                                                >
                                                                    <Upload size={14} />
                                                                    <span>{currentLogo ? (isRTL ? 'تغيير الشعار' : 'Change Logo') : (isRTL ? 'رفع الشعار' : 'Upload Logo')}</span>
                                                                </label>
                                                                <input 
                                                                    type="file" 
                                                                    id="vendor-logo-file-input" 
                                                                    accept="image/*" 
                                                                    style={{ display: 'none' }} 
                                                                    onChange={handleLogoUpload} 
                                                                />
                                                                {currentLogo && (
                                                                    <button 
                                                                        type="button" 
                                                                        className="btn-logo-remove" 
                                                                        onClick={removeLogo}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                        <span>{isRTL ? 'حذف' : 'Remove'}</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="settings-grid-2">
                                            {/* Shop Name */}
                                            <div className="form-group">
                                                <label className="form-label">
                                                    <Store size={15} color="#c8a951" />
                                                    {isRTL ? 'اسم المتجر' : 'Shop Name'}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    value={shopData.name || ''} 
                                                    onChange={(e) => setShopData({...shopData, name: e.target.value})}
                                                    required
                                                    placeholder={isRTL ? 'أدخل اسم متجرك' : 'Enter shop name'}
                                                />
                                            </div>

                                            {/* WhatsApp Number */}
                                            <div className="form-group">
                                                <label className="form-label">
                                                    <Phone size={15} color="#c8a951" />
                                                    {isRTL ? 'رقم الواتساب للطلبات' : 'WhatsApp Order Hotline'}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    placeholder="+974..."
                                                    value={shopData.whatsapp_number || ''} 
                                                    onChange={(e) => setShopData({...shopData, whatsapp_number: e.target.value})}
                                                />
                                                <small className="form-helper-text">
                                                    {isRTL ? 'الرقم الذي يتواصل عليه العملاء لتأكيد الحجز' : 'The number customers message for reservations and order confirmations'}
                                                </small>
                                            </div>
                                        </div>

                                        {/* Detailed Address */}
                                        <div className="form-group" style={{ marginTop: '8px' }}>
                                            <label className="form-label">
                                                <MapPin size={15} color="#c8a951" />
                                                {isRTL ? 'عنوان وموقع المتجر' : 'Detailed Shop Address'}
                                            </label>
                                            <textarea 
                                                className="form-control textarea-address" 
                                                rows="3"
                                                value={shopData.address || ''} 
                                                onChange={(e) => setShopData({...shopData, address: e.target.value})}
                                                placeholder={isRTL ? 'أدخل العنوان بالتفصيل، المدينة، واسم الشارع أو المول' : 'Enter detailed boutique address, mall/street, and city'}
                                            />
                                        </div>
                                    </div>

                                    {/* 2. Operational Hours & Availability */}
                                    <div className="settings-section-card">
                                        <div className="settings-section-header">
                                            <h3 className="settings-section-title">
                                                <Clock size={18} color="#c8a951" />
                                                {isRTL ? 'أوقات العمل واستقبال الطلبات' : 'Working Hours & Availability'}
                                            </h3>
                                            <p className="settings-section-desc">
                                                {isRTL ? 'تحديد مواعيد فتح المتجر واستقبال الحجوزات أو تعليقها مؤقتاً' : 'Configure operating hours and pause customer orders during holidays or renovations'}
                                            </p>
                                        </div>

                                        {/* Accepting Orders Toggle */}
                                        <div className="settings-toggle-row">
                                            <div className="settings-toggle-info">
                                                <div className="settings-toggle-label">
                                                    <span>{isRTL ? 'حالة استقبال الطلبات' : 'Accepting Orders & Inquiries'}</span>
                                                    {vendorPrefs.isAcceptingOrders ? (
                                                        <span className="settings-badge-active">
                                                            <CheckCircle size={12} /> {isRTL ? 'مفتوح للطلبات' : 'Active / Open'}
                                                        </span>
                                                    ) : (
                                                        <span className="settings-badge-paused">
                                                            <Clock size={12} /> {isRTL ? 'معلق مؤقتاً' : 'Temporarily Paused'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="settings-toggle-sub">
                                                    {isRTL ? 'عند التعطيل، سيتم إعلام العملاء بأن المتجر في فترة استراحة أو إجازة' : 'When disabled, customers are notified that your boutique is temporarily on pause or vacation'}
                                                </div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={vendorPrefs.isAcceptingOrders} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, isAcceptingOrders: e.target.checked }))} 
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>

                                        <div className="settings-grid-2" style={{ marginTop: '16px' }}>
                                            <div className="form-group">
                                                <label className="form-label">
                                                    <Clock size={15} color="#c8a951" />
                                                    {isRTL ? 'ساعة فتح المتجر اليومي' : 'Daily Opening Time'}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    placeholder="09:00 AM" 
                                                    value={vendorPrefs.openTime || ''} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, openTime: e.target.value }))} 
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">
                                                    <Clock size={15} color="#c8a951" />
                                                    {isRTL ? 'ساعة إغلاق المتجر اليومي' : 'Daily Closing Time'}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    placeholder="10:00 PM" 
                                                    value={vendorPrefs.closeTime || ''} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, closeTime: e.target.value }))} 
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginTop: '8px' }}>
                                            <label className="form-label">
                                                <CalendarCheck size={15} color="#c8a951" />
                                                {isRTL ? 'ملاحظة مواعيد يوم الجمعة والعطلات' : 'Friday & Weekend Special Hours'}
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                placeholder="04:00 PM - 11:30 PM (Friday)" 
                                                value={vendorPrefs.weekendHours || ''} 
                                                onChange={(e) => setVendorPrefs(prev => ({ ...prev, weekendHours: e.target.value }))} 
                                            />
                                        </div>
                                    </div>

                                    {/* 3. Order Fulfillment & Delivery Preferences */}
                                    <div className="settings-section-card">
                                        <div className="settings-section-header">
                                            <h3 className="settings-section-title">
                                                <Truck size={18} color="#c8a951" />
                                                {isRTL ? 'خيارات الاستلام والتوصيل' : 'Fulfillment & Delivery Options'}
                                            </h3>
                                            <p className="settings-section-desc">
                                                {isRTL ? 'حدد طرق الاستلام والتسليم المتاحة لزبائنك' : 'Configure delivery services and in-store boutique pickup availability'}
                                            </p>
                                        </div>

                                        {/* Boutique Pickup Toggle */}
                                        <div className="settings-toggle-row">
                                            <div className="settings-toggle-info">
                                                <div className="settings-toggle-label">
                                                    <Store size={15} color="#c8a951" />
                                                    <span>{isRTL ? 'الاستلام المباشر من المتجر (In-Store Pickup)' : 'In-Store Boutique Pickup'}</span>
                                                </div>
                                                <div className="settings-toggle-sub">
                                                    {isRTL ? 'السماح للزبون بحجز العطر أونلاين واستلامه وتجربته في المتجر' : 'Allow customers to reserve perfumes online and collect/sample at your shop'}
                                                </div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={vendorPrefs.allowStorePickup} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, allowStorePickup: e.target.checked }))} 
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>

                                        {/* Direct Home Delivery Toggle */}
                                        <div className="settings-toggle-row">
                                            <div className="settings-toggle-info">
                                                <div className="settings-toggle-label">
                                                    <Truck size={15} color="#c8a951" />
                                                    <span>{isRTL ? 'خدمة التوصيل المباشر للمنزل (Home Delivery)' : 'Direct Home Delivery'}</span>
                                                </div>
                                                <div className="settings-toggle-sub">
                                                    {isRTL ? 'توفير خدمة شحن وتوصيل الطلبات إلى عنوان العميل' : 'Provide direct local courier dispatch to customer destination'}
                                                </div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={vendorPrefs.allowHomeDelivery} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, allowHomeDelivery: e.target.checked }))} 
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>

                                        {/* Processing Window */}
                                        <div className="form-group" style={{ marginTop: '16px' }}>
                                            <label className="form-label">
                                                <Zap size={15} color="#c8a951" />
                                                {isRTL ? 'متوسط سرعة تجهيز وتوصيل الطلبات' : 'Standard Fulfillment Window'}
                                            </label>
                                            <select 
                                                className="form-control" 
                                                value={vendorPrefs.deliveryWindow || 'same_day'} 
                                                onChange={(e) => setVendorPrefs(prev => ({ ...prev, deliveryWindow: e.target.value }))}
                                            >
                                                <option value="express">{isRTL ? 'توصيل فوري سريع (2 - 4 ساعات)' : 'Express Courier (2 - 4 Hours)'}</option>
                                                <option value="same_day">{isRTL ? 'توصيل في نفس اليوم (Same Day)' : 'Same Day Delivery'}</option>
                                                <option value="next_day">{isRTL ? 'توصيل خلال 24 ساعة (Next Day)' : 'Next Day Delivery (24h)'}</option>
                                                <option value="standard">{isRTL ? '1 - 2 أيام عمل (1 - 2 Business Days)' : '1 - 2 Business Days'}</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* 4. WhatsApp Order Template & Smart Notifications */}
                                    <div className="settings-section-card">
                                        <div className="settings-section-header">
                                            <h3 className="settings-section-title">
                                                <MessageSquare size={18} color="#c8a951" />
                                                {isRTL ? 'رسائل الواتساب والتنبيهات' : 'WhatsApp Messages & Alerts'}
                                            </h3>
                                            <p className="settings-section-desc">
                                                {isRTL ? 'تخصيص نص رسالة الحجز وتفعيل إشعارات المخزون المنخفض' : 'Customize customer greeting messages and enable automated stock alert notifications'}
                                            </p>
                                        </div>

                                        {/* Custom WhatsApp Greeting */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <MessageSquare size={15} color="#c8a951" />
                                                {isRTL ? 'رسالة الترحيب التلقائية عند طلب الحجز عبر الواتساب' : 'Custom WhatsApp Order Greeting Template'}
                                            </label>
                                            <textarea 
                                                className="form-control textarea-address" 
                                                rows="2"
                                                placeholder={isRTL ? 'مرحباً! أود تأكيد حجز المنتج التالي من متجركم على بيرفيوم هب:' : 'Hello! I would like to reserve an item from your boutique on PerfumeHub:'}
                                                value={vendorPrefs.whatsappGreeting || ''} 
                                                onChange={(e) => setVendorPrefs(prev => ({ ...prev, whatsappGreeting: e.target.value }))}
                                            />
                                            <small className="form-helper-text">
                                                {isRTL ? 'الرسالة الأولية التي تظهر للعميل في محادثة الواتساب عند النقر على حجز المنتج' : 'Initial greeting pre-filled in customer WhatsApp chat when reserving perfumes from your boutique'}
                                            </small>
                                        </div>

                                        {/* Low Stock Alert Toggle */}
                                        <div className="settings-toggle-row" style={{ marginTop: '14px' }}>
                                            <div className="settings-toggle-info">
                                                <div className="settings-toggle-label">
                                                    <Bell size={15} color="#c8a951" />
                                                    <span>{isRTL ? 'تنبيه انخفاض المخزون (Low Stock Alert)' : 'Low Stock Warning Alerts'}</span>
                                                </div>
                                                <div className="settings-toggle-sub">
                                                    {isRTL ? 'إظهار شارة تنبيه عندما يصل مخزون أي عطر إلى أقل من 3 حبات' : 'Display alert badge when product stock drops below 3 units'}
                                                </div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={vendorPrefs.notifyLowStock} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, notifyLowStock: e.target.checked }))} 
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>

                                        {/* Reservation Alerts */}
                                        <div className="settings-toggle-row">
                                            <div className="settings-toggle-info">
                                                <div className="settings-toggle-label">
                                                    <CalendarCheck size={15} color="#c8a951" />
                                                    <span>{isRTL ? 'تنبيهات الحجوزات الجديدة' : 'Instant Reservation Alerts'}</span>
                                                </div>
                                                <div className="settings-toggle-sub">
                                                    {isRTL ? 'تلقي إشعارات فورية عند تسجيل حجز جديد من العملاء' : 'Receive instant status alerts when customers submit new reservation requests'}
                                                </div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={vendorPrefs.notifyNewReservations} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, notifyNewReservations: e.target.checked }))} 
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* 5. Account & Plan Overview */}
                                    <div className="settings-section-card">
                                        <div className="settings-section-header">
                                            <h3 className="settings-section-title">
                                                <ShieldCheck size={18} color="#c8a951" />
                                                {isRTL ? 'بيانات الحساب والاشتراك' : 'Account & Subscription Overview'}
                                            </h3>
                                            <p className="settings-section-desc">
                                                {isRTL ? 'معلومات اعتماد البائع وخطة الاشتراك الحالية' : 'Vendor partner credentials and active subscription tier'}
                                            </p>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                                            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>{isRTL ? 'معرف المتجر' : 'Shop ID'}</div>
                                                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#c8a951', marginTop: '4px' }}>#{effectiveShopId || '---'}</div>
                                            </div>

                                            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>{isRTL ? 'حالة الاعتماد' : 'Verification Status'}</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#4ade80', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <CheckCircle size={14} /> {isRTL ? 'بائع معتمد' : 'Verified Vendor'}
                                                </div>
                                            </div>

                                            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>{isRTL ? 'البريد الإلكتروني' : 'Account Email'}</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f8fafc', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'N/A'}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <button 
                                                type="button" 
                                                className="btn-logo-upload"
                                                onClick={() => setActiveTab('billing')}
                                                style={{ height: '38px', fontSize: '0.82rem' }}
                                            >
                                                <CreditCard size={15} />
                                                <span>{isRTL ? 'إدارة الاشتراك والفوترة' : 'Manage Subscription & Plans'}</span>
                                            </button>
                                            <button 
                                                type="button" 
                                                className="btn-logo-upload"
                                                onClick={() => setActiveTab('devices')}
                                                style={{ height: '38px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.05)', borderColor: '#334155', color: '#cbd5e1' }}
                                            >
                                                <Smartphone size={15} />
                                                <span>{isRTL ? 'إدارة الأجهزة المسجلة' : 'Manage Connected Devices'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Unified Save Changes Button */}
                                    <div style={{ marginTop: '28px', marginBottom: '20px' }}>
                                        <button type="submit" className="btn-save-settings" disabled={savingSettings}>
                                            <Save size={18} />
                                            {savingSettings ? (isRTL ? 'جاري حفظ التغييرات...' : 'Saving All Settings...') : (isRTL ? 'حفظ جميع الإعدادات' : 'Save All Settings')}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <p style={{ color: '#94a3b8' }}>{isRTL ? 'جاري تحميل البيانات...' : 'Loading...'}</p>
                            )}
                        </div>
                    )}
                    {activeTab === 'billing' && (
                        <div className="admin-section">
                            <div className="manager-header">
                                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CreditCard size={24} color="#c8a951" />
                                    {isRTL ? 'الاشتراكات والفوترة' : 'Billing & Subscription'}
                                </h2>
                            </div>

                            {!effectiveShopId && (
                                <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(200, 169, 81, 0.1)', border: '1px solid #c8a951', borderRadius: '12px', color: '#fff', fontSize: '0.95rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <ShieldCheck size={20} color="#c8a951" style={{ flexShrink: 0 }} />
                                        <span>
                                            {isRTL 
                                                ? 'يرجى الاشتراك في خطة اشتراك لتفعيل متجرك وبدء بيع منتجاتك.' 
                                                : 'Please subscribe to a plan to activate your shop and start selling.'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {loadingBilling ? (
                                <div className="text-center p-4" style={{ color: '#94a3b8' }}>
                                    {isRTL ? 'جاري تحميل بيانات الفوترة...' : 'Loading billing data...'}
                                </div>
                            ) : mySubscription ? (
                                <div className="admin-card" style={{ padding: '30px', background: '#1e293b', border: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                                        <div>
                                            <span style={{ background: '#c8a95122', color: '#c8a951', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {isRTL ? 'خطة نشطة' : 'Active Plan'}
                                            </span>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginTop: '12px', marginBottom: '8px' }}>
                                                {mySubscription.plan?.name}
                                            </h3>
                                            <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '500px' }}>
                                                {mySubscription.plan?.description}
                                            </p>
                                            
                                            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                                                        {isRTL ? 'تكلفة الاشتراك' : 'Subscription Cost'}
                                                    </div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                                                        {mySubscription.plan?.price} QAR / {isRTL ? (mySubscription.plan?.interval === 'year' ? 'سنة' : 'شهر') : mySubscription.plan?.interval}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                                                        {isRTL ? 'تاريخ التجديد التالي' : 'Next Renewal Date'}
                                                    </div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                                                        {mySubscription.current_period_end ? new Date(mySubscription.current_period_end).toLocaleDateString(isRTL ? 'ar-QA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '12px', border: '1px solid #334155', minWidth: '250px' }}>
                                            <h4 style={{ color: '#fff', marginBottom: '12px', fontSize: '0.95rem' }}>{isRTL ? 'ميزات الخطة' : 'Plan Features'}</h4>
                                            {mySubscription.plan?.features && mySubscription.plan.features.length > 0 ? (
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {mySubscription.plan.features.map((feature, idx) => (
                                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                                                            <CheckCircle size={14} style={{ color: '#c8a951', flexShrink: 0 }} />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>{isRTL ? 'لا توجد ميزات مدرجة' : 'No features listed'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '30px', borderTop: '1px solid #334155', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button 
                                            type="button" 
                                            className="btn btn-outline" 
                                            style={{ borderColor: '#ef444433', color: '#ef4444' }}
                                            onClick={() => setCancelConfirmModal(true)}
                                        >
                                            {isRTL ? 'إلغاء الاشتراك' : 'Cancel Subscription'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                        <h3 style={{ fontSize: '1.5rem', color: '#fff', fontWeight: '700' }}>
                                            {isRTL ? 'اختر خطة لتنشيط متجرك' : 'Choose a Plan to Activate Your Shop'}
                                        </h3>
                                        <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '0.95rem' }}>
                                            {isRTL 
                                                ? 'اشترك لفتح ميزات البيع المتقدمة والترويج لمنتجاتك' 
                                                : 'Subscribe to unlock advanced selling features and promote your products'}
                                        </p>
                                    </div>

                                    <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                                        {availablePlans.map(plan => (
                                            <div key={plan.id} className="admin-card" style={{ padding: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <div style={{ flex: 1 }}>
                                                    <h4 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{plan.name}</h4>
                                                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4' }}>{plan.description}</p>
                                                    
                                                    <div style={{ margin: '20px 0', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                        <span style={{ fontSize: '2rem', fontWeight: '800', color: '#c8a951' }}>{plan.price} QAR</span>
                                                        <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>/ {isRTL ? (plan.interval === 'year' ? 'سنوياً' : 'شهرياً') : plan.interval}</span>
                                                    </div>

                                                    {plan.features && plan.features.length > 0 && (
                                                        <div style={{ borderTop: '1px solid #334155', paddingTop: '16px', marginTop: '16px' }}>
                                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                {plan.features.map((feature, idx) => (
                                                                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                                                                        <CheckCircle size={14} style={{ color: '#c8a951', flexShrink: 0 }} />
                                                                        <span>{feature}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>

                                                <button 
                                                    type="button" 
                                                    className="btn btn-gold" 
                                                    style={{ width: '100%', marginTop: '24px', height: '40px' }}
                                                    onClick={() => setSubConfirmModal({ isOpen: true, plan })}
                                                >
                                                    {isRTL ? 'اشترك الآن' : 'Subscribe Now'}
                                                </button>
                                            </div>
                                        ))}

                                        {availablePlans.length === 0 && (
                                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '2px dashed #334155' }}>
                                                <p style={{ color: '#94a3b8' }}>{isRTL ? 'لا توجد خطط اشتراك متاحة حالياً.' : 'No subscription plans available currently.'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <ConfirmModal
                                isOpen={subConfirmModal.isOpen}
                                onClose={() => setSubConfirmModal({ isOpen: false, plan: null })}
                                onConfirm={handleSubscribe}
                                title={isRTL ? 'تأكيد الاشتراك' : 'Confirm Subscription'}
                                message={
                                    isRTL
                                        ? `هل ترغب في الاشتراك في خطة "${subConfirmModal.plan?.name}" مقابل ${subConfirmModal.plan?.price} QAR؟`
                                        : `Do you want to subscribe to the "${subConfirmModal.plan?.name}" plan for ${subConfirmModal.plan?.price} QAR?`
                                }
                                confirmText={isRTL ? 'اشترك' : 'Subscribe'}
                                cancelText={isRTL ? 'إلغاء' : 'Cancel'}
                                isRTL={isRTL}
                                variant="gold"
                                isPremium={true}
                                iconType="alert"
                            />

                            <ConfirmModal
                                isOpen={cancelConfirmModal}
                                onClose={() => setCancelConfirmModal(false)}
                                onConfirm={handleCancelSubscription}
                                title={isRTL ? 'إلغاء الاشتراك' : 'Cancel Subscription'}
                                message={
                                    isRTL
                                        ? 'هل أنت متأكد من إلغاء خطة اشتراكك الحالية؟ ستفقد إمكانية الوصول إلى الميزات المميزة.'
                                        : 'Are you sure you want to cancel your current subscription plan? You will lose access to premium selling features.'
                                }
                                confirmText={isRTL ? 'إلغاء الاشتراك' : 'Cancel Subscription'}
                                cancelText={isRTL ? 'إبقاء الاشتراك' : 'Keep Subscription'}
                                isRTL={isRTL}
                                variant="danger"
                                iconType="trash"
                            />
                        </div>
                    )}
                </div>
            </main>

            <AddBranchModal
                isOpen={isBranchModalOpen}
                onClose={() => setIsBranchModalOpen(false)}
                onBranchCreated={handleBranchCreated}
                isRTL={isRTL}
            />

            {/* Luxury Profile Photo & Boutique Logo Modal */}
            {isProfileModalOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}
                    onClick={() => setIsProfileModalOpen(false)}
                >
                    <div 
                        style={{
                            background: '#111827',
                            border: '1px solid rgba(212, 175, 55, 0.4)',
                            borderRadius: '20px',
                            maxWidth: '480px',
                            width: '100%',
                            padding: '28px',
                            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(212, 175, 55, 0.15)',
                            position: 'relative',
                            direction: isRTL ? 'rtl' : 'ltr'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Camera size={20} color="#d4af37" />
                                    <span>{isRTL ? 'إدارة الهوية والصور' : 'Profile & Visual Identity'}</span>
                                </h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {isRTL ? 'تعديل صورتك الشخصية كتاجر أو شعار فرعك' : 'Update your personal merchant avatar or boutique logo'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsProfileModalOpen(false)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Tabs: Personal vs Boutique */}
                        <div style={{
                            display: 'flex',
                            background: 'rgba(255, 255, 255, 0.04)',
                            padding: '4px',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            border: '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                            <button
                                type="button"
                                onClick={() => setProfileModalTab('user')}
                                style={{
                                    flex: 1,
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: profileModalTab === 'user' ? 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)' : 'transparent',
                                    color: profileModalTab === 'user' ? '#000' : '#94a3b8',
                                    fontWeight: '700',
                                    fontSize: '0.84rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <UserIcon size={15} />
                                <span>{isRTL ? 'صورتك الشخصية' : 'Personal Photo'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setProfileModalTab('shop')}
                                style={{
                                    flex: 1,
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: profileModalTab === 'shop' ? 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)' : 'transparent',
                                    color: profileModalTab === 'shop' ? '#000' : '#94a3b8',
                                    fontWeight: '700',
                                    fontSize: '0.84rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Store size={15} />
                                <span>{isRTL ? 'شعار المتجر' : 'Boutique Logo'}</span>
                            </button>
                        </div>

                        {/* Modal Tab 1: Personal Profile Photo */}
                        {profileModalTab === 'user' && (
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '3px solid #d4af37',
                                        background: '#1e293b',
                                        boxShadow: '0 8px 24px rgba(212, 175, 55, 0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {user?.avatar_url ? (
                                            <img src={user.avatar_url} alt={user?.name || 'Vendor'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '2.5rem' }}>
                                                {getUserInitials(user?.name)}
                                            </span>
                                        )}
                                    </div>
                                    <label
                                        htmlFor="modal-user-avatar-input"
                                        style={{
                                            position: 'absolute',
                                            bottom: 4,
                                            right: 4,
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: '#d4af37',
                                            color: '#000',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                                            transition: 'transform 0.15s ease'
                                        }}
                                        title={isRTL ? 'تغيير الصورة' : 'Change Photo'}
                                    >
                                        <Camera size={16} />
                                    </label>
                                    <input
                                        type="file"
                                        id="modal-user-avatar-input"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleUserAvatarUpload}
                                        disabled={isUploadingUserAvatar}
                                    />
                                </div>

                                <div>
                                    <h4 style={{ margin: '0 0 4px', color: '#f8fafc', fontSize: '1.1rem', fontWeight: '700' }}>
                                        {user?.name || (isRTL ? 'التاجر المعتمد' : 'Boutique Partner')}
                                    </h4>
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem' }}>
                                        {user?.email || (isRTL ? 'حساب بائع معتمد' : 'Verified Merchant Account')}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                                    <label
                                        htmlFor="modal-user-avatar-input"
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            background: 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)',
                                            borderRadius: '10px',
                                            color: '#000',
                                            fontWeight: '700',
                                            fontSize: '0.88rem',
                                            cursor: isUploadingUserAvatar ? 'wait' : 'pointer',
                                            opacity: isUploadingUserAvatar ? 0.7 : 1
                                        }}
                                    >
                                        {isUploadingUserAvatar ? <RefreshCw size={16} className="spin-animation" /> : <Upload size={16} />}
                                        <span>
                                            {isUploadingUserAvatar 
                                                ? (isRTL ? 'جاري الرفع...' : 'Uploading...') 
                                                : (user?.avatar_url ? (isRTL ? 'تغيير صورتك' : 'Upload New Photo') : (isRTL ? 'رفع صورة شخصية' : 'Upload Photo'))}
                                        </span>
                                    </label>

                                    {user?.avatar_url && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveUserAvatar}
                                            disabled={isUploadingUserAvatar}
                                            style={{
                                                padding: '10px 16px',
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: '10px',
                                                color: '#f87171',
                                                fontWeight: '600',
                                                fontSize: '0.88rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <Trash2 size={16} />
                                            <span>{isRTL ? 'حذف' : 'Remove'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Modal Tab 2: Boutique Shop Logo */}
                        {profileModalTab === 'shop' && (
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        border: '3px solid #d4af37',
                                        background: '#1e293b',
                                        boxShadow: '0 8px 24px rgba(212, 175, 55, 0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {shopData?.logo_url ? (
                                            <img src={shopData.logo_url} alt="Shop Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Store size={48} color="#d4af37" />
                                        )}
                                    </div>
                                    <label
                                        htmlFor="modal-shop-logo-input"
                                        style={{
                                            position: 'absolute',
                                            bottom: 4,
                                            right: 4,
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: '#d4af37',
                                            color: '#000',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.6)'
                                        }}
                                        title={isRTL ? 'تغيير الشعار' : 'Change Logo'}
                                    >
                                        <Camera size={16} />
                                    </label>
                                    <input
                                        type="file"
                                        id="modal-shop-logo-input"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleLogoUpload}
                                    />
                                </div>

                                <div>
                                    <h4 style={{ margin: '0 0 4px', color: '#f8fafc', fontSize: '1.1rem', fontWeight: '700' }}>
                                        {shopData?.name || (isRTL ? 'فرع المتجر' : 'Boutique Branch')}
                                    </h4>
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem' }}>
                                        {isRTL ? 'شعار الفرع المعروض للزبائن في دليل المتاجر' : 'Public storefront identity shown on boutique discovery'}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                                    <label
                                        htmlFor="modal-shop-logo-input"
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            background: 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)',
                                            borderRadius: '10px',
                                            color: '#000',
                                            fontWeight: '700',
                                            fontSize: '0.88rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Upload size={16} />
                                        <span>
                                            {shopData?.logo_url ? (isRTL ? 'تغيير الشعار' : 'Upload New Logo') : (isRTL ? 'رفع شعار الفرع' : 'Upload Logo')}
                                        </span>
                                    </label>

                                    {shopData?.logo_url && (
                                        <button
                                            type="button"
                                            onClick={removeLogo}
                                            style={{
                                                padding: '10px 16px',
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: '10px',
                                                color: '#f87171',
                                                fontWeight: '600',
                                                fontSize: '0.88rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <Trash2 size={16} />
                                            <span>{isRTL ? 'حذف' : 'Remove'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setIsProfileModalOpen(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    fontSize: '0.84rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    padding: '6px 12px'
                                }}
                            >
                                {isRTL ? 'إغلاق النافذة' : 'Done / Close Window'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorPanel;

