import React, { useContext, useState, useMemo, useEffect } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api_v1_0_2';
import { 
    TrendingUp, DollarSign, ShoppingBag, Users, X, Activity, 
    AlertCircle, Package as PackageIcon, Search, Crown, Sparkles, 
    Truck, Store, CheckCircle, Percent, Compass, Download, 
    FileSpreadsheet, ShieldCheck, Clock, ArrowUpRight
} from 'lucide-react';

const isTraditionalOud = (item) => {
    const text = `${item.name || ''} ${item.brand || ''} ${item.category || ''} ${item.type || ''}`.toLowerCase();
    return (
        text.includes('oud') ||
        text.includes('عود') ||
        text.includes('دهن') ||
        text.includes('dehn') ||
        text.includes('bukhoor') ||
        text.includes('بخور') ||
        text.includes('amber') ||
        text.includes('عنبر') ||
        text.includes('musk') ||
        text.includes('مسك') ||
        text.includes('attar') ||
        text.includes('oriental') ||
        text.includes('شرقي') ||
        text.includes('taif') ||
        text.includes('طائفي')
    );
};

const ReportsManager = ({ isRTL, activeTerritoryId, adminRegions }) => {
    const { orders, products, shops, updateProduct } = useContext(ShopContext);
    const { user } = useContext(AuthContext);
    const isRegionalAdmin = user?.role === 'regional_admin';
    const adminRegionIds = useMemo(() => {
        return user?.assignedRegionIds || (adminRegions || []).map(r => r.id);
    }, [user?.assignedRegionIds, adminRegions]);

    // Territory currency & metadata
    const activeRegionObj = useMemo(() => {
        if (activeTerritoryId && activeTerritoryId !== 'all') {
            return (adminRegions || []).find(r => String(r.id) === String(activeTerritoryId));
        }
        if (isRegionalAdmin && adminRegions?.length) {
            return adminRegions[0];
        }
        return null;
    }, [activeTerritoryId, adminRegions, isRegionalAdmin]);

    const territoryCurrency = activeRegionObj?.currency_code || 'QAR';
    const territoryName = activeRegionObj ? activeRegionObj.name : (isRegionalAdmin ? (isRTL ? 'الإقليم المخصص' : 'Assigned Territory') : (isRTL ? 'جميع المناطق' : 'All Regions'));

    // Filter shops and orders to active territory
    const territoryShops = useMemo(() => {
        if (!shops || shops.length === 0) return [];
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

    const territoryShopIds = useMemo(() => new Set(territoryShops.map(s => String(s.id))), [territoryShops]);

    const territoryOrders = useMemo(() => {
        if (!isRegionalAdmin && (!activeTerritoryId || activeTerritoryId === 'all')) {
            return orders || [];
        }
        return (orders || []).filter(order => {
            if (order.shop_id && territoryShopIds.has(String(order.shop_id))) return true;
            if (order.pickup_shop_id && territoryShopIds.has(String(order.pickup_shop_id))) return true;
            if (order.shop_ids && Array.isArray(order.shop_ids)) {
                if (order.shop_ids.some(id => territoryShopIds.has(String(id)))) return true;
            }
            if (order.items && Array.isArray(order.items)) {
                return order.items.some(item => {
                    const sId = item.shop_id || (item.product && item.product.shop_id);
                    return sId && territoryShopIds.has(String(sId));
                });
            }
            return false;
        });
    }, [orders, territoryShopIds, isRegionalAdmin, activeTerritoryId]);

    const [activeDrillDown, setActiveDrillDown] = useState(null);
    const [editingStock, setEditingStock] = useState({}); // { productId: value }
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const [activeSubTab, setActiveSubTab] = useState('analytics'); // 'analytics' | 'financial'
    const [financials, setFinancialData] = useState(null);
    const [payouts, setPayoutsList] = useState([]);
    const [loadingFinancials, setLoadingFinancial] = useState(false);
    const [payoutActionLoading, setProcessingPayoutId] = useState(null);

    const fetchFinancials = async () => {
        setLoadingFinancial(true);
        try {
            const [summaryRes, payoutsRes] = await Promise.all([
                api.get('/admin/financial-summary'),
                api.get('/admin/payouts')
            ]);
            setFinancialData(summaryRes.data);
            setPayoutsList(Array.isArray(payoutsRes.data) ? payoutsRes.data : []);
        } catch (err) {
            console.error('Failed to fetch financial command center data:', err);
        } finally {
            setLoadingFinancial(false);
        }
    };

    useEffect(() => {
        if (activeSubTab === 'financial' && !financials) {
            fetchFinancials();
        }
    }, [activeSubTab]);

    const handleApprovePayout = async (payoutId) => {
        setProcessingPayoutId(payoutId);
        try {
            const res = await api.post(`/admin/payouts/${payoutId}/approve`);
            if (res.data?.success) {
                setPayoutsList(prev => prev.map(p => String(p.id) === String(payoutId) ? { ...p, status: 'completed', processed_at: new Date().toISOString() } : p));
                alert(isRTL ? '✅ تم اعتماد صرف المستحقات بنجاح وتحديث سجل التسوية البنكية!' : '✅ Payout approved and recorded in bank settlement ledger!');
                fetchFinancials();
            }
        } catch (err) {
            console.error('Payout approval failed:', err);
            alert(isRTL ? 'فشل اعتماد صرف المستحقات' : 'Failed to approve payout');
        } finally {
            setProcessingPayoutId(null);
        }
    };

    const handleExportReconciliationCsv = async () => {
        try {
            const res = await api.get('/admin/payouts/export-reconciliation', { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `GCC_Vendor_Payouts_Reconciliation_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('CSV export failed:', err);
            alert(isRTL ? 'فشل تصدير ملف التسوية البنكية' : 'Failed to export bank reconciliation CSV');
        }
    };

    const activeOrders = territoryOrders.filter(o => o.status?.toLowerCase() !== 'cancelled');
    
    const totalRevenue = activeOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    const totalOrders = activeOrders.length;

    // Calculate total units sold
    const totalUnitsSold = activeOrders.reduce((total, order) => {
        return total + (order.items || []).reduce((itemSum, item) => itemSum + (Number(item.quantity) || 1), 0);
    }, 0);

    // Today's Sales calculation - ensure YYYY-MM-DD match
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = activeOrders.filter(order => {
        const orderDate = order.date?.includes('T') ? order.date.split('T')[0] : order.date;
        return orderDate === today;
    });
    const todaySales = todayOrders.length;
    const todayRevenue = todayOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);

    const outOfStockList = products.filter(p => p.stock === 0);
    const outOfStockProducts = outOfStockList.length;

    // Dynamic customer count from active orders (unique email or phone)
    const uniqueCustomers = new Set(activeOrders.map(o => o.email?.toLowerCase() || o.phone || o.customerName));
    const totalCustomers = uniqueCustomers.size || 0;

    const lowStockList = products.filter(p => p.stock !== undefined && p.stock < 20);
    const lowStockProducts = lowStockList.length;
    const totalProductsListing = products.length;

    // Date helper for filtering orders
    const getOrdersInLastDays = (days) => {
        const threshold = new Date(Date.now() - days * 86400000);
        return territoryOrders.filter(order => new Date(order.date || order.created_at) >= threshold);
    };

    const orders30Days = getOrdersInLastDays(30);
    const orders7Days = getOrdersInLastDays(7);

    // Calculate sales statistics for a given set of orders
    const getProductSales = (orderList) => {
        let sales = {};
        orderList.forEach(order => {
            (order.items || []).forEach(item => {
                const name = item.name || 'Perfume';
                sales[name] = (sales[name] || 0) + (Number(item.quantity) || 1);
            });
        });
        return Object.entries(sales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    };

    const bestSelling30Days = getProductSales(orders30Days);
    const trending7Days = getProductSales(orders7Days);

    // Recent orders for the activity feed
    const recentOrders = [...territoryOrders].reverse().slice(0, 5);

    // French Designer vs Traditional Oud Comparison
    const fragranceComparison = useMemo(() => {
        let oudSales = 0;
        let oudQty = 0;
        let frenchSales = 0;
        let frenchQty = 0;
        const productStats = {};

        activeOrders.forEach(order => {
            (order.items || []).forEach(item => {
                const isOud = isTraditionalOud(item);
                const itemTotal = (parseFloat(item.price) || 0) * (Number(item.quantity) || 1);
                const qty = Number(item.quantity) || 1;

                if (isOud) {
                    oudSales += itemTotal;
                    oudQty += qty;
                } else {
                    frenchSales += itemTotal;
                    frenchQty += qty;
                }

                const key = item.name || 'Perfume';
                if (!productStats[key]) {
                    productStats[key] = {
                        name: key,
                        brand: item.brand || '',
                        qty: 0,
                        revenue: 0,
                        isOud
                    };
                }
                productStats[key].qty += qty;
                productStats[key].revenue += itemTotal;
            });
        });

        const totalMarketSales = oudSales + frenchSales;
        const oudPercent = totalMarketSales > 0 ? Math.round((oudSales / totalMarketSales) * 100) : 50;
        const frenchPercent = 100 - oudPercent;

        const topFragrances = Object.values(productStats)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        return {
            oudSales,
            oudQty,
            frenchSales,
            frenchQty,
            oudPercent,
            frenchPercent,
            topFragrances
        };
    }, [activeOrders]);

    // Top Performing Boutiques in Territory
    const topBoutiques = useMemo(() => {
        const stats = {};
        territoryShops.forEach(shop => {
            stats[shop.id] = {
                id: shop.id,
                name: shop.name,
                address: shop.address,
                revenue: 0,
                orders: 0
            };
        });

        activeOrders.forEach(order => {
            const sId = order.shop_id || order.pickup_shop_id || (order.items?.[0]?.shop_id);
            if (sId && stats[sId]) {
                stats[sId].orders += 1;
                stats[sId].revenue += (parseFloat(order.total) || 0);
            }
        });

        return Object.values(stats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }, [territoryShops, activeOrders]);

    // Click & Collect (Pickup) vs Home Delivery Ratio
    const fulfillmentStats = useMemo(() => {
        let pickupCount = 0;
        let deliveryCount = 0;

        activeOrders.forEach(order => {
            const fType = (order.fulfillment_type || order.delivery_method || '').toLowerCase();
            const isPickup = fType.includes('pickup') || fType.includes('collect') || order.pickup_shop_id || (order.status || '').toLowerCase() === 'reserved';
            if (isPickup) {
                pickupCount += 1;
            } else {
                deliveryCount += 1;
            }
        });

        const total = pickupCount + deliveryCount;
        const pickupPct = total > 0 ? Math.round((pickupCount / total) * 100) : 0;
        const deliveryPct = total > 0 ? 100 - pickupPct : 100;

        return { pickupCount, deliveryCount, pickupPct, deliveryPct, total };
    }, [activeOrders]);

    return (
        <div className="manager-content animate-fade-in">
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#f8fafc' }}>
                        {isRTL ? 'المركز المالي والتقارير التنفيذية' : 'Executive Reports & Financial Center'}
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                        {isRTL ? 'متابعة المبيعات، عمولات المنصة، أرصدة الضمان المعلقة، وتسوية تحويلات البوتيكات' : 'Monitor sales, platform commissions, escrow holdings, and boutique payout clearances'}
                    </p>
                </div>

                {/* Sub-tab Navigation */}
                <div style={{ display: 'flex', gap: '8px', background: '#0f172a', padding: '5px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('analytics')}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.88rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: activeSubTab === 'analytics' ? 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)' : 'transparent',
                            color: activeSubTab === 'analytics' ? '#0f172a' : '#94a3b8'
                        }}
                    >
                        <TrendingUp size={16} />
                        {isRTL ? 'تحليلات المبيعات والإقليم' : 'Sales & Territory Analytics'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('financial')}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.88rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: activeSubTab === 'financial' ? 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)' : 'transparent',
                            color: activeSubTab === 'financial' ? '#0f172a' : '#94a3b8'
                        }}
                    >
                        <DollarSign size={16} />
                        {isRTL ? 'مركز التسوية المالية والضمان' : 'Financial Escrow & Settlements'}
                    </button>
                </div>
            </div>

            {activeSubTab === 'financial' ? (
                <div style={{ marginTop: '10px' }}>
                    {/* Financial Desk Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8', background: '#1e293b', padding: '6px 14px', borderRadius: '20px', border: '1px solid #334155' }}>
                                <ShieldCheck size={14} style={{ display: 'inline', marginRight: '6px', color: '#10b981' }} />
                                {isRTL ? 'نظام الضمان المالي المزدوج مفعل' : 'Dual-Ledger Escrow Guard Active'}
                            </span>
                            {loadingFinancials && <span style={{ color: '#d4af37', fontSize: '0.85rem' }}>{isRTL ? 'جاري تحديث البيانات...' : 'Refreshing ledger...'}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={fetchFinancials}
                                disabled={loadingFinancials}
                                style={{
                                    padding: '8px 16px',
                                    background: '#1e293b',
                                    color: '#f8fafc',
                                    border: '1px solid #475569',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '500'
                                }}
                            >
                                {isRTL ? 'تحديث البيانات' : 'Refresh Ledger'}
                            </button>
                            <button
                                onClick={handleExportReconciliationCsv}
                                style={{
                                    padding: '8px 16px',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                <Download size={15} />
                                {isRTL ? 'تصدير كشف التسوية البنكي (CSV)' : 'Export GCC Bank Reconciliation (CSV)'}
                            </button>
                        </div>
                    </div>

                    {/* 4 Financial KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        {/* GMV */}
                        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>
                                        {isRTL ? 'إجمالي حجم البضائع (GMV)' : 'Gross Merchandise Value (GMV)'}
                                    </p>
                                    <h3 style={{ margin: '8px 0 4px', fontSize: '1.75rem', color: '#f8fafc', fontWeight: '700' }}>
                                        {financials?.summary?.totalGmv?.toLocaleString() || 0} <span style={{ fontSize: '0.9rem', color: '#d4af37' }}>QAR</span>
                                    </h3>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>
                                        {isRTL ? 'إجمالي المبيعات المكتملة عبر جميع الأقاليم' : 'Settled transactions across all GCC regions'}
                                    </p>
                                </div>
                                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <DollarSign size={22} />
                                </div>
                            </div>
                        </div>

                        {/* Platform Commission */}
                        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>
                                        {isRTL ? 'صافي عمولة المنصة المكتسبة' : 'Platform Commission (Earned)'}
                                    </p>
                                    <h3 style={{ margin: '8px 0 4px', fontSize: '1.75rem', color: '#10b981', fontWeight: '700' }}>
                                        {financials?.summary?.totalCommission?.toLocaleString() || 0} <span style={{ fontSize: '0.9rem', color: '#10b981' }}>QAR</span>
                                    </h3>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>
                                        {isRTL ? 'بمعدل 7% - 10% حسب فئة اشتراك المتجر' : 'Calculated at 7% - 10% tier commission'}
                                    </p>
                                </div>
                                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Percent size={22} />
                                </div>
                            </div>
                        </div>

                        {/* In-Flight Escrow Float */}
                        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>
                                        {isRTL ? 'رصيد الضمان المعلق (قيد التنفيذ)' : 'In-Flight Escrow Float'}
                                    </p>
                                    <h3 style={{ margin: '8px 0 4px', fontSize: '1.75rem', color: '#f59e0b', fontWeight: '700' }}>
                                        {financials?.summary?.escrowFloat?.toLocaleString() || 0} <span style={{ fontSize: '0.9rem', color: '#f59e0b' }}>QAR</span>
                                    </h3>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>
                                        {isRTL ? 'أموال المشترين المحتجزة لحين تأكيد التسليم' : 'Secured buyer capital held pending delivery'}
                                    </p>
                                </div>
                                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clock size={22} />
                                </div>
                            </div>
                        </div>

                        {/* Disbursed to Boutiques */}
                        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>
                                        {isRTL ? 'إجمالي التحويلات المنفذة للبوتيكات' : 'Disbursed to Boutiques'}
                                    </p>
                                    <h3 style={{ margin: '8px 0 4px', fontSize: '1.75rem', color: '#a855f7', fontWeight: '700' }}>
                                        {financials?.summary?.totalDisbursed?.toLocaleString() || 0} <span style={{ fontSize: '0.9rem', color: '#a855f7' }}>QAR</span>
                                    </h3>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>
                                        {isRTL ? 'حوالات بنكية مكتملة ومعتمدة' : 'Confirmed bank wire transfers'}
                                    </p>
                                </div>
                                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle size={22} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Multi-Currency Float Strip */}
                    {financials?.summary?.byCurrency && Object.keys(financials.summary.byCurrency).length > 0 && (
                        <div style={{ background: '#0f172a', padding: '14px 20px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {isRTL ? 'توزيع العملات الإقليمية:' : 'Regional GCC Currency Float:'}
                            </span>
                            {Object.entries(financials.summary.byCurrency).map(([curr, amt]) => (
                                <span key={curr} style={{ background: '#1e293b', border: '1px solid #475569', padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#f8fafc', fontWeight: '600' }}>
                                    {curr}: <span style={{ color: '#d4af37' }}>{Number(amt).toLocaleString()}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Vendor Payout Requests Table */}
                    <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '24px', marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <DollarSign size={20} color="#d4af37" />
                                    {isRTL ? 'طلبات تسوية المستحقات البنكية للبوتيكات' : 'Boutique Wire Payout Requests & Approvals'}
                                </h3>
                                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                                    {isRTL ? 'مراجعة واعتماد الحوالات المصرفية مع تسجيل غير قابل للتعديل في سجل التدقيق' : 'Review and execute 1-click bank disbursements with cryptographic audit trail'}
                                </p>
                            </div>
                            <span style={{ background: '#334155', color: '#cbd5e1', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '600' }}>
                                {payouts.length} {isRTL ? 'سجلات' : 'records'}
                            </span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', fontSize: '0.88rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'المعرف' : 'Payout ID'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'البوتيك / المتجر' : 'Boutique'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'المبلغ الإجمالي' : 'Gross Amount'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'عمولة المنصة' : 'Platform Cut'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'الصافي للتحويل' : 'Net Disbursable'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'الحساب البنكي / الآيبان' : 'Bank & IBAN'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'الحالة' : 'Status'}</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>{isRTL ? 'الإجراء التنفيذي' : 'Executive Action'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payouts.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                                                {isRTL ? 'لا توجد طلبات تسوية معلقة حالياً' : 'No payout settlement requests in queue'}
                                            </td>
                                        </tr>
                                    ) : (
                                        payouts.map((p) => {
                                            const isPending = p.status === 'pending';
                                            return (
                                                <tr key={p.id} style={{ borderBottom: '1px solid #1f293d' }}>
                                                    <td style={{ padding: '14px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                                        {String(p.id).substring(0, 10)}...
                                                    </td>
                                                    <td style={{ padding: '14px', color: '#f8fafc', fontWeight: '600' }}>
                                                        {p.shop_name || `Shop #${p.shop_id}`}
                                                    </td>
                                                    <td style={{ padding: '14px', color: '#f8fafc' }}>
                                                        {Number(p.amount || 0).toLocaleString()} {p.currency || 'QAR'}
                                                    </td>
                                                    <td style={{ padding: '14px', color: '#f43f5e', fontSize: '0.82rem' }}>
                                                        -{Number(p.commission_retained || 0).toLocaleString()} {p.currency || 'QAR'}
                                                    </td>
                                                    <td style={{ padding: '14px', color: '#10b981', fontWeight: '700' }}>
                                                        {Number(p.net_amount || p.amount || 0).toLocaleString()} {p.currency || 'QAR'}
                                                    </td>
                                                    <td style={{ padding: '14px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                                                        <div style={{ fontWeight: '500' }}>{p.bank_name || 'Qatar National Bank'}</div>
                                                        <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.iban || 'QA12QNBA00000000123456'}</div>
                                                    </td>
                                                    <td style={{ padding: '14px' }}>
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            textTransform: 'uppercase',
                                                            background: p.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' : p.status === 'pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                            color: p.status === 'approved' ? '#10b981' : p.status === 'pending' ? '#f59e0b' : '#ef4444',
                                                            border: `1px solid ${p.status === 'approved' ? '#10b98133' : p.status === 'pending' ? '#f59e0b33' : '#ef444433'}`
                                                        }}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px', textAlign: 'center' }}>
                                                        {isPending ? (
                                                            <button
                                                                onClick={() => handleApprovePayout(p.id)}
                                                                disabled={payoutActionLoading === p.id}
                                                                style={{
                                                                    padding: '6px 14px',
                                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                                    color: '#fff',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: '600',
                                                                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                                                                    opacity: payoutActionLoading === p.id ? 0.6 : 1
                                                                }}
                                                            >
                                                                {payoutActionLoading === p.id 
                                                                    ? (isRTL ? 'جاري الاعتماد...' : 'Authorizing...')
                                                                    : (isRTL ? 'اعتماد وصرف الحوالة' : 'Approve & Clear Wire')}
                                                            </button>
                                                        ) : (
                                                            <span style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                                <CheckCircle size={14} /> {isRTL ? 'تم الصرف بنجاح' : 'Settled & Logged'}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Boutique In-Escrow Ledger Breakdown */}
                    <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '24px' }}>
                        <div style={{ marginBottom: '18px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Store size={20} color="#d4af37" />
                                {isRTL ? 'دفتر أستاذ الضمان وتوزيع أرصدة البوتيكات' : 'Boutique Escrow Ledger & Balance Matrix'}
                            </h3>
                            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                                {isRTL ? 'مراقبة فورية لحسابات المتاجر، الأموال قيد التوصيل، والعمولات المستحقة للمنصة' : 'Real-time ledger tracking completed GMV, in-flight customer escrow, and platform commission per vendor'}
                            </p>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', fontSize: '0.88rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'المتجر' : 'Boutique Name'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'فئة الاشتراك' : 'Tier'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'معدل العمولة' : 'Commission Rate'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'الطلبات' : 'Orders'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'المبيعات المكتملة' : 'Settled GMV'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'رصيد الضمان المعلق' : 'Escrow (In-Flight)'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'عمولة المنصة المكتسبة' : 'Platform Revenue'}</th>
                                        <th style={{ padding: '12px 14px' }}>{isRTL ? 'صافي مستحق للمتجر' : 'Net Vendor Balance'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(!financials?.vendorBreakdown || financials.vendorBreakdown.length === 0) ? (
                                        <tr>
                                            <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                                                {isRTL ? 'لا توجد بيانات بائعين مسجلة' : 'No vendor ledger entries available'}
                                            </td>
                                        </tr>
                                    ) : (
                                        financials.vendorBreakdown.map((vb) => (
                                            <tr key={vb.shopId} style={{ borderBottom: '1px solid #1f293d' }}>
                                                <td style={{ padding: '14px', color: '#f8fafc', fontWeight: '600' }}>
                                                    {vb.shopName}
                                                </td>
                                                <td style={{ padding: '14px' }}>
                                                    <span style={{
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        textTransform: 'uppercase',
                                                        background: vb.tier === 'premium' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                                        color: vb.tier === 'premium' ? '#d4af37' : '#60a5fa',
                                                        border: `1px solid ${vb.tier === 'premium' ? '#d4af3744' : '#60a5fa44'}`
                                                    }}>
                                                        {vb.tier}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px', color: '#94a3b8' }}>
                                                    {(vb.commissionRate * 100).toFixed(0)}%
                                                </td>
                                                <td style={{ padding: '14px', color: '#cbd5e1' }}>
                                                    {vb.orderCount}
                                                </td>
                                                <td style={{ padding: '14px', color: '#f8fafc', fontWeight: '600' }}>
                                                    {Number(vb.gmv || 0).toLocaleString()} QAR
                                                </td>
                                                <td style={{ padding: '14px', color: '#f59e0b', fontWeight: '600' }}>
                                                    {Number(vb.inEscrow || 0).toLocaleString()} QAR
                                                </td>
                                                <td style={{ padding: '14px', color: '#10b981', fontWeight: '600' }}>
                                                    {Number(vb.commission || 0).toLocaleString()} QAR
                                                </td>
                                                <td style={{ padding: '14px', color: '#38bdf8', fontWeight: '700' }}>
                                                    {Number(vb.netDisbursable || 0).toLocaleString()} QAR
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div
                    onClick={() => setActiveDrillDown('revenue')}
                    style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(24, 144, 255, 0.1)', color: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9em', fontWeight: '500' }}>{isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em', color: '#f8fafc' }}>{totalRevenue.toLocaleString()} {territoryCurrency}</h3>
                    </div>
                </div>

                <div
                    onClick={() => setActiveDrillDown('orders')}
                    style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(235, 47, 150, 0.1)', color: '#eb2f96', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9em', fontWeight: '500' }}>{isRTL ? 'إجمالي الطلبات' : 'Total Orders'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em', color: '#f8fafc' }}>{totalOrders}</h3>
                    </div>
                </div>

                <div
                    onClick={() => setActiveDrillDown('customers')}
                    style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(82, 196, 26, 0.1)', color: '#52c41a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9em', fontWeight: '500' }}>{isRTL ? 'العملاء' : 'Total Customers'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em', color: '#f8fafc' }}>{totalCustomers}</h3>
                    </div>
                </div>

                <div
                    onClick={() => setActiveDrillDown('low-stock')}
                    style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(250, 84, 28, 0.1)', color: '#fa541c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9em', fontWeight: '500' }}>{isRTL ? 'منتجات منخفضة المخزون' : 'Low Stock Items'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em', color: '#f8fafc' }}>{lowStockProducts}</h3>
                    </div>
                </div>

                <div
                    onClick={() => setActiveDrillDown('today')}
                    style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(250, 173, 20, 0.1)', color: '#faad14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9em', fontWeight: '500' }}>{isRTL ? 'مبيعات اليوم' : "Today's Sales"}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em', color: '#f8fafc' }}>{todaySales} ({todayRevenue.toLocaleString()} {territoryCurrency})</h3>
                    </div>
                </div>

                <div
                    onClick={() => setActiveDrillDown('out-of-stock')}
                    style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(245, 34, 45, 0.1)', color: '#f5222d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9em', fontWeight: '500' }}>{isRTL ? 'منتجات غير متوفرة' : 'Out of Stock'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em', color: '#f8fafc' }}>{outOfStockProducts}</h3>
                    </div>
                </div>

                <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(114, 46, 209, 0.1)', color: '#722ed1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9em', fontWeight: '500' }}>{isRTL ? 'إجمالي المنتجات المدرجة' : 'Total Products Listed'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em', color: '#f8fafc' }}>{totalProductsListing}</h3>
                    </div>
                </div>

                <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(19, 194, 194, 0.1)', color: '#13c2c2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PackageIcon size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9em', fontWeight: '500' }}>{isRTL ? 'إجمالي المنتجات المباعة' : 'Total Products Sold'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em', color: '#f8fafc' }}>{totalUnitsSold}</h3>
                    </div>
                </div>
            </div>

            {/* Dedicated Territory Intelligence Dashboard Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '30px' }}>
                {/* 1. French Designer vs Traditional Oud Market Breakdown */}
                <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '14px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Crown size={20} color="#c8a951" />
                            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.05rem' }}>
                                {isRTL ? 'حصة العطور: المصممين الفرنسيين مقابل العود التراثي' : 'French Designer vs. Traditional Oud'}
                            </h3>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#c8a951', background: 'rgba(200, 169, 81, 0.15)', padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>
                            {territoryName}
                        </span>
                    </div>

                    {/* Progress distribution bar */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px', color: '#cbd5e1' }}>
                            <span>✨ {isRTL ? 'المصممون الفرنسيون' : 'French Designer'}: <strong>{fragranceComparison.frenchPercent}%</strong></span>
                            <span>👑 {isRTL ? 'العود والشرقي التراثي' : 'Traditional Oud'}: <strong>{fragranceComparison.oudPercent}%</strong></span>
                        </div>
                        <div style={{ height: '10px', borderRadius: '6px', background: '#0f172a', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${fragranceComparison.frenchPercent}%`, background: 'linear-gradient(90deg, #38bdf8, #818cf8)', transition: 'width 0.5s' }} />
                            <div style={{ width: `${fragranceComparison.oudPercent}%`, background: 'linear-gradient(90deg, #c8a951, #eab308)', transition: 'width 0.5s' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                            <span>{fragranceComparison.frenchSales.toLocaleString()} {territoryCurrency} ({fragranceComparison.frenchQty} {isRTL ? 'قنينة' : 'units'})</span>
                            <span>{fragranceComparison.oudSales.toLocaleString()} {territoryCurrency} ({fragranceComparison.oudQty} {isRTL ? 'قنينة' : 'units'})</span>
                        </div>
                    </div>

                    {/* Top 5 Best-Selling Fragrances with category tags */}
                    <div style={{ marginTop: '16px' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px 0' }}>
                            {isRTL ? 'أفضل 5 عطور مبيعاً في الإقليم' : 'Top 5 Fragrances in Territory'}
                        </h4>
                        {fragranceComparison.topFragrances.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {fragranceComparison.topFragrances.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                            <span style={{ fontWeight: '700', color: '#c8a951', fontSize: '0.85rem' }}>#{idx + 1}</span>
                                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <div style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: '600' }}>{item.name}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.brand}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <span style={{ 
                                                fontSize: '0.7rem', 
                                                fontWeight: '700', 
                                                padding: '2px 8px', 
                                                borderRadius: '6px', 
                                                background: item.isOud ? 'rgba(200, 169, 81, 0.2)' : 'rgba(56, 189, 248, 0.2)', 
                                                color: item.isOud ? '#c8a951' : '#38bdf8', 
                                                border: item.isOud ? '1px solid rgba(200, 169, 81, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)' 
                                            }}>
                                                {item.isOud ? (isRTL ? '👑 عود تراثي' : '👑 Oud') : (isRTL ? '✨ مصمم فرنسي' : '✨ French Designer')}
                                            </span>
                                            <span style={{ color: '#f8fafc', fontWeight: '700', fontSize: '0.82rem' }}>{item.qty} {isRTL ? 'مباع' : 'sold'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>{isRTL ? 'لا توجد مبيعات مسجلة في هذا الإقليم' : 'No sales recorded in this territory'}</p>
                        )}
                    </div>
                </div>

                {/* 2. Top Performing Boutiques & Fulfillment Ratio Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Fulfillment Method: Click & Collect vs Home Delivery */}
                    <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Truck size={18} color="#38bdf8" />
                                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem' }}>
                                    {isRTL ? 'طرق التوصيل: الاستلام من الفرع مقابل التوصيل المنزلي' : 'Fulfillment: Click & Collect vs. Delivery'}
                                </h3>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {fulfillmentStats.total} {isRTL ? 'طلب كلي' : 'Total Orders'}
                            </span>
                        </div>

                        {/* Split Bar */}
                        <div style={{ height: '8px', borderRadius: '4px', background: '#0f172a', overflow: 'hidden', display: 'flex', marginBottom: '10px' }}>
                            <div style={{ width: `${fulfillmentStats.deliveryPct}%`, background: '#3b82f6', transition: 'width 0.5s' }} />
                            <div style={{ width: `${fulfillmentStats.pickupPct}%`, background: '#10b981', transition: 'width 0.5s' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#3b82f6' }} />
                                <span>{isRTL ? 'توصيل منزلي' : 'Home Delivery'}: <strong>{fulfillmentStats.deliveryCount} ({fulfillmentStats.deliveryPct}%)</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }} />
                                <span>{isRTL ? 'استلام من البوتيك' : 'Click & Collect'}: <strong>{fulfillmentStats.pickupCount} ({fulfillmentStats.pickupPct}%)</strong></span>
                            </div>
                        </div>

                        {/* Regional SLA Metrics Strip */}
                        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(51, 65, 85, 0.6)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                            <div style={{ background: '#0f172a', padding: '8px 10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{isRTL ? 'متوسط تجهيز الاستلام' : 'Click & Collect SLA'}</span>
                                <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>35 {isRTL ? 'دقيقة' : 'mins'}</strong>
                            </div>
                            <div style={{ background: '#0f172a', padding: '8px 10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{isRTL ? 'متوسط سرعة التوصيل' : 'Delivery Dispatch'}</span>
                                <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>1.8 {isRTL ? 'ساعة' : 'hrs'}</strong>
                            </div>
                            <div style={{ background: '#0f172a', padding: '8px 10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{isRTL ? 'نسبة الالتزام بالوقت' : 'On-Time SLA'}</span>
                                <strong style={{ color: '#d4af37', fontSize: '0.95rem' }}>98.6%</strong>
                            </div>
                        </div>
                    </div>

                    {/* Top Performing Boutiques */}
                    <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155', flex: 1, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Store size={18} color="#c8a951" />
                                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem' }}>
                                    {isRTL ? 'أفضل البوتيكات أداءً في الإقليم' : 'Top Performing Boutiques in Territory'}
                                </h3>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {territoryShops.length} {isRTL ? 'بوتيك نشط' : 'Active Boutiques'}
                            </span>
                        </div>

                        {topBoutiques.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {topBoutiques.map((shop, sIdx) => (
                                    <div key={shop.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontWeight: '700', color: sIdx === 0 ? '#c8a951' : '#94a3b8', fontSize: '0.85rem' }}>
                                                {sIdx === 0 ? '🥇' : sIdx === 1 ? '🥈' : sIdx === 2 ? '🥉' : `#${sIdx + 1}`}
                                            </span>
                                            <div>
                                                <div style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.85rem' }}>{shop.name}</div>
                                                <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{shop.orders} {isRTL ? 'طلب منجز' : 'fulfilled orders'}</div>
                                            </div>
                                        </div>
                                        <strong style={{ color: '#c8a951', fontSize: '0.9rem' }}>
                                            {shop.revenue.toLocaleString()} {territoryCurrency}
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>
                                {isRTL ? 'لا توجد بيانات بوتيكات في هذا الإقليم' : 'No boutique sales recorded in this territory'}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '30px' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <h3 style={{ color: '#f8fafc', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{isRTL ? 'الأكثر مبيعاً (30 يوم)' : 'Best Selling (30 Days)'}</span>
                        <span style={{ fontSize: '0.7em', color: '#94a3b8', fontWeight: 'normal' }}>{isRTL ? 'آخر 30 يوم' : 'Last 30 days'}</span>
                    </h3>
                    {bestSelling30Days.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {bestSelling30Days.map(([name, qty], index) => (
                                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px dashed #334155', paddingBottom: '12px' }}>
                                    <span style={{ fontSize: '0.95em', color: '#cbd5e1' }}><strong>{index + 1}.</strong> {name}</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--color-gold)' }}>{qty} {isRTL ? 'وحدة' : 'units'}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: '#94a3b8' }}>{isRTL ? 'لا توجد بيانات متاحة' : 'No sales data for this period'}</p>
                    )}
                </div>

                <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <h3 style={{ color: '#f8fafc', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#eb2f96' }}>{isRTL ? 'المنتجات الرائجة (7 أيام)' : 'Trending (7 Days)'}</span>
                        <span style={{ fontSize: '0.7em', color: '#94a3b8', fontWeight: 'normal' }}>{isRTL ? 'آخر 7 أيام' : 'Last 7 days'}</span>
                    </h3>
                    {trending7Days.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {trending7Days.map(([name, qty], index) => (
                                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px dashed #334155', paddingBottom: '12px' }}>
                                    <span style={{ fontSize: '0.95em', color: '#cbd5e1' }}><strong>{index + 1}.</strong> {name}</span>
                                    <span style={{ fontWeight: 'bold', color: '#eb2f96' }}>{qty} {isRTL ? 'وحدة' : 'units'}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: '#94a3b8' }}>{isRTL ? 'لا توجد بيانات متاحة' : 'No recent trends'}</p>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                {/* Recent Activity */}
                <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <h3 style={{ color: '#f8fafc', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                        {isRTL ? 'أحدث الطلبات' : 'Recent Orders'}
                    </h3>
                    {recentOrders.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {recentOrders.map((order, index) => (
                                <li key={index} style={{ marginBottom: '15px', borderBottom: '1px dashed #334155', paddingBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong style={{ color: '#f8fafc' }}>{order.id}</strong>
                                        <span style={{ color: '#94a3b8', fontSize: '0.85em' }}>{order.date}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95em', color: '#cbd5e1' }}>
                                        <span>{order.customerName}</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--color-gold)' }}>{order.total} QAR</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: '#94a3b8' }}>{isRTL ? 'لا توجد طلبات حديثة' : 'No recent orders'}</p>
                    )}
                </div>

            </div>

            {/* Drill-down Modal */}
            {activeDrillDown && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setActiveDrillDown(null)}>
                    <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: 'min(600px, 95vw)', maxHeight: '90vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>
                                {activeDrillDown === 'revenue' && (isRTL ? 'تفاصيل الإيرادات' : 'Revenue Details')}
                                {activeDrillDown === 'orders' && (isRTL ? 'قائمة الطلبات' : 'Order List')}
                                {activeDrillDown === 'today-sales' && (isRTL ? 'مبيعات اليوم' : "Today's Orders")}
                                {activeDrillDown === 'customers' && (isRTL ? 'قائمة العملاء' : 'Customer List')}
                                {activeDrillDown === 'low-stock' && (isRTL ? 'منتجات منخفضة المخزون' : 'Low Stock Items')}
                                {activeDrillDown === 'out-of-stock' && (isRTL ? 'منتجات غير متوفرة' : 'Out of Stock Items')}
                            </h3>
                            <button onClick={() => { setActiveDrillDown(null); setStockSearchTerm(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        {/* Search Bar for Stock Modals */}
                        {(activeDrillDown === 'low-stock' || activeDrillDown === 'out-of-stock') && (
                            <div style={{ padding: '15px 20px', backgroundColor: '#fafafa', borderBottom: '1px solid #eee' }}>
                                <div className="admin-search-container" style={{ maxWidth: '100%' }}>
                                    <input 
                                        type="text" 
                                        className="form-control admin-search-input"
                                        placeholder={isRTL ? 'ابحث بالاسم أو الماركة...' : 'Search by name or brand...'} 
                                        value={stockSearchTerm}
                                        onChange={(e) => setStockSearchTerm(e.target.value)}
                                        style={{ height: '40px' }}
                                    />
                                    <div className="admin-search-icon">
                                        <Search size={18} />
                                    </div>
                                    {stockSearchTerm && (
                                        <button 
                                            onClick={() => setStockSearchTerm('')}
                                            style={{ position: 'absolute', right: isRTL ? 'auto' : '10px', left: isRTL ? '10px' : 'auto', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', zIndex: 5 }}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ padding: '20px', overflowY: 'auto' }}>
                            {activeDrillDown === 'revenue' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: isRTL ? 'right' : 'left', borderBottom: '2px solid #eee' }}>
                                            <th style={{ padding: '10px' }}>{isRTL ? 'الطلب' : 'Order'}</th>
                                            <th style={{ padding: '10px' }}>{isRTL ? 'التاريخ' : 'Date'}</th>
                                            <th style={{ padding: '10px' }}>{isRTL ? 'المبلغ' : 'Amount'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {territoryOrders.map(order => (
                                            <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '10px' }}>{order.id}</td>
                                                <td style={{ padding: '10px' }}>{order.date || order.created_at}</td>
                                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{order.total} {territoryCurrency}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {activeDrillDown === 'orders' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {territoryOrders.map(order => (
                                        <div key={order.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <strong>{order.id}</strong>
                                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em', backgroundColor: order.status === 'Processing' ? '#e6f7ff' : '#f6ffed', color: order.status === 'Processing' ? '#1890ff' : '#52c41a' }}>{order.status}</span>
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#666' }}>{order.customerName || order.customer_name} • {order.date || order.created_at}</div>
                                            <div style={{ marginTop: '5px', fontWeight: 'bold' }}>{order.total} {territoryCurrency}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeDrillDown === 'today-sales' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {todayOrders.length > 0 ? (
                                        todayOrders.map(order => (
                                            <div key={order.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <strong>{order.id}</strong>
                                                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em', backgroundColor: '#e6f7ff', color: '#1890ff' }}>{order.status}</span>
                                                </div>
                                                <div style={{ fontSize: '0.9em', color: '#666' }}>{order.customerName || order.customer_name} • {order.date || order.created_at}</div>
                                                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>{order.total} {territoryCurrency}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#888' }}>{isRTL ? 'لا توجد طلبات اليوم حتى الآن' : 'No orders placed today yet.'}</p>
                                    )}
                                </div>
                            )}
                            {activeDrillDown === 'customers' && (
                                <div>
                                    <p style={{ color: '#666', marginBottom: '15px' }}>{isRTL ? 'قائمة العملاء المسجلين حالياً' : 'List of currently registered customers'}</p>
                                    {[
                                        { name: 'John Doe', email: 'john@example.com', orders: 2 },
                                        { name: 'Jane Smith', email: 'jane@example.com', orders: 1 },
                                        { name: 'Ahmed Ali', email: 'ahmed@example.com', orders: 0 },
                                        { name: 'Sara Khan', email: 'sara@example.com', orders: 1 }
                                    ].map((customer, idx) => (
                                        <div key={idx} style={{ padding: '12px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                            <div style={{ flex: '1 0 150px' }}>
                                                <div style={{ fontWeight: 'bold' }}>{customer.name}</div>
                                                <div style={{ fontSize: '0.85em', color: '#666', wordBreak: 'break-word' }}>{customer.email}</div>
                                            </div>
                                            <div style={{ fontSize: '0.9em', whiteSpace: 'nowrap' }}>{customer.orders} {isRTL ? 'طلبات' : 'orders'}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                             {activeDrillDown === 'low-stock' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {lowStockList
                                        .filter(p => 
                                            p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) || 
                                            p.brand.toLowerCase().includes(stockSearchTerm.toLowerCase())
                                        ).length > 0 ? (
                                        lowStockList
                                            .filter(p => 
                                                p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) || 
                                                p.brand.toLowerCase().includes(stockSearchTerm.toLowerCase())
                                            )
                                            .map(product => (
                                                <div key={product.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                                <div style={{ flex: '1 0 160px' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{product.name}</div>
                                                    <div style={{ fontSize: '0.85em', color: '#666' }}>{product.brand}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{ fontSize: '0.75em', color: '#888', marginBottom: '2px' }}>{isRTL ? 'المخزون' : 'Stock'}</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editingStock[product.id] !== undefined ? editingStock[product.id] : product.stock}
                                                            onChange={(e) => setEditingStock({ ...editingStock, [product.id]: parseInt(e.target.value) })}
                                                            style={{ width: '50px', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center' }}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newStock = editingStock[product.id] !== undefined ? editingStock[product.id] : product.stock;
                                                            updateProduct(product.id, { ...product, stock: newStock });
                                                            const newEditingStock = { ...editingStock };
                                                            delete newEditingStock[product.id];
                                                            setEditingStock(newEditingStock);
                                                        }}
                                                        style={{ backgroundColor: 'var(--color-gold)', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em', height: 'fit-content', marginTop: '14px' }}
                                                    >
                                                        {isRTL ? 'تحديث' : 'Update'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#888' }}>
                                            {stockSearchTerm 
                                                ? (isRTL ? 'لم يتم العثور على منتجات تطابق بحثك' : 'No products found matching your search')
                                                : (isRTL ? 'كل المنتجات مخزنة جيداً كلاً' : 'All products are well stocked')}
                                        </p>
                                    )}
                                </div>
                            )}
                             {activeDrillDown === 'out-of-stock' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {outOfStockList
                                        .filter(p => 
                                            p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) || 
                                            p.brand.toLowerCase().includes(stockSearchTerm.toLowerCase())
                                        ).length > 0 ? (
                                        outOfStockList
                                            .filter(p => 
                                                p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) || 
                                                p.brand.toLowerCase().includes(stockSearchTerm.toLowerCase())
                                            )
                                            .map(product => (
                                                <div key={product.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold' }}>{product.name}</div>
                                                    <div style={{ fontSize: '0.85em', color: '#666' }}>{product.brand}</div>
                                                    <div style={{ color: '#f5222d', fontSize: '0.8em', marginTop: '4px' }}>{isRTL ? 'غير متوفر' : 'Sold Out'}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{ fontSize: '0.75em', color: '#888', marginBottom: '2px' }}>{isRTL ? 'تحديث المخزون' : 'Update Stock'}</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            placeholder="0"
                                                            value={editingStock[product.id] !== undefined ? editingStock[product.id] : ''}
                                                            onChange={(e) => setEditingStock({ ...editingStock, [product.id]: parseInt(e.target.value) })}
                                                            style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center' }}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newStock = editingStock[product.id];
                                                            if (newStock > 0) {
                                                                updateProduct(product.id, { ...product, stock: newStock });
                                                                const newEditingStock = { ...editingStock };
                                                                delete newEditingStock[product.id];
                                                                setEditingStock(newEditingStock);
                                                            }
                                                        }}
                                                        disabled={!editingStock[product.id] || editingStock[product.id] <= 0}
                                                        style={{ 
                                                            backgroundColor: editingStock[product.id] > 0 ? 'var(--color-gold)' : '#ccc', 
                                                            color: '#fff', 
                                                            border: 'none', 
                                                            padding: '8px 12px', 
                                                            borderRadius: '4px', 
                                                            cursor: editingStock[product.id] > 0 ? 'pointer' : 'not-allowed', 
                                                            fontSize: '0.85em', 
                                                            height: 'fit-content', 
                                                            marginTop: '18px' 
                                                        }}
                                                    >
                                                        {isRTL ? 'إضافة' : 'Restock'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#888' }}>
                                            {stockSearchTerm 
                                                ? (isRTL ? 'لم يتم العثور على منتجات تطابق بحثك' : 'No products found matching your search')
                                                : (isRTL ? 'جميع المنتجات متوفرة حالياً' : 'All products are currently in stock.')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
};

export default ReportsManager;
