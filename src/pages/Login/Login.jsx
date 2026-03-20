import React, { useState, useContext } from 'react';
import { useOutletContext, Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ShopContext } from '../../context/ShopContext';
import './Login.css';

const Login = () => {
    const { isRTL } = useOutletContext();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const { login, register } = useContext(AuthContext);
    const { showToast } = useContext(ShopContext);
    const navigate = useNavigate();
    const location = useLocation();

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (isLogin) {
            const result = await login(email, password);
            if (result.success) {
                showToast(isRTL ? "تم تسجيل الدخول بنجاح!" : "Login successful!", 'success');
                const origin = location.state?.from?.pathname || (email === 'admin@perfumehub.com' ? '/admin' : '/');
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
                        {!isLogin && (
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

                        <div className="form-group">
                            <label>{isRTL ? 'كلمة المرور' : 'Password'}</label>
                            <div className="input-with-icon">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {isLogin && (
                        <div className="forgot-password">
                            <a href="#">{isRTL ? 'هل نسيت كلمة المرور؟' : 'Forgot Password?'}</a>
                        </div>
                    )}

                    <button type="submit" className="btn btn-gold login-btn">
                        <span>
                            {isRTL
                                ? (isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب')
                                : (isLogin ? 'Sign In' : 'Create Account')}
                        </span>
                        <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
                    </button>
                </form>

                <div className="login-footer text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
                     <p className="copyright">&copy; {new Date().getFullYear()} PerfumeHub Luxury</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
