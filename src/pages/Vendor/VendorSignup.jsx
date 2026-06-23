import React, { useState, useContext, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Store, Send, CheckCircle, Plus, Trash2, Image, User, Mail, Lock, Upload, Phone, MapPin, Clock } from 'lucide-react';
import api from '../../utils/api_v1_0_2';
import './VendorSignup.css';

const VendorSignup = () => {
    useTranslation();
    const { isRTL } = useOutletContext();
    const { user } = useContext(AuthContext);
    // No ref needed for label-based upload triggers

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
            <div className="vendor-signup-page">
                <div className="vendor-signup-container text-center">
                    <CheckCircle size={64} className="vendor-input-icon" style={{ marginBottom: '20px', margin: '0 auto' }} />
                    <h2 className="vendor-signup-title" style={{ marginTop: '20px' }}>
                        {isRTL ? 'أنت بالفعل تمتلك متجرًا' : 'You already have shop access'}
                    </h2>
                    <Link to={user.role === 'admin' ? '/admin' : '/vendor'} className="submit-request-btn" style={{ marginTop: '30px' }}>
                        {isRTL ? 'اذهب إلى لوحة التحكم' : 'Go to Dashboard'}
                    </Link>
                </div>
            </div>
        );
    }

    // Pending shop request — show "Under Review" screen
    if (user && user.shop_id && user.role === 'customer') {
        return (
            <div className="vendor-signup-page">
                <div className="vendor-signup-container text-center">
                    <div className="upload-icon-circle animate-pulse" style={{ width: '80px', height: '80px', margin: '0 auto', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid var(--color-gold)' }}>
                        <Clock size={40} style={{ color: 'var(--color-gold)' }} />
                    </div>
                    <h2 className="vendor-signup-title" style={{ marginTop: '20px' }}>
                        {isRTL ? 'طلبك قيد المراجعة' : 'Your request is under review'}
                    </h2>
                    <p className="vendor-signup-subtitle" style={{ marginBottom: '30px', marginTop: '10px' }}>
                        {isRTL
                            ? 'لقد تم استلام طلب الانضمام كبائع الخاص بك وهو قيد المراجعة حاليًا من قبل الإدارة. يرجى الانتظار لحين التفعيل.'
                            : 'We have received your vendor application. It is currently being reviewed by the administration. Please wait for activation.'}
                    </p>
                    <Link to="/" className="submit-request-btn">
                        {isRTL ? 'العودة للصفحة الرئيسية' : 'Return to Home'}
                    </Link>
                </div>
            </div>
        );
    }

    const isGuest = !user;

    const addPhotoInput = () => setPhotoInputs([...photoInputs, '']);
    const removePhotoInput = (index) => setPhotoInputs(photoInputs.filter((_, i) => i !== index));
    const updatePhotoInput = (index, value) => {
        const updated = [...photoInputs];
        updated[index] = value;
        setPhotoInputs(updated);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
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

                    setPhotoInputs(prev => {
                        const emptyIndex = prev.findIndex(url => !url);
                        if (emptyIndex !== -1) {
                            const updated = [...prev];
                            updated[emptyIndex] = compressedBase64;
                            return updated;
                        }
                        return [...prev, compressedBase64];
                    });
                };
                img.onerror = () => {
                    console.error("Failed to load image");
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
        e.target.value = ''; // Reset input to allow uploading same image
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const images = photoInputs.filter(url => url.trim() !== '');

        try {
            if (isGuest) {
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
                const response = await api.post('/shops', {
                    owner_id: user?.id,
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
            <div className="vendor-signup-page">
                <div className="vendor-signup-container text-center">
                    <div className="upload-icon-circle" style={{ width: '80px', height: '80px' }}>
                        <Send size={40} />
                    </div>
                    <h2 className="vendor-signup-title">{isRTL ? 'تم استلام طلبك بنجاح' : 'Request Submitted'}</h2>
                    <p className="vendor-signup-subtitle" style={{ marginBottom: '30px' }}>
                        {isRTL
                            ? 'شكراً لاهتمامك بالانضمام إلينا كبائع. ستقوم الإدارة بمراجعة طلبك والرد عليك قريباً.'
                            : 'Thank you for your interest. The administration will review your request and get back to you soon.'}
                    </p>
                    <Link to={isGuest ? "/login" : "/"} className="submit-request-btn">
                        {isGuest
                            ? (isRTL ? 'تسجيل الدخول' : 'Go to Login')
                            : (isRTL ? 'العودة للصفحة الرئيسية' : 'Return to Home')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="vendor-signup-page">
            <div className="vendor-signup-container animate-slide-up">
                <div className="vendor-signup-header">
                    <div className="upload-icon-circle">
                        <Store size={28} />
                    </div>
                    <h1 className="vendor-signup-title">{isRTL ? 'طلب الانضمام كبائع' : 'Vendor Registration'}</h1>
                    <p className="vendor-signup-subtitle">
                        {isRTL
                            ? 'قم بتعبئة النموذج التالي لإرسال طلب تسجيل متجرك على منصتنا.'
                            : 'Join our exclusive network of premium fragrance vendors. Complete the registration below.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="vendor-form">
                    {/* Account Section */}
                    {isGuest && (
                        <div className="vendor-form-section">
                            <h3 className="section-title">
                                <User size={18} />
                                {isRTL ? 'معلومات الحساب' : 'Account Information'}
                            </h3>
                            <div className="vendor-form">
                                <div className="vendor-form-group">
                                    <label>{isRTL ? 'الاسم الكامل' : 'Full Name'}</label>
                                    <div className="vendor-input-wrapper">
                                        <User size={18} className="vendor-input-icon" />
                                        <input
                                            type="text"
                                            required
                                            placeholder={isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                                            value={guestData.ownerName}
                                            onChange={(e) => setGuestData({...guestData, ownerName: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="form-group-grid">
                                    <div className="vendor-form-group">
                                        <label>{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</label>
                                        <div className="vendor-input-wrapper">
                                            <Mail size={18} className="vendor-input-icon" />
                                            <input
                                                type="email"
                                                required
                                                placeholder="email@example.com"
                                                value={guestData.ownerEmail}
                                                onChange={(e) => setGuestData({...guestData, ownerEmail: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="vendor-form-group">
                                        <label>{isRTL ? 'كلمة المرور' : 'Password'}</label>
                                        <div className="vendor-input-wrapper">
                                            <Lock size={18} className="vendor-input-icon" />
                                            <input
                                                type="password"
                                                required
                                                minLength={4}
                                                placeholder="••••••••"
                                                value={guestData.ownerPassword}
                                                onChange={(e) => setGuestData({...guestData, ownerPassword: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Signed-in user info banner */}
                    {!isGuest && (
                        <div className="vendor-form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                            <div style={{ padding: '15px 20px', background: 'rgba(212, 175, 55, 0.08)', borderRadius: '14px', border: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <CheckCircle size={20} color="var(--color-gold)" />
                                <span style={{ color: 'var(--color-white)', fontSize: '0.9rem', fontWeight: 600 }}>
                                    {isRTL ? `مسجّل كـ ${user.name || user.email}` : `Authenticated as ${user.name || user.email}`}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Shop Details */}
                    <div className="vendor-form-section">
                        <h3 className="section-title">
                            <Store size={18} />
                            {isRTL ? 'معلومات المتجر' : 'Shop Details'}
                        </h3>
                        <div className="vendor-form">
                            <div className="vendor-form-group">
                                <label>{isRTL ? 'اسم المتجر المقترح' : 'Proposed Shop Name'}</label>
                                <div className="vendor-input-wrapper">
                                    <Store size={18} className="vendor-input-icon" />
                                    <input
                                        type="text"
                                        required
                                        placeholder={isRTL ? 'أدخل اسم المتجر' : 'Enter shop name'}
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="vendor-form-group">
                                <label>{isRTL ? 'رقم الواتساب' : 'WhatsApp Number'}</label>
                                <div className="vendor-input-wrapper">
                                    <Phone size={18} className="vendor-input-icon" />
                                    <input
                                        type="text"
                                        placeholder="+974..."
                                        value={formData.whatsapp_number}
                                        onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="vendor-form-group">
                                <label>{isRTL ? 'العنوان التفصيلي' : 'Detailed Address'}</label>
                                <div className="vendor-input-wrapper">
                                    <MapPin size={18} className="vendor-input-icon" style={{ alignSelf: 'flex-start', marginTop: '15px' }} />
                                    <textarea
                                        required
                                        placeholder={isRTL ? 'أدخل العنوان الكامل' : 'Enter detailed location'}
                                        value={formData.address}
                                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Photos Section */}
                    <div className="vendor-form-section">
                        <h3 className="section-title">
                            <Image size={18} />
                            {isRTL ? 'صور المتجر' : 'Shop Presentation'}
                        </h3>
                        
                        <div className="photo-upload-container">
                            <input 
                                type="file" 
                                id="vendor-signup-file-input"
                                style={{ display: 'none' }} 
                                accept="image/*" 
                                multiple 
                                onChange={handleFileUpload} 
                            />
                            {/* Local Upload Zone */}
                            <label className="local-upload-zone" htmlFor="vendor-signup-file-input" style={{ display: 'block', cursor: 'pointer' }}>
                                <div className="upload-icon-circle">
                                    <Upload size={20} />
                                </div>
                                <p className="upload-text">
                                    {isRTL ? 'اضغط لرفع الصور من' : 'Click to upload from'} <span>{isRTL ? 'جهازك' : 'Local Storage'}</span>
                                </p>
                            </label>

                            <div className="photo-input-list">
                                {photoInputs.map((url, index) => (
                                    <div key={index} className="photo-input-item">
                                        <div className="photo-preview-box">
                                            {url ? <img src={url} alt="Preview" /> : <Image size={20} style={{ opacity: 0.2 }} />}
                                        </div>
                                        <div className="vendor-input-wrapper photo-url-input">
                                            <input
                                                type="text"
                                                placeholder={isRTL ? `رابط الصورة ${index + 1}` : `Photo URL or Data ${index + 1}`}
                                                value={url}
                                                onChange={(e) => updatePhotoInput(index, e.target.value)}
                                            />
                                        </div>
                                        {photoInputs.length > 1 && (
                                            <button type="button" className="remove-photo-btn" onClick={() => removePhotoInput(index)}>
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button type="button" onClick={addPhotoInput} className="text-link" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', opacity: 1, color: 'var(--color-gold)' }}>
                                <Plus size={14} /> {isRTL ? 'إضافة رابط إضافي' : 'Add another link'}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="submit-request-btn" disabled={loading}>
                        {loading ? (isRTL ? 'جاري الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال طلب التسجيل' : 'Submit Registration')}
                        <Send size={18} />
                    </button>

                    {isGuest && (
                        <p className="login-redirect">
                            {isRTL ? 'لديك حساب بالفعل؟' : 'Already have an account?'}
                            <Link to="/login">{isRTL ? 'تسجيل الدخول' : 'Login here'}</Link>
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};

export default VendorSignup;

