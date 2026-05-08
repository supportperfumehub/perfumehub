import React, { useState, useContext } from 'react';
import { useOutletContext, Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Store, Eye, EyeOff } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ShopContext } from '../../context/ShopContext';
import './Login.css';

const Login = () => {
    const { isRTL } = useOutletContext();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [isResetSent, setIsResetSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const { user, login, register, forgotPassword, loginWithGoogle } = useContext(AuthContext);
    const { showToast } = useContext(ShopContext);
    const navigate = useNavigate();
    const location = useLocation();

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setIsForgotPassword(false);
        setError('');
        setIsResetSent(false);
    };

    // Load remembered email on mount
    React.useEffect(() => {
        const savedEmail = localStorage.getItem('remembered_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (isForgotPassword) {
            const result = await forgotPassword(email);
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
            const result = await login(email, password);
            if (result.success) {
                showToast(isRTL ? "تم تسجيل الدخول بنجاح!" : "Login successful!", 'success');
                const role = result.user?.role;
                
                // Handle Remember Me
                if (rememberMe) {
                    localStorage.setItem('remembered_email', email);
                } else {
                    localStorage.removeItem('remembered_email');
                }

                const origin = location.state?.from?.pathname
                    || (role === 'admin' ? '/admin' : role === 'vendor' ? '/vendor' : '/');
                navigate(origin);
            } else {
                setError(result.message);
                showToast(result.message, 'error');
            }
        } else {
            const nameInput = e.target.querySelector('input[placeholder*="name"]');
            const name = nameInput ? nameInput.value : '';
            
            const result = await register(name, email, password);
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
                            ? (isLogin ? 'سجل الدخول للمتابعة إلى حسابك' : 'ابدأ رحلتك في عالم العطور الفاخرة')
                            : (isLogin ? 'Sign in to your premium account' : 'Discover a world of luxury fragrances')}
                    </p>
                </div>

                <form className="login-form animate-slide-up" style={{ animationDelay: '0.2s' }} onSubmit={handleSubmit}>
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-content">
                        {!isLogin && !isForgotPassword && (
                            <div className="form-group slide-down">
                                <label>{isRTL ? 'الاسم الكامل' : 'Full Name'}</label>
                                <div className="input-with-icon">
                                    <User size={18} className="input-icon" />
                                    <input 
                                        type="text" 
                                        placeholder={isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name'} 
                                        required={!isLogin} 
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
                    </div>

                    {isLogin && !isForgotPassword && (
                        <div className="login-options">
                            <label className="remember-me">
                                <input 
                                    type="checkbox" 
                                    checked={rememberMe} 
                                    onChange={(e) => setRememberMe(e.target.checked)} 
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
                                {isForgotPassword 
                                    ? (isRTL ? 'إرسال رابط التعيين' : 'Send Reset Link')
                                    : (isRTL
                                        ? (isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب')
                                        : (isLogin ? 'Sign In' : 'Create Account'))}
                            </span>
                            <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
                        </button>
                    )}
                </form>
                {!isForgotPassword && (
                    <>
                        <div className="login-separator">
                            <span>{isRTL ? 'أو' : 'or'}</span>
                        </div>

                        <button 
                            type="button" 
                            className="btn btn-outline google-login-btn"
                            onClick={() => loginWithGoogle()}
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18" />
                            <span>{isRTL ? 'متابعة باستخدام جوجل' : 'Continue with Google'}</span>
                        </button>
                    </>
                )}
                {/* Vendor CTA */}
                <div className="vendor-cta animate-slide-up" style={{ animationDelay: '0.35s' }}>
                    <div className="vendor-cta-inner">
                        <Store size={16} className="vendor-cta-icon" />
                        <span>{isRTL ? 'هل أنت صاحب متجر؟' : 'Are you a shop owner?'}</span>
                    </div>
                    <div className="vendor-cta-links">
                        {user && (user.role === 'vendor' || user.role === 'admin') ? (
                            <Link to="/vendor" className="vendor-link vendor-link-highlight">
                                {isRTL ? 'لوحة التحكم' : 'Vendor Dashboard'}
                            </Link>
                        ) : (
                            <>
                                <Link to="/vendor-signup" className="vendor-link">
                                    {isRTL ? 'تسجيل دخول البائع' : 'Vendor Login'}
                                </Link>
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
