import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Store, Send, CheckCircle, Plus, Trash2, Image, User, Mail, Lock } from 'lucide-react';
import api from '../../utils/api';

const VendorSignup = () => {
    const { t } = useTranslation();
    const { isRTL } = useOutletContext();
    const { user } = useContext(AuthContext);

    // Guest account fields
    const [guestData, setGuestData] = useState({ ownerName: '', ownerEmail: '', ownerPassword: '' });
    // Shop fields
    const [formData, setFormData] = useState({ name: '', address: '', whatsapp_number: '' });
    const [photoInputs, setPhotoInputs] = useState(['']);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Already a vendor/admin — redirect to dashboard
    if (user && (user.role === 'admin' || user.role === 'vendor')) {
        return (
            <div className="container section text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <CheckCircle size={64} color="#2ecc71" style={{ marginBottom: '20px' }} />
                <h2>{isRTL ? 'أنت بالفعل تمتلك متجرًا' : 'You already have shop access'}</h2>
                <Link to={user.role === 'admin' ? '/admin' : '/vendor'} className="btn btn-gold" style={{ marginTop: '20px' }}>
                    {isRTL ? 'اذهب إلى لوحة التحكم' : 'Go to Dashboard'}
                </Link>
            </div>
        );
    }

    const isGuest = !user; // true if not logged in

    const addPhotoInput = () => setPhotoInputs([...photoInputs, '']);
    const removePhotoInput = (index) => setPhotoInputs(photoInputs.filter((_, i) => i !== index));
    const updatePhotoInput = (index, value) => {
        const updated = [...photoInputs];
        updated[index] = value;
        setPhotoInputs(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const images = photoInputs.filter(url => url.trim() !== '');

        try {
            if (isGuest) {
                // Guest flow: create user + shop together via /api/shops/manual (pending status)
                const response = await api.post('/shops/manual', {
                    ownerName: guestData.ownerName,
                    ownerEmail: guestData.ownerEmail,
                    ownerPassword: guestData.ownerPassword,
                    shopName: formData.name,
                    address: formData.address,
                    whatsapp_number: formData.whatsapp_number,
                    images
                });

                if (response.data.success || response.status === 201 || response.status === 200) {
                    setSuccess(true);
                } else {
                    alert(response.data.error || 'Submission failed');
                }
            } else {
                // Logged-in user flow: just create shop linked to their account
                const response = await api.post('/shops', {
                    owner_id: user.id,
                    name: formData.name,
                    address: formData.address,
                    whatsapp_number: formData.whatsapp_number,
                    latitude: null,
                    longitude: null,
                    logo_url: images[0] || null,
                    images
                });

                if (response.data.success || response.status === 201 || response.status === 200) {
                    setSuccess(true);
                } else {
                    alert(response.data.error || 'Submission failed');
                }
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert(error.response?.data?.error || 'A network error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="container section text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Send size={64} color="#2ecc71" style={{ marginBottom: '20px' }} />
                <h2>{isRTL ? 'تم استلام طلبك بنجاح' : 'Request Submitted Successfully'}</h2>
                <p>
                    {isRTL
                        ? 'شكراً لاهتمامك بالانضمام إلينا كبائع. ستقوم الإدارة بمراجعة طلبك والرد عليك قريباً.'
                        : 'Thank you for your interest in joining as a vendor. The administration will review your request and get back to you soon.'}
                </p>
                {isGuest && (
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                        {isRTL
                            ? 'يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني وكلمة المرور.'
                            : 'You can now login with your email and password.'}
                    </p>
                )}
                <Link to={isGuest ? "/login" : "/"} className="btn btn-gold" style={{ marginTop: '20px' }}>
                    {isGuest
                        ? (isRTL ? 'تسجيل الدخول' : 'Go to Login')
                        : (isRTL ? 'العودة للصفحة الرئيسية' : 'Return to Home')}
                </Link>
            </div>
        );
    }

    return (
        <div className="container section" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="text-center" style={{ marginBottom: '40px' }}>
                <Store size={48} color="var(--color-gold)" style={{ marginBottom: '15px' }} />
                <h2>{isRTL ? 'طلب الانضمام كبائع' : 'Vendor Registration Request'}</h2>
                <p className="text-muted">
                    {isRTL
                        ? 'قم بتعبئة النموذج التالي لإرسال طلب تسجيل متجرك على منصتنا.'
                        : 'Fill out the form below to submit a request to register your shop on our platform.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>

                {/* Guest Account Section */}
                {isGuest && (
                    <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #eee' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={18} color="var(--color-gold)" />
                            {isRTL ? 'معلومات الحساب' : 'Account Information'}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                                    {isRTL ? 'الاسم الكامل' : 'Full Name'}
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    value={guestData.ownerName}
                                    onChange={(e) => setGuestData({...guestData, ownerName: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                                    {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                                </label>
                                <input
                                    type="email"
                                    className="form-control"
                                    required
                                    value={guestData.ownerEmail}
                                    onChange={(e) => setGuestData({...guestData, ownerEmail: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                                    {isRTL ? 'كلمة المرور' : 'Password'}
                                </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    required
                                    minLength={4}
                                    value={guestData.ownerPassword}
                                    onChange={(e) => setGuestData({...guestData, ownerPassword: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Logged-in user info */}
                {!isGuest && (
                    <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#f0faf5', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #d4edda' }}>
                        <CheckCircle size={18} color="#2ecc71" />
                        <span style={{ fontSize: '0.9rem', color: '#333' }}>
                            {isRTL ? `مسجّل كـ ${user.name || user.email}` : `Signed in as ${user.name || user.email}`}
                        </span>
                    </div>
                )}

                {/* Shop Details */}
                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Store size={18} color="var(--color-gold)" />
                    {isRTL ? 'معلومات المتجر' : 'Shop Details'}
                </h3>

                {/* Shop Name */}
                <div style={{ marginBottom: '18px' }}>
                    <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                        {isRTL ? 'اسم المتجر المقترح' : 'Proposed Shop Name'}
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                </div>

                {/* Address */}
                <div style={{ marginBottom: '18px' }}>
                    <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                        {isRTL ? 'العنوان التفصيلي للمتجر' : 'Detailed Shop Address'}
                    </label>
                    <textarea
                        className="form-control"
                        rows="3"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical' }}
                    ></textarea>
                </div>

                {/* WhatsApp Number */}
                <div style={{ marginBottom: '18px' }}>
                    <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                        {isRTL ? 'رقم الواتساب (مع رمز الدولة)' : 'WhatsApp Number (with country code)'}
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="+974..."
                        value={formData.whatsapp_number}
                        onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                </div>

                {/* Multiple Photos */}
                <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Image size={16} /> {isRTL ? 'صور المتجر (اختياري)' : 'Shop Photos (optional)'}
                        </label>
                        <button
                            type="button"
                            onClick={addPhotoInput}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px dashed #aaa', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', color: '#555', fontSize: '0.85rem' }}
                        >
                            <Plus size={14} /> {isRTL ? 'إضافة صورة' : 'Add Photo'}
                        </button>
                    </div>

                    {photoInputs.map((url, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                            {url && (
                                <img
                                    src={url}
                                    alt="preview"
                                    onError={(e) => e.target.style.display = 'none'}
                                    onLoad={(e) => e.target.style.display = 'block'}
                                    style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', flexShrink: 0 }}
                                />
                            )}
                            <input
                                type="url"
                                className="form-control"
                                placeholder={isRTL ? `رابط الصورة ${index + 1}` : `Photo URL ${index + 1}`}
                                value={url}
                                onChange={(e) => updatePhotoInput(index, e.target.value)}
                                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            {photoInputs.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removePhotoInput(index)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#e74c3c', padding: '4px', flexShrink: 0 }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                    <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '6px' }}>
                        {isRTL ? 'أدخل روابط مباشرة لصور متجرك. يمكن إضافة أكثر من صورة.' : 'Enter direct image URLs for your shop. You can add multiple photos.'}
                    </p>
                </div>

                <button
                    type="submit"
                    className="btn btn-gold"
                    style={{ width: '100%', padding: '14px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    disabled={loading}
                >
                    <Send size={18} />
                    {loading ? (isRTL ? 'جاري الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال الطلب' : 'Submit Request')}
                </button>

                {/* Login link for guests */}
                {isGuest && (
                    <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem', color: '#888' }}>
                        {isRTL ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                        <Link to="/login" style={{ color: 'var(--color-gold)', fontWeight: '600' }}>
                            {isRTL ? 'تسجيل الدخول' : 'Login here'}
                        </Link>
                    </p>
                )}
            </form>
        </div>
    );
};

export default VendorSignup;
