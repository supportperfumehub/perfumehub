import React, { useState, useContext } from 'react';
import { useOutletContext, Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Store, Eye, EyeOff } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ShopContext } from '../../context/ShopContext';
import './Login.css';

const Login = () => {
    const { isRTL = false } = useOutletContext() || {};
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [isResetSent, setIsResetSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isVendorLogin, setIsVendorLogin] = useState(false);

    const { user, isVendor, login, register, forgotPassword, loginWithGoogle, requires2FA, verify2FA } = useContext(AuthContext);
    const { showToast } = useContext(ShopContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [otpCode, setOtpCode] = useState('');

    const resolveDestination = (authUser, explicitVendorLogin = isVendorLogin) => {
        if (!authUser) return '/';
        const role = authUser.role;
        const hasVendor = role === 'vendor' || authUser.is_vendor || Boolean(authUser.shop_id) || isVendor;
        const isAdminRole = role === 'admin' || role === 'super_admin' || role === 'regional_admin';

        // 1. If explicit vendor sign in was selected and account has vendor capabilities
        if (explicitVendorLogin && hasVendor) {
            return '/vendor';
        }
        // 2. If attempted navigation from a specific path was recorded
        if (location.state?.from?.pathname) {
            return location.state.from.pathname;
        }
        // 3. If explicit vendor login but no vendor shop yet, route to vendor anyway to show prompt
        if (explicitVendorLogin) {
            return '/vendor';
        }
        // 4. Role defaults:
        if (isAdminRole) {
            return '/admin';
        }
        if (hasVendor) {
            return '/vendor';
        }
        return '/';
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setIsVendorLogin(false);
        setIsForgotPassword(false);
        setError('');
        setIsResetSent(false);
        setOtpCode('');
    };

    // Load remembered email on mount
    React.useEffect(() => {
        console.log('Login Component Mounted');
        const savedEmail = localStorage.getItem('remembered_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    // Redirect authenticated users away from Login/Register page
    React.useEffect(() => {
        if (user) {
            const dest = resolveDestination(user);
            navigate(dest, { replace: true });
        }
    }, [user, isVendor, isVendorLogin, navigate, location.state]);

    const formatAuthError = (msg) => {
        if (!msg) return '';
        const lower = String(msg).toLowerCase();
        if (lower.includes('credential') || lower.includes('incorrect') || (lower.includes('password') && lower.includes('wrong')) || lower.includes('invalid')) {
            return isRTL 
                ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات والمحاولة مجدداً.'
                : 'Incorrect email or password. Please check your details and try again.';
        }
        if (lower.includes('google')) {
            return isRTL
                ? 'تم إنشاء هذا الحساب باستخدام جوجل. يرجى تسجيل الدخول عبر الزر أدناه.'
                : 'This account was created with Google. Please click "Continue with Google" below.';
        }
        if (lower.includes('already exists')) {
            return isRTL
                ? 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استعادة كلمة المرور.'
                : 'This email is already registered. Please sign in or reset your password.';
        }
        return msg;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (requires2FA) {
            const result = await verify2FA(otpCode);
            if (result.success) {
                showToast(isRTL ? "تم تسجيل الدخول بنجاح!" : "Login successful!", 'success');
                const dest = resolveDestination(result.user);
                navigate(dest);
            } else {
                setError(result.message);
                showToast(result.message, 'error');
            }
            return;
        }

        if (isForgotPassword) {
            const cleanEmail = email.trim().toLowerCase();
            const result = await forgotPassword(cleanEmail);
            if (result.success) {
                setIsResetSent(true);
                showToast(result.message, 'success');
            } else {
                setError(result.message);
                showToast(result.message, 'error');
            }
            return;
        }

        if (isLogin) {
            const cleanEmail = email.trim().toLowerCase();
            const result = await login(cleanEmail, password);
            if (result.success) {
                if (result.requires2FA) {
                    showToast(isRTL ? "يرجى إدخال رمز التحقق الثنائي" : "Please enter 2FA code", 'info');
                    return;
                }
                showToast(isRTL ? "تم تسجيل الدخول بنجاح!" : "Login successful!", 'success');
                
                // Handle Remember Me
                if (rememberMe) {
                    localStorage.setItem('remembered_email', cleanEmail);
                } else {
                    localStorage.removeItem('remembered_email');
                }

                const dest = resolveDestination(result.user);
                navigate(dest);
            } else {
                setError(result.message);
                showToast(result.message, 'error');
            }
        } else {
            const nameInput = e.target.querySelector('input[placeholder*="name"]');
            const name = nameInput ? nameInput.value : '';
            const cleanEmail = email.trim().toLowerCase();
            
            const result = await register(name, cleanEmail, password);
            if (result.success) {
                showToast(isRTL ? "تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول" : "Signup successful! You can now log in.", 'success');
                setIsLogin(true);
            } else {
                setError(result.message);
                showToast(result.message, 'error');
            }
        }
    };

    return (
        <div className="login-page">
            <div className={`login-container fade-in ${isLogin ? 'login-mode' : 'signup-mode'}`}>
                <div className="mode-toggle animate-slide-up">
                    <button 
                        className={`mode-btn ${isLogin ? 'active' : ''}`} 
                        onClick={() => !isLogin && toggleMode()}
                        type="button"
                    >
                        {isRTL ? 'تسجيل الدخول' : 'Sign In'}
                    </button>
                    <button 
                        className={`mode-btn ${!isLogin ? 'active' : ''}`} 
                        onClick={() => isLogin && toggleMode()}
                        type="button"
                    >
                        {isRTL ? 'إنشاء حساب' : 'Sign Up'}
                    </button>
                </div>

                <div className="login-header text-center">
                    <h1 className="login-title animate-slide-up">
                        {isRTL
                            ? (isLogin ? 'مرحباً بك' : 'انضم إلينا')
                            : (isLogin ? 'Welcome Back' : 'Create Account')}
                    </h1>
                    <p className="login-subtitle animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        {isRTL
                            ? (isVendorLogin ? 'تسجيل دخول البائع للمتابعة إلى لوحة التحكم' : (isLogin ? 'سجل الدخول للمتابعة إلى حسابك' : 'ابدأ رحلتك في عالم الفخامة'))
                            : (isVendorLogin ? 'Sign in to your vendor dashboard to continue' : (isLogin ? 'Sign in to your premium account' : 'Discover a world of luxury'))}
                    </p>
                </div>

                {isVendorLogin && (
                    <div className="vendor-login-indicator animate-slide-up" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(212, 175, 55, 0.12)',
                        border: '1px solid rgba(212, 175, 55, 0.35)',
                        marginBottom: '18px',
                        color: '#d4af37',
                        fontSize: '0.86rem',
                        fontWeight: '600'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Store size={18} />
                            <span>{isRTL ? 'بوابة دخول الشركاء وأصحاب المتاجر' : 'Vendor & Boutique Partner Login'}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsVendorLogin(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '0.78rem',
                                textDecoration: 'underline',
                                cursor: 'pointer'
                            }}
                        >
                            {isRTL ? 'دخول عادي' : 'Standard'}
                        </button>
                    </div>
                )}

                <form className="login-form animate-slide-up" style={{ animationDelay: '0.2s' }} onSubmit={handleSubmit}>
                    {error && (
                        <div className="error-message">
                            <div style={{ fontWeight: '500', lineHeight: '1.4' }}>{formatAuthError(error)}</div>
                            <div className="error-help-actions" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', borderTop: '1px solid rgba(255, 107, 107, 0.2)', paddingTop: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                    {isRTL ? 'خيارات سريعة للمساعدة:' : 'Quick options to help you sign in:'}
                                </span>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => toggleMode()}
                                        style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.78rem', padding: 0 }}
                                    >
                                        {isRTL ? 'إنشاء حساب جديد' : 'Create an Account'}
                                    </button>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setIsForgotPassword(true);
                                            setError('');
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.78rem', padding: 0 }}
                                    >
                                        {isRTL ? 'نسيت كلمة المرور' : 'Reset Password'}
                                    </button>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                                    <button 
                                        type="button" 
                                        onClick={() => loginWithGoogle()}
                                        style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.78rem', padding: 0 }}
                                    >
                                        {isRTL ? 'دخول عبر Google' : 'Sign in with Google'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-content">
                        {requires2FA ? (
                            <div className="form-group slide-down">
                                <label>{isRTL ? 'رمز التحقق (2FA)' : '2FA Verification Code'}</label>
                                <div className="input-with-icon">
                                    <Lock size={18} className="input-icon" />
                                    <input
                                        type="text"
                                        placeholder={isRTL ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter 6-digit OTP code'}
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        maxLength="6"
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                {!isLogin && !isForgotPassword && (
                                    <div className="form-group slide-down">
                                        <label>{isRTL ? 'الاسم الكامل' : 'Full Name'}</label>
                                        <div className="input-with-icon">
                                            <User size={18} className="input-icon" />
                                            <input 
                                                type="text" 
                                                placeholder={isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name'} 
                                                required={!isLogin} 
                                                autoComplete="name"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</label>
                                    <div className="input-with-icon">
                                        <Mail size={18} className="input-icon" />
                                        <input
                                            type="email"
                                            placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                {!isForgotPassword && (
                                    <div className="form-group">
                                        <label>{isRTL ? 'كلمة المرور' : 'Password'}</label>
                                        <div className="input-with-icon">
                                            <Lock size={18} className="input-icon" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                autoComplete={isLogin ? "current-password" : "new-password"}
                                            />
                                            <button 
                                                type="button" 
                                                className="password-toggle-icon"
                                                onClick={() => setShowPassword(!showPassword)}
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {isLogin && !isForgotPassword && !requires2FA && (
                        <div className="login-options">
                            <label className="remember-me">
                                <input 
                                    type="checkbox" 
                                    checked={rememberMe} 
                                    onChange={(e) => setRememberMe(e.target.checked)} 
                                    disabled={requires2FA}
                                />
                                <span className="checkmark"></span>
                                <span className="remember-text">{isRTL ? 'تذكرني' : 'Remember Me'}</span>
                            </label>
                            <div className="forgot-password">
                                <button type="button" className="text-link" onClick={() => setIsForgotPassword(true)}>
                                    {isRTL ? 'هل نسيت كلمة المرور؟' : 'Forgot Password?'}
                                </button>
                            </div>
                        </div>
                    )}

                    {isForgotPassword && (
                        <div className="forgot-password">
                             <button type="button" className="text-link" onClick={() => setIsForgotPassword(false)}>
                                {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Login'}
                            </button>
                        </div>
                    )}

                    {isForgotPassword && isResetSent ? (
                        <div className="success-message text-center" style={{ margin: '1rem 0', color: '#d4af37' }}>
                            {isRTL ? 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.' : 'Reset link has been sent to your email.'}
                        </div>
                    ) : (
                        <button type="submit" className="btn btn-gold login-btn">
                            <span>
                                {requires2FA ? (
                                    isRTL ? 'التحقق من الرمز' : 'Verify Code'
                                ) : isForgotPassword 
                                    ? (isRTL ? 'إرسال رابط التعيين' : 'Send Reset Link')
                                    : (isRTL
                                        ? (isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب')
                                        : (isLogin ? 'Sign In' : 'Create Account'))}
                            </span>
                            <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
                        </button>
                    )}
                </form>

                <div className="login-divider">
                    <span>{isRTL ? 'أو' : 'OR'}</span>
                </div>

                <button 
                    type="button" 
                    className="google-login-btn"
                    onClick={() => {
                        console.log('Google Login Button Clicked');
                        loginWithGoogle();
                    }}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                    <span>{isRTL ? 'المتابعة باستخدام جوجل' : 'Continue with Google'}</span>
                </button>

                {/* Vendor CTA */}
                <div className="vendor-cta animate-slide-up" style={{ animationDelay: '0.35s' }}>
                    <div className="vendor-cta-inner">
                        <Store size={16} className="vendor-cta-icon" />
                        <span>{isRTL ? 'هل أنت صاحب متجر؟' : 'Are you a shop owner?'}</span>
                    </div>
                    <div className="vendor-cta-links">
                        {user && (user.role === 'vendor' || user.role === 'admin' || user.role === 'regional_admin' || user.role === 'super_admin' || isVendor || user.shop_id) ? (
                            <Link to="/vendor" className="vendor-link vendor-link-highlight">
                                {isRTL ? 'لوحة تحكم البائع' : 'Vendor Dashboard'}
                            </Link>
                        ) : (
                            <>
                                <button 
                                    type="button"
                                    className="vendor-link"
                                    onClick={() => {
                                        setIsLogin(true);
                                        setIsVendorLogin(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                >
                                    {isRTL ? 'تسجيل دخول البائع' : 'Vendor Login'}
                                </button>
                                <span className="vendor-divider">·</span>
                                <Link to="/vendor-signup" className="vendor-link vendor-link-highlight">
                                    {isRTL ? 'سجّل متجرك' : 'Register Your Shop'}
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                <div className="login-footer text-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
                     <p className="copyright">&copy; {new Date().getFullYear()} PerfumeHub Luxury</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
