import React, { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ShopContext } from '../../context/ShopContext';
import './Login.css';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { isRTL } = useOutletContext();
    const { resetPassword } = useContext(AuthContext);
    const { showToast } = useContext(ShopContext);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError(isRTL ? 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        try {
            const result = await resetPassword(token, password);
            if (result.success) {
                setIsSuccess(true);
                showToast(isRTL ? 'تم تغيير كلمة المرور بنجاح' : 'Password reset successfully', 'success');
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setError(result.message);
                showToast(result.message, 'error');
            }
        } catch (err) {
            setError(isRTL ? 'فشل إعادة تعيين كلمة المرور' : 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container animate-slide-up">
                <div className="login-header text-center">
                    <h1 className="login-title">{isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}</h1>
                    <p className="login-subtitle">
                        {isRTL 
                            ? 'أدخل كلمة المرور الجديدة الخاصة بك أدناه.' 
                            : 'Enter your new password below.'}
                    </p>
                </div>

                {isSuccess ? (
                    <div className="success-mode text-center fade-in" style={{ padding: '20px 0' }}>
                        <CheckCircle size={60} color="#d4af37" style={{ margin: '0 auto 20px' }} />
                        <h3 style={{ color: '#fff', marginBottom: '10px' }}>
                            {isRTL ? 'تم بنجاح!' : 'Success!'}
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                            {isRTL 
                                ? 'تم تغيير كلمة المرور الخاصة بك. سيتم تحويلك إلى صفحة تسجيل الدخول...' 
                                : 'Your password has been reset. Redirecting to login...'}
                        </p>
                    </div>
                ) : (
                    <form className="login-form" onSubmit={handleSubmit}>
                        {error && (
                            <div className="error-message fade-in">
                                <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label>{isRTL ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                            <div className="input-with-icon">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    placeholder={isRTL ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                            <div className="input-with-icon">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    placeholder={isRTL ? 'تأكيد كلمة المرور' : 'Confirm new password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-gold login-btn" 
                            disabled={isLoading}
                            style={{ opacity: isLoading ? 0.7 : 1 }}
                        >
                            <span>
                                {isLoading 
                                    ? (isRTL ? 'جاري الحفظ...' : 'Saving...') 
                                    : (isRTL ? 'تحديث كلمة المرور' : 'Update Password')}
                            </span>
                            {!isLoading && <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />}
                        </button>
                    </form>
                )}

                <div className="login-footer text-center" style={{ marginTop: '25px' }}>
                    <Link to="/login" className="text-link" style={{ fontSize: '0.8rem', color: '#d4af37' }}>
                        {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Login'}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
