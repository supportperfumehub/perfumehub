import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ShopContext } from '../../context/ShopContext';
import { CreditCard, Plus, Edit, Trash2, CheckCircle, XCircle, DollarSign, Calendar, Zap, ShieldCheck } from 'lucide-react';
import api from '../../utils/api_v1_0_2';
import ConfirmModal from '../Common/ConfirmModal';

const SubscriptionManager = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const { showToast } = useContext(ShopContext);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [featuresText, setFeaturesText] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        interval: 'month',
        description: '',
        features: [],
        is_active: true
    });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        planId: null,
        planName: ''
    });

    const handleToggleForm = () => {
        if (showForm) {
            setShowForm(false);
            setEditingPlan(null);
            setFormData({
                name: '',
                price: '',
                interval: 'month',
                description: '',
                features: [],
                is_active: true
            });
            setFeaturesText('');
        } else {
            setShowForm(true);
        }
    };

    const handleEdit = (plan) => {
        console.log('[DEBUG] handleEdit clicked for plan:', plan);
        setEditingPlan(plan);
        setFormData({
            name: plan.name || '',
            price: plan.price || '',
            interval: plan.interval || 'month',
            description: plan.description || '',
            features: plan.features || [],
            is_active: plan.is_active !== false
        });
        setFeaturesText(Array.isArray(plan.features) ? plan.features.join('\n') : '');
        setShowForm(true);
    };

    const handleDeleteClick = (plan) => {
        console.log('[DEBUG] handleDeleteClick for plan:', plan);
        setConfirmModal({
            isOpen: true,
            planId: plan.id,
            planName: plan.name
        });
    };

    const handleConfirmDelete = async () => {
        const { planId } = confirmModal;
        console.log('[DEBUG] handleConfirmDelete for planId:', planId);
        if (!user?.id) {
            console.warn('[DEBUG] handleConfirmDelete aborted: user.id is missing', user);
            return;
        }
        try {
            await api.delete(`/subscriptions/plans/${planId}`, {
                headers: { 'x-user-id': user.id }
            });
            setConfirmModal({ isOpen: false, planId: null, planName: '' });
            showToast(isRTL ? 'تم حذف الخطة بنجاح' : 'Plan deleted successfully', 'success');
            fetchPlans();
        } catch (error) {
            console.error('Error deleting plan:', error);
            showToast(isRTL ? 'حدث خطأ أثناء حذف الخطة' : 'Error deleting plan', 'error');
        }
    };

    const fetchPlans = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const res = await api.get('/subscriptions/plans', {
                headers: { 'x-user-id': user.id }
            });
            setPlans(res.data || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchPlans();
        }
    }, [user?.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user?.id) return;
        try {
            const method = editingPlan ? 'put' : 'post';
            const url = editingPlan ? `/subscriptions/plans/${editingPlan.id}` : '/subscriptions/plans';
            
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                features: featuresText.split('\n').map(f => f.trim()).filter(Boolean)
            };

            await api[method](url, payload, {
                headers: { 
                    'x-user-id': user.id 
                }
            });

            showToast(editingPlan 
                ? (isRTL ? 'تم تحديث الخطة بنجاح' : 'Plan updated successfully')
                : (isRTL ? 'تم حفظ الخطة بنجاح' : 'Plan saved successfully'),
                'success'
            );

            setShowForm(false);
            setEditingPlan(null);
            setFormData({ name: '', price: '', interval: 'month', description: '', features: [], is_active: true });
            setFeaturesText('');
            fetchPlans();
        } catch (error) {
            console.error('Error saving plan:', error);
            showToast(isRTL ? 'حدث خطأ أثناء حفظ الخطة' : 'Error saving plan', 'error');
        }
    };

    if (loading) return <div className="text-center p-4">Loading plans...</div>;

    return (
        <div className="manager-content">
            <div className="manager-header">
                <h2>{isRTL ? 'إدارة الاشتراكات' : 'Subscription Management'}</h2>
                <button className="btn btn-gold" onClick={handleToggleForm}>
                    {showForm ? <XCircle size={18} /> : <Plus size={18} />}
                    {showForm ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'خطة جديدة' : 'New Plan')}
                </button>
            </div>

            {showForm && (
                <div className="admin-card" style={{ marginBottom: '24px', padding: '24px', background: '#1e293b' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">{isRTL ? 'اسم الخطة' : 'Plan Name'}</label>
                                <input type="text" className="form-control" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{isRTL ? 'السعر' : 'Price'}</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>QAR</span>
                                    <input type="number" step="0.01" className="form-control" style={{ paddingLeft: '45px' }} required value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{isRTL ? 'الفترة' : 'Billing Interval'}</label>
                                <select className="form-control" value={formData.interval} onChange={(e) => setFormData({...formData, interval: e.target.value})}>
                                    <option value="month">{isRTL ? 'شهرياً' : 'Monthly'}</option>
                                    <option value="year">{isRTL ? 'سنوياً' : 'Yearly'}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{isRTL ? 'الحالة' : 'Status'}</label>
                                <select className="form-control" value={formData.is_active ? 'active' : 'inactive'} onChange={(e) => setFormData({...formData, is_active: e.target.value === 'active'})}>
                                    <option value="active">{isRTL ? 'نشط' : 'Active'}</option>
                                    <option value="inactive">{isRTL ? 'غير نشط' : 'Inactive'}</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">{isRTL ? 'الوصف' : 'Description'}</label>
                                <textarea className="form-control" rows="4" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{isRTL ? 'المميزات (واحدة في كل سطر)' : 'Features (one per line)'}</label>
                                <textarea className="form-control" rows="4" placeholder={isRTL ? "مثال:\nدعم متميز\nمساحة غير محدودة" : "Example:\nPremium Support\nUnlimited Space"} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn btn-gold">
                                {editingPlan ? (isRTL ? 'تحديث الخطة' : 'Update Plan') : (isRTL ? 'حفظ الخطة' : 'Save Plan')}
                            </button>
                            {editingPlan && (
                                <button type="button" className="btn btn-outline" onClick={handleToggleForm}>
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {plans.map(plan => (
                    <div key={plan.id} className="admin-card" style={{ padding: '24px', border: '1px solid #334155', position: 'relative', opacity: plan.is_active === false ? 0.6 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc' }}>{plan.name}</h3>
                                    {plan.is_active === false && (
                                        <span style={{ fontSize: '0.7rem', background: '#ef444422', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ef444444' }}>
                                            {isRTL ? 'غير نشط' : 'Inactive'}
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>{plan.description}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#c8a951' }}>{plan.price} QAR</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>/ {isRTL ? (plan.interval === 'year' ? 'سنة' : 'شهر') : plan.interval}</div>
                            </div>
                        </div>

                        {plan.features && plan.features.length > 0 && (
                            <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                                            <CheckCircle size={14} style={{ color: '#c8a951', flexShrink: 0 }} />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    onClick={() => handleEdit(plan)}
                                    style={{
                                        flex: 1,
                                        height: '38px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(200, 169, 81, 0.45)',
                                        background: 'rgba(200, 169, 81, 0.12)',
                                        color: '#f8fafc',
                                        fontWeight: '700',
                                        fontSize: '0.82rem',
                                        letterSpacing: '0.5px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(200, 169, 81, 0.25)';
                                        e.currentTarget.style.borderColor = '#c8a951';
                                        e.currentTarget.style.color = '#ffffff';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(200, 169, 81, 0.12)';
                                        e.currentTarget.style.borderColor = 'rgba(200, 169, 81, 0.45)';
                                        e.currentTarget.style.color = '#f8fafc';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <Edit size={14} color="#c8a951" /> {isRTL ? 'تعديل' : 'EDIT'}
                                </button>
                                <button 
                                    onClick={() => handleDeleteClick(plan)}
                                    style={{
                                        flex: 1,
                                        height: '38px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(239, 68, 68, 0.45)',
                                        background: 'rgba(239, 68, 68, 0.12)',
                                        color: '#fca5a5',
                                        fontWeight: '700',
                                        fontSize: '0.82rem',
                                        letterSpacing: '0.5px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.15)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                                        e.currentTarget.style.borderColor = '#ef4444';
                                        e.currentTarget.style.color = '#ffffff';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)';
                                        e.currentTarget.style.color = '#fca5a5';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <Trash2 size={14} color="#f87171" /> {isRTL ? 'حذف' : 'DELETE'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {plans.length === 0 && !showForm && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '2px dashed #334155' }}>
                        <CreditCard size={48} color="#334155" style={{ marginBottom: '16px' }} />
                        <h3 style={{ color: '#94a3b8' }}>{isRTL ? 'لا توجد خطط اشتراك حالياً' : 'No subscription plans yet'}</h3>
                        <p style={{ color: '#64748b' }}>{isRTL ? 'ابدأ بإضافة خطة لتوليد دخل متكرر' : 'Start by adding a plan to generate recurring revenue'}</p>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title={isRTL ? 'حذف خطة الاشتراك' : 'Delete Subscription Plan'}
                message={
                    isRTL 
                        ? `هل أنت متأكد من حذف الخطة "${confirmModal.planName}"؟ لا يمكن التراجع عن هذا الإجراء.`
                        : `Are you sure you want to delete the plan "${confirmModal.planName}"? This action cannot be undone.`
                }
                confirmText={isRTL ? 'حذف' : 'Delete'}
                cancelText={isRTL ? 'إلغاء' : 'Cancel'}
                isRTL={isRTL}
                variant="danger"
                iconType="trash"
            />
        </div>
    );
};

export default SubscriptionManager;
