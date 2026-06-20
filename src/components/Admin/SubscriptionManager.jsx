import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { CreditCard, Plus, Edit, Trash2, CheckCircle, XCircle, DollarSign, Calendar, Zap, ShieldCheck } from 'lucide-react';
import api from '../../utils/api_v1_0_2';

const SubscriptionManager = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        interval: 'month',
        description: '',
        features: []
    });

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
            
            const res = await api[method](url, formData, {
                headers: { 
                    'x-user-id': user.id 
                }
            });

            setShowForm(false);
            setEditingPlan(null);
            setFormData({ name: '', price: '', interval: 'month', description: '', features: [] });
            fetchPlans();
        } catch (error) {
            console.error('Error saving plan:', error);
        }
    };

    if (loading) return <div className="text-center p-4">Loading plans...</div>;

    return (
        <div className="manager-content">
            <div className="manager-header">
                <h2>{isRTL ? 'إدارة الاشتراكات' : 'Subscription Management'}</h2>
                <button className="btn btn-gold" onClick={() => setShowForm(!showForm)}>
                    {showForm ? <XCircle size={18} /> : <Plus size={18} />}
                    {showForm ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'خطة جديدة' : 'New Plan')}
                </button>
            </div>

            {showForm && (
                <div className="admin-card" style={{ marginBottom: '24px', padding: '24px', background: '#1e293b' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">{isRTL ? 'اسم الخطة' : 'Plan Name'}</label>
                                <input type="text" className="form-control" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{isRTL ? 'السعر' : 'Price'}</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>QAR</span>
                                    <input type="number" className="form-control" style={{ paddingLeft: '45px' }} required value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label">{isRTL ? 'الوصف' : 'Description'}</label>
                            <textarea className="form-control" rows="3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                        </div>
                        <button type="submit" className="btn btn-gold">{isRTL ? 'حفظ الخطة' : 'Save Plan'}</button>
                    </form>
                </div>
            )}

            <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {plans.map(plan => (
                    <div key={plan.id} className="admin-card" style={{ padding: '24px', border: '1px solid #334155', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc' }}>{plan.name}</h3>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>{plan.description}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#c8a951' }}>{plan.price} QAR</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>/ {plan.interval}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-outline" style={{ flex: 1, height: '36px' }}>
                                    <Edit size={14} /> {isRTL ? 'تعديل' : 'Edit'}
                                </button>
                                <button className="btn btn-outline" style={{ flex: 1, height: '36px', borderColor: '#ef444433', color: '#ef4444' }}>
                                    <Trash2 size={14} /> {isRTL ? 'حذف' : 'Delete'}
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
        </div>
    );
};

export default SubscriptionManager;
