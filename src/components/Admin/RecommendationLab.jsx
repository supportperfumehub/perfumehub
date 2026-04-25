import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Settings, Save, RefreshCw, AlertTriangle, Info, Sliders, Map, TrendingUp } from 'lucide-react';

const RecommendationLab = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            // We'll use a direct select for simplicity or a new endpoint if needed
            const res = await fetch('/api/admin/algorithm-config', {
                headers: { 'x-user-id': user.id }
            });
            if (!res.ok) throw new Error('Failed to fetch algorithm configuration');
            const data = await res.json();
            setConfig(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const res = await fetch(`/api/admin/algorithm-config/${config.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-id': user.id 
                },
                body: JSON.stringify(config)
            });
            if (!res.ok) throw new Error('Failed to save configuration');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const updateWeight = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: parseFloat(value) }));
    };

    if (loading) return (
        <div className="admin-section center-content">
            <RefreshCw size={32} className="spin gold-icon" />
            <p>{isRTL ? 'جاري تحميل الإعدادات...' : 'Loading algorithm lab...'}</p>
        </div>
    );

    if (!config) return (
        <div className="admin-section text-center">
            <AlertTriangle size={48} color="#f87171" />
            <p>{isRTL ? 'لم يتم العثور على تكوين نشط' : 'No active configuration found'}</p>
            <button className="btn btn-outline" onClick={fetchConfig}>{isRTL ? 'تحديث' : 'Retry'}</button>
        </div>
    );

    const totalWeight = (
        (config.weight_trust || 0) + 
        (config.weight_tier || 0) + 
        (config.weight_distance || 0) + 
        (config.weight_rating || 0) + 
        (config.weight_price || 0)
    ).toFixed(2);

    const isBalanced = parseFloat(totalWeight) === 1.0;

    return (
        <div className="admin-section animate-fade-in">
            <div className="manager-header">
                <h2>
                    <Sliders size={24} color="#c8a951" />
                    {isRTL ? 'مختبر الخوارزميات' : 'Recommendation Lab'}
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-outline" onClick={fetchConfig} disabled={saving}>
                        <RefreshCw size={16} /> {isRTL ? 'إعادة ضبط' : 'Reset'}
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving || !isBalanced}>
                        <Save size={16} /> {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التغييرات' : 'Save Changes')}
                    </button>
                </div>
            </div>

            {success && (
                <div className="alert alert-success animate-slide-up" style={{ marginBottom: '20px' }}>
                    {isRTL ? 'تم حفظ الإعدادات بنجاح. ستنعكس التغييرات فوراً على جميع المستخدمين.' : 'Configuration saved successfully. Changes are live platform-wide.'}
                </div>
            )}

            {!isBalanced && (
                <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
                    <AlertTriangle size={18} />
                    {isRTL 
                        ? `يجب أن يكون مجموع الأوزان 1.00 (المجموع الحالي: ${totalWeight})` 
                        : `Total weights must sum to 1.00 (Current sum: ${totalWeight})`}
                </div>
            )}

            <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                {/* Weight Sliders */}
                <div className="admin-card" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={18} color="#c8a951" />
                        {isRTL ? 'أوزان الخوارزمية' : 'Algorithm Weights'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '24px' }}>
                        {isRTL 
                            ? 'حدد مدى تأثير كل عامل في ترتيب المتاجر الموصى بها للعملاء.' 
                            : 'Define how much each factor influences the ranking of recommended shops for customers.'}
                    </p>

                    {[
                        { key: 'weight_trust', label: isRTL ? 'نقاط الثقة' : 'Trust Score', desc: 'Verified status & historical performance' },
                        { key: 'weight_distance', label: isRTL ? 'المسافة' : 'Proximity', desc: 'Physical distance to user' },
                        { key: 'weight_rating', label: isRTL ? 'التقييم' : 'Customer Rating', desc: 'Average star rating' },
                        { key: 'weight_price', label: isRTL ? 'السعر' : 'Price Point', desc: 'Competitiveness vs market average' },
                        { key: 'weight_tier', label: isRTL ? 'فئة الاشتراك' : 'Vendor Tier', desc: 'Premium/Enterprise priority' },
                    ].map(item => (
                        <div key={item.key} style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontWeight: '600', color: '#f8fafc' }}>{item.label}</label>
                                <span style={{ color: '#c8a951', fontWeight: '700', fontSize: '1rem' }}>{(config[item.key] * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" max="1" step="0.05" 
                                value={config[item.key]} 
                                onChange={(e) => updateWeight(item.key, e.target.value)}
                                style={{ width: '100%', accentColor: '#c8a951' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{item.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Hard Limits & Boosts */}
                <div className="admin-card" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Map size={18} color="#c8a951" />
                        {isRTL ? 'القيود والتعزيزات' : 'Hard Limits & Boosts'}
                    </h3>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label>{isRTL ? 'أقصى مسافة للبحث (كم)' : 'Max Search Distance (km)'}</label>
                        <input 
                            type="number" 
                            className="form-control" 
                            value={config.max_distance_km} 
                            onChange={(e) => setConfig({...config, max_distance_km: parseInt(e.target.value)})} 
                        />
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                            {isRTL ? 'المتاجر التي تبعد أكثر من هذه المسافة لن تظهر في النتائج.' : 'Shops further than this distance will not appear in results.'}
                        </p>
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label>{isRTL ? 'تعزيز البائعين الجدد' : 'New Vendor Boost'}</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input 
                                type="range" 
                                min="0" max="0.5" step="0.01" 
                                value={config.new_vendor_boost} 
                                onChange={(e) => setConfig({...config, new_vendor_boost: parseFloat(e.target.value)})} 
                                style={{ flex: 1, accentColor: '#c8a951' }}
                            />
                            <span style={{ minWidth: '40px', fontWeight: '700', color: '#c8a951' }}>+{(config.new_vendor_boost * 100).toFixed(0)}%</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                            {isRTL 
                                ? 'نقاط إضافية تمنح للمتاجر التي انضمت في آخر 30 يوماً لمساعدتها على الظهور.' 
                                : 'Extra points granted to shops joined in the last 30 days to help them gain visibility.'}
                        </p>
                    </div>

                    <div style={{ background: 'rgba(200, 169, 81, 0.05)', border: '1px solid rgba(200, 169, 81, 0.2)', borderRadius: '12px', padding: '16px' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginBottom: '8px', color: '#c8a951' }}>
                            <Info size={16} /> {isRTL ? 'كيف يعمل هذا؟' : 'How does this work?'}
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5' }}>
                            {isRTL 
                                ? 'خوارزمية التوصية تعمل بالكامل على الخادم (SQL RPC). أي تغيير تحفظه هنا سيؤثر فوراً على كيفية ترتيب "أقرب المتاجر" و "البائعين الموصى بهم" لجميع زوار الموقع.' 
                                : 'The recommendation algorithm runs entirely server-side (SQL RPC). Any change you save here will immediately impact how "Nearest Shops" and "Recommended Vendors" are ranked for all visitors.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendationLab;
