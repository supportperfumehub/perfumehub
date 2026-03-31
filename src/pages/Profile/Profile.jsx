import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import { User, Mail, Phone, MapPin, Package, Clock, CheckCircle, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
    const { t } = useTranslation();
    const { isRTL } = useOutletContext();
    const { orders } = useContext(ShopContext);
    const { user } = useContext(AuthContext);

    // Profile data from user object
    const profileData = {
        name: user?.name || t('profile.customer'),
        email: user?.email || '',
        phone: user?.phone || t('profile.not_provided'),
        address: user?.address || t('profile.not_provided')
    };

    // Filter orders to only show those for this user based on email
    const userOrders = orders.filter(o => o.email === user?.email).reverse();

    return (
        <div className="profile-page">
            <div className="profile-header text-center">
                <div className="container">
                    <h1>{t('profile.title')}</h1>
                    <p className="profile-subtitle">
                        {t('profile.subtitle')}
                    </p>
                </div>
            </div>

            <div className="container section profile-container">
                <div className="profile-sidebar">
                    <div className="profile-card">
                        <div className="profile-avatar text-center">
                            <div className="avatar-circle">
                                <User size={40} color="var(--color-gold)" />
                            </div>
                            <h3>{profileData.name}</h3>
                            <p className="text-muted">{t('profile.premium_member')}</p>
                        </div>

                        <div className="profile-details">
                            <div className="detail-item">
                                <Mail size={18} />
                                <span>{profileData.email}</span>
                            </div>
                            <div className="detail-item">
                                <Phone size={18} />
                                <span>{profileData.phone}</span>
                            </div>
                            <div className="detail-item">
                                <MapPin size={18} />
                                <span>{profileData.address}</span>
                            </div>
                        </div>
                        
                        {user && user.role === 'customer' && (
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <hr style={{ borderTop: '1px solid #eee', marginBottom: '20px' }} />
                                <Link to="/vendor-signup" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                                    <Store size={18} />
                                    {isRTL ? 'كن بائعاً معنا' : 'Become a Vendor'}
                                </Link>
                                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '10px' }}>
                                    {isRTL ? 'ابدأ ببيع منتجاتك الخاصة' : 'Start selling your own products'}
                                </p>
                            </div>
                        )}
                        {user && (user.role === 'vendor' || user.role === 'admin') && (
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <hr style={{ borderTop: '1px solid #eee', marginBottom: '20px' }} />
                                <Link to={user.role === 'admin' ? '/admin' : '/vendor'} className="btn btn-gold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                                    <Store size={18} />
                                    {isRTL ? 'لوحة تحكم البائع' : 'Go to Dashboard'}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className="profile-content">
                    <h2 className="section-title">
                        {t('profile.order_history')}
                    </h2>

                    {userOrders.length > 0 ? (
                        <div className="orders-list">
                            {userOrders.map(order => (
                                <div key={order.id} className="order-card">
                                    <div className="order-header">
                                        <div className="order-id">
                                            <Package size={18} className="gold-icon" />
                                            <span>{order.id}</span>
                                        </div>
                                        <div className={`order-status status-${order.status.toLowerCase()}`}>
                                            {order.status === 'Pending' && <Clock size={16} />}
                                            {order.status === 'Shipped' && <CheckCircle size={16} />}
                                            <span>
                                                {order.status === 'Shipped' ? t('profile.status_shipped') : t('profile.status_pending')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="order-body">
                                        <div className="order-date">
                                            <strong>{t('profile.date')}</strong> {order.date}
                                        </div>
                                        <div className="order-items">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="order-item-line">
                                                    <span>{item.quantity}x {item.name}</span>
                                                    <span>{item.price} {t('common.currency')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="order-footer">
                                        <strong>{t('profile.total')}</strong>
                                        <span className="order-total">{order.total} {t('common.currency')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-orders text-center">
                            <Package size={48} color="var(--color-gray)" />
                            <p>{t('profile.no_orders')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
