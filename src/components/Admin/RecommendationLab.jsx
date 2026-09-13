import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Settings, Save, RefreshCw, AlertTriangle, Info, Sliders, Map, TrendingUp, Compass, Navigation, Zap, Award, Crosshair } from 'lucide-react';
import api from '../../utils/api_v1_0_2';

const GCC_PRESETS = [
    { name: 'Doha Corniche (Qatar)', lat: 25.2867, lng: 51.5333, labelAr: 'كورنيش الدوحة (قطر)' },
    { name: 'The Pearl-Qatar', lat: 25.3705, lng: 51.5544, labelAr: 'جزيرة اللؤلؤة (قطر)' },
    { name: 'Lusail Marina', lat: 25.4200, lng: 51.5300, labelAr: 'مرسى لوسيل (قطر)' },
    { name: 'Dubai Mall (UAE)', lat: 25.1972, lng: 55.2744, labelAr: 'دبي مول (الإمارات)' },
    { name: 'Riyadh Olaya (KSA)', lat: 24.7136, lng: 46.6753, labelAr: 'العليا - الرياض (السعودية)' },
];

const RecommendationLab = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    // Simulation Sandbox State
    const [simLat, setSimLat] = useState(25.2867);
    const [simLng, setSimLng] = useState(51.5333);
    const [simPreset, setSimPreset] = useState('Doha Corniche (Qatar)');
    const [simulating, setSimulating] = useState(false);
    const [simResults, setSimResults] = useState([]);
    const [simError, setSimError] = useState(null);

    const fetchConfig = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const res = await api.get('/admin/algorithm-config');
            setConfig(res.data);
            runSimulation(25.2867, 51.5333, res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const runSimulation = async (lat = simLat, lng = simLng, currentConfig = config) => {
        if (!currentConfig) return;
        try {
            setSimulating(true);
            setSimError(null);
            const payload = {
                user_lat: parseFloat(lat),
                user_lng: parseFloat(lng),
                weights: {
                    weight_trust: currentConfig.weight_trust,
                    weight_distance: currentConfig.weight_distance,
                    weight_rating: currentConfig.weight_rating,
                    weight_price: currentConfig.weight_price,
                    weight_tier: currentConfig.weight_tier
                },
                max_distance_km: currentConfig.max_distance_km || 50,
                new_vendor_boost: currentConfig.new_vendor_boost || 0.1
            };
            const res = await api.post('/admin/algorithm-simulation', payload);
            if (res.data?.simulation?.results) {
                setSimResults(res.data.simulation.results);
            } else {
                setSimResults([]);
            }
        } catch (err) {
            setSimError(err.response?.data?.error || err.message);
        } finally {
            setSimulating(false);
        }
    };

    const handlePresetSelect = (preset) => {
        setSimPreset(preset.name);
        setSimLat(preset.lat);
        setSimLng(preset.lng);
        runSimulation(preset.lat, preset.lng, config);
    };

    useEffect(() => {
        if (user?.id) {
            fetchConfig();
        }
    }, [user?.id]);

    const handleSave = async () => {
        if (!user?.id || !config) return;
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await api.put(`/admin/algorithm-config/${config.id}`, config);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
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
        <div className="admin-section text-center" style={{ padding: '40px 20px' }}>
            <AlertTriangle size={48} color="#f87171" style={{ marginBottom: '15px' }} />
            <p style={{ color: '#94a3b8', marginBottom: '15px' }}>{isRTL ? 'لم يتم العثور على تكوين نشط' : 'No active configuration found'}</p>
            <button 
                className="btn btn-outline" 
                onClick={fetchConfig}
                style={{ 
                    borderColor: 'rgba(255, 255, 255, 0.3)', 
                    color: '#ffffff',
                    background: 'transparent',
                    transition: 'all 0.2s ease',
                    padding: '8px 16px',
                    cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#c8a951';
                    e.currentTarget.style.color = '#c8a951';
                    e.currentTarget.style.background = 'rgba(200, 169, 81, 0.08)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = 'transparent';
                }}
            >
                {isRTL ? 'تحديث' : 'Retry'}
            </button>
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
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={fetchConfig} 
                        disabled={saving}
                        style={{ 
                            border: '1px solid rgba(255, 255, 255, 0.25)', 
                            color: '#f8fafc',
                            background: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            padding: '9px 18px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#c8a951';
                            e.currentTarget.style.color = '#c8a951';
                            e.currentTarget.style.background = 'rgba(200, 169, 81, 0.12)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                            e.currentTarget.style.color = '#f8fafc';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        }}
                    >
                        <RefreshCw size={15} color="#c8a951" className={saving ? 'spin' : ''} /> 
                        {isRTL ? 'إعادة ضبط' : 'RESET'}
                    </button>

                    <button 
                        onClick={handleSave} 
                        disabled={saving || !isBalanced}
                        style={{
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: (!isBalanced || saving) ? '#334155' : 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)',
                            color: (!isBalanced || saving) ? '#94a3b8' : '#000000',
                            fontWeight: '800',
                            borderRadius: '10px',
                            padding: '9px 22px',
                            cursor: (!isBalanced || saving) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            letterSpacing: '0.5px',
                            boxShadow: (!isBalanced || saving) ? 'none' : '0 4px 14px rgba(200, 169, 81, 0.4)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (isBalanced && !saving) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(200, 169, 81, 0.55)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (isBalanced && !saving) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 14px rgba(200, 169, 81, 0.4)';
                            }
                        }}
                    >
                        <Save size={16} color={(!isBalanced || saving) ? '#94a3b8' : '#000000'} /> 
                        {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التغييرات' : 'SAVE CHANGES')}
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

            {/* Live Algorithm Proximity & Discovery Simulation Sandbox */}
            <div className="admin-card" style={{ marginTop: '30px', padding: '28px', border: '1px solid rgba(200, 169, 81, 0.3)', background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Compass size={22} color="#c8a951" />
                            {isRTL ? 'مختبر محاكاة الترتيب الجغرافي الفوري' : 'Live Proximity & Multi-Factor Discovery Sandbox'}
                        </h3>
                        <p style={{ margin: '5px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                            {isRTL 
                                ? 'اختبر كيف ترتب خوارزمية المنصة المتاجر الحقيقية للعميل وفق إحداثياته الجغرافية وأوزان الذكاء الاصطناعي الحالية' 
                                : 'Simulate real-time boutique feed rankings for buyers based on GPS proximity and active algorithmic weights'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => runSimulation(simLat, simLng, config)}
                        disabled={simulating || !isBalanced}
                        style={{
                            padding: '10px 20px',
                            background: (simulating || !isBalanced) ? '#334155' : 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)',
                            color: (simulating || !isBalanced) ? '#94a3b8' : '#000',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: (simulating || !isBalanced) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: (simulating || !isBalanced) ? 'none' : '0 4px 12px rgba(200, 169, 81, 0.35)'
                        }}
                    >
                        <Zap size={16} color={(simulating || !isBalanced) ? '#94a3b8' : '#000'} className={simulating ? 'spin' : ''} />
                        {simulating 
                            ? (isRTL ? 'جاري محاكاة الترتيب...' : 'Computing Live Rankings...') 
                            : (isRTL ? 'تشغيل المحاكاة الفورية' : 'Run Live Discovery Simulation')}
                    </button>
                </div>

                {/* Location Presets */}
                <div style={{ marginBottom: '22px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {isRTL ? 'مواقع افتراضية سريعة في الخليج:' : 'GCC Geographic Location Presets:'}
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {GCC_PRESETS.map((preset) => {
                            const isSelected = simPreset === preset.name;
                            return (
                                <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => handlePresetSelect(preset)}
                                    style={{
                                        padding: '7px 14px',
                                        borderRadius: '8px',
                                        fontSize: '0.82rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease',
                                        background: isSelected ? 'rgba(200, 169, 81, 0.2)' : '#1e293b',
                                        color: isSelected ? '#c8a951' : '#94a3b8',
                                        border: `1px solid ${isSelected ? '#c8a951' : '#334155'}`
                                    }}
                                >
                                    <Crosshair size={14} color={isSelected ? '#c8a951' : '#64748b'} />
                                    {isRTL ? preset.labelAr : preset.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Custom GPS Coordinates */}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '160px' }}>
                        <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                            {isRTL ? 'خط العرض (Latitude)' : 'User Latitude'}
                        </label>
                        <input
                            type="number"
                            step="0.0001"
                            value={simLat}
                            onChange={(e) => {
                                setSimLat(e.target.value);
                                setSimPreset('Custom');
                            }}
                            style={{
                                width: '100%',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: '#f8fafc',
                                fontSize: '0.88rem'
                            }}
                        />
                    </div>
                    <div style={{ flex: '1', minWidth: '160px' }}>
                        <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                            {isRTL ? 'خط الطول (Longitude)' : 'User Longitude'}
                        </label>
                        <input
                            type="number"
                            step="0.0001"
                            value={simLng}
                            onChange={(e) => {
                                setSimLng(e.target.value);
                                setSimPreset('Custom');
                            }}
                            style={{
                                width: '100%',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: '#f8fafc',
                                fontSize: '0.88rem'
                            }}
                        />
                    </div>
                </div>

                {/* Simulation Output Table */}
                {simError && (
                    <div className="alert alert-warning" style={{ marginBottom: '15px' }}>
                        {simError}
                    </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', fontSize: '0.86rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                                <th style={{ padding: '10px 12px' }}>{isRTL ? 'الترتيب' : 'Rank'}</th>
                                <th style={{ padding: '10px 12px' }}>{isRTL ? 'المتجر / البوتيك' : 'Boutique'}</th>
                                <th style={{ padding: '10px 12px' }}>{isRTL ? 'المسافة الجغرافية' : 'Physical Distance'}</th>
                                <th style={{ padding: '10px 12px' }}>{isRTL ? 'الدرجة الكلية (100)' : 'Algorithmic Score'}</th>
                                <th style={{ padding: '10px 12px' }}>{isRTL ? 'تفصيل العوامل المؤثرة' : 'Factor Breakdown'}</th>
                                <th style={{ padding: '10px 12px' }}>{isRTL ? 'الفئة والتعزيز' : 'Tier & Boosts'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {simResults.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>
                                        {simulating ? (isRTL ? 'جاري حساب المسافات والنقاط...' : 'Calculating spatial vectors & rank scores...') : (isRTL ? 'لا توجد متاجر ضمن نطاق البحث المحدد' : 'No boutiques found within search radius')}
                                    </td>
                                </tr>
                            ) : (
                                simResults.map((shop, idx) => {
                                    const rank = idx + 1;
                                    const rankBadgeColor = rank === 1 ? '#d4af37' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : '#475569';
                                    return (
                                        <tr key={shop.id || idx} style={{ borderBottom: '1px solid #1e293b' }}>
                                            <td style={{ padding: '12px', fontWeight: '700' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '50%',
                                                    background: `${rankBadgeColor}22`,
                                                    color: rankBadgeColor,
                                                    border: `1px solid ${rankBadgeColor}66`
                                                }}>
                                                    #{rank}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', color: '#f8fafc', fontWeight: '600' }}>
                                                {shop.name}
                                                {shop.is_verified && (
                                                    <span style={{ marginLeft: '6px', color: '#10b981', fontSize: '0.75rem' }}>✓</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px', color: '#cbd5e1' }}>
                                                <Navigation size={13} style={{ display: 'inline', marginRight: '4px', color: '#38bdf8' }} />
                                                {typeof shop.distance_km === 'number' ? `${shop.distance_km.toFixed(1)} km` : 'N/A'}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '80px', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${Math.min(100, Math.max(0, shop.total_score || 0))}%`, height: '100%', background: 'linear-gradient(90deg, #c8a951, #10b981)' }} />
                                                    </div>
                                                    <span style={{ fontWeight: '700', color: '#c8a951', fontSize: '0.88rem' }}>
                                                        {shop.total_score ? shop.total_score.toFixed(1) : 0}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '0.78rem' }}>
                                                <span style={{ color: '#94a3b8', marginRight: '8px' }}>
                                                    Dist: <strong style={{ color: '#f8fafc' }}>{shop.weighted_scores?.distance ? shop.weighted_scores.distance.toFixed(1) : '-'}</strong>
                                                </span>
                                                <span style={{ color: '#94a3b8', marginRight: '8px' }}>
                                                    Trust: <strong style={{ color: '#f8fafc' }}>{shop.weighted_scores?.trust ? shop.weighted_scores.trust.toFixed(1) : '-'}</strong>
                                                </span>
                                                <span style={{ color: '#94a3b8', marginRight: '8px' }}>
                                                    Rating: <strong style={{ color: '#f8fafc' }}>{shop.weighted_scores?.rating ? shop.weighted_scores.rating.toFixed(1) : '-'}</strong>
                                                </span>
                                                <span style={{ color: '#94a3b8' }}>
                                                    Tier: <strong style={{ color: '#f8fafc' }}>{shop.weighted_scores?.tier ? shop.weighted_scores.tier.toFixed(1) : '-'}</strong>
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: '600',
                                                    textTransform: 'uppercase',
                                                    background: shop.tier === 'premium' ? 'rgba(200, 169, 81, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                                    color: shop.tier === 'premium' ? '#c8a951' : '#60a5fa'
                                                }}>
                                                    {shop.tier || 'standard'}
                                                </span>
                                                {shop.is_boosted && (
                                                    <span style={{ marginLeft: '6px', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                                                        Boosted
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
        </div>
    );
};

export default RecommendationLab;
