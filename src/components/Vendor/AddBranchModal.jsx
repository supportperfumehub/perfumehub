import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Store, MapPin, Phone, Clock, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../utils/api_v1_0_2';

const AddBranchModal = ({ isOpen, onClose, onBranchCreated, isRTL }) => {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        whatsapp_number: '',
        working_hours: '09:00 AM - 10:00 PM',
        logo_url: '',
        region_id: ''
    });
    const [regionsList, setRegionsList] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        api.get('/regions')
            .then(res => setRegionsList(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error('Failed to load regions in branch modal:', err));
    }, [isOpen]);

    if (!isOpen) return null;

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, logo_url: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim() || !formData.address.trim()) {
            setError(isRTL ? 'يرجى ملء اسم المتجر والعنوان' : 'Please fill in shop name and address');
            return;
        }

        try {
            setSubmitting(true);
            const res = await api.post('/shops/create-branch', {
                name: formData.name.trim(),
                address: formData.address.trim(),
                whatsapp_number: formData.whatsapp_number.trim() || null,
                logo_url: formData.logo_url || null,
                images: formData.logo_url ? [formData.logo_url] : [],
                region_id: formData.region_id || null
            });

            if (res.data?.success && res.data?.shop) {
                onBranchCreated(res.data.shop);
                onClose();
            } else {
                setError(res.data?.error || (isRTL ? 'فشل إضافة الفرع' : 'Failed to add branch'));
            }
        } catch (err) {
            console.error('Error creating branch:', err);
            setError(err.response?.data?.error || err.message || (isRTL ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'));
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div 
            className="confirm-modal-overlay animate-fade-in" 
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(6px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}
        >
            <div 
                className={`add-branch-card ${isRTL ? 'rtl' : 'ltr'}`} 
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#18181b',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '520px',
                    padding: '28px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
                    position: 'relative',
                    color: '#f8fafc'
                }}
            >
                <button 
                    type="button" 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '18px',
                        [isRTL ? 'left' : 'right']: '18px',
                        background: 'rgba(255,255,255,0.06)',
                        border: 'none',
                        color: '#94a3b8',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <X size={16} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid var(--color-gold, #d4af37)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-gold, #d4af37)'
                    }}>
                        <Store size={22} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>
                            {isRTL ? 'إضافة فرع / متجر جديد' : 'Add New Branch / Shop'}
                        </h3>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                            {isRTL ? 'أضف فرعًا جديدًا تحت حسابك كبائع معتمد' : 'Register another boutique branch under your vendor account'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#f87171',
                        fontSize: '0.85rem'
                    }}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                            {isRTL ? 'اسم الفرع / المتجر *' : 'Branch / Shop Name *'}
                        </label>
                        <input
                            type="text"
                            required
                            placeholder={isRTL ? 'مثال: بيرفيوم هوب - فرع فيلاجيو' : 'e.g. Perfume Hub - Villaggio Mall'}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                background: '#27272a',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.9rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                            {isRTL ? 'العنوان والموقع في قطر *' : 'Address & Location in Qatar *'}
                        </label>
                        <input
                            type="text"
                            required
                            placeholder={isRTL ? 'مثال: الدوحة، شارع المطار القديم، مبنى 45' : 'e.g. Doha, Old Airport Road, Bldg 45'}
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                background: '#27272a',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.9rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                                {isRTL ? 'رقم الواتساب' : 'WhatsApp Number'}
                            </label>
                            <input
                                type="text"
                                placeholder="+974 5555 1234"
                                value={formData.whatsapp_number}
                                onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: '#27272a',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                                {isRTL ? 'أوقات العمل' : 'Working Hours'}
                            </label>
                            <input
                                type="text"
                                placeholder="09:00 AM - 10:00 PM"
                                value={formData.working_hours}
                                onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: '#27272a',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    {regionsList.length > 0 && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                                {isRTL ? 'البلدية أو المنطقة في قطر' : 'Zone / Municipality in Qatar'}
                            </label>
                            <select
                                value={formData.region_id}
                                onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: '#27272a',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="" style={{ background: '#18181b', color: '#94a3b8' }}>
                                    {isRTL ? '-- اختر البلدية / المنطقة (اختياري) --' : '-- Select Municipality / Zone (Optional) --'}
                                </option>
                                {regionsList.map(r => (
                                    <option key={r.id} value={r.id} style={{ background: '#18181b', color: '#fff' }}>
                                        {r.name} ({r.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                            {isRTL ? 'شعار المتجر أو صورة الواجهة' : 'Shop Logo / Front Photo'}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            {formData.logo_url ? (
                                <img 
                                    src={formData.logo_url} 
                                    alt="Preview" 
                                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-gold)' }} 
                                />
                            ) : (
                                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#27272a', border: '1px dashed #52525b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>
                                    <Store size={20} />
                                </div>
                            )}
                            <label style={{
                                padding: '8px 16px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '8px',
                                color: '#e2e8f0',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: '500'
                            }}>
                                <Upload size={14} />
                                {isRTL ? 'اختيار صورة' : 'Choose Photo'}
                                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 18px',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '8px',
                                color: '#94a3b8',
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                padding: '10px 22px',
                                background: 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#000',
                                fontSize: '0.88rem',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: submitting ? 0.7 : 1
                            }}
                        >
                            <Store size={16} />
                            {submitting 
                                ? (isRTL ? 'جاري الإنشاء...' : 'Creating...') 
                                : (isRTL ? 'إنشاء الفرع' : 'Create Branch')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default AddBranchModal;
