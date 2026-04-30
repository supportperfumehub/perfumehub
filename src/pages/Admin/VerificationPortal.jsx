import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Scan, CheckCircle, AlertCircle, ShoppingBag, User, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import api from '../../utils/api_v1_0_2';

const VerificationPortal = () => {
    const { isRTL } = useOutletContext();
    const { user } = useContext(AuthContext);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [reservation, setReservation] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleVerify = async (e) => {
        if (e) e.preventDefault();
        if (!code) return;

        setLoading(true);
        setError('');
        setReservation(null);
        setSuccess('');

        try {
            const res = await api.post('/reservations/verify', { code });
            setReservation(res.data.reservation);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!reservation || !user?.id) return;
        setVerifying(true);
        try {
            await api.post(`/reservations/${reservation.id}/complete`);
            setSuccess(isRTL ? 'تم تأكيد الاستلام بنجاح!' : 'Pickup verified & completed!');
            setReservation(null);
            setCode('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to complete pickup');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '500px', padding: '100px 20px' }}>
            <div className="admin-card" style={{ padding: '30px', textAlign: 'center', background: '#1e293b' }}>
                <div style={{ background: 'rgba(200, 169, 81, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <Scan size={32} color="#c8a951" />
                </div>
                
                <h1 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{isRTL ? 'تحقق من الحجز' : 'Verify Reservation'}</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '30px' }}>
                    {isRTL ? 'أدخل الرمز المكون من 6 أرقام والموجود في بريد العميل' : 'Enter the 6-digit code from the customer\'s confirmation email.'}
                </p>

                <form onSubmit={handleVerify}>
                    <input 
                        type="text" 
                        className="form-control" 
                        placeholder="000000"
                        maxLength="6"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        style={{ fontSize: '2rem', textAlign: 'center', letterSpacing: '8px', fontWeight: '800', height: '80px', marginBottom: '20px', background: '#0f172a' }}
                    />
                    <button type="submit" className="btn btn-gold" style={{ width: '100%', height: '56px' }} disabled={loading || code.length < 6}>
                        {loading ? <RefreshCw className="spin" /> : (isRTL ? 'تحقق الآن' : 'Verify Now')}
                    </button>
                </form>

                {error && (
                    <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                {success && (
                    <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle size={18} /> {success}
                    </div>
                )}

                {reservation && (
                    <div className="animate-fade-in" style={{ marginTop: '30px', textAlign: isRTL ? 'right' : 'left', borderTop: '1px solid #334155', paddingTop: '30px' }}>
                        <h3 style={{ fontSize: '1rem', color: '#c8a951', marginBottom: '15px' }}>{isRTL ? 'تم العثور على الحجز' : 'Reservation Found'}</h3>
                        
                        <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
                                <div style={{ background: '#334155', padding: '8px', borderRadius: '50%', height: 'fit-content' }}><User size={16} /></div>
                                <div>
                                    <div style={{ fontWeight: '700' }}>{reservation.customers?.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{reservation.customers?.email}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ background: '#334155', padding: '8px', borderRadius: '50%', height: 'fit-content' }}><ShoppingBag size={16} /></div>
                                <div>
                                    <div style={{ fontWeight: '700' }}>{reservation.quantity}x {reservation.products?.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#c8a951' }}>{reservation.products?.price} QAR</div>
                                </div>
                            </div>
                        </div>

                        <button className="btn btn-gold" onClick={handleComplete} style={{ width: '100%', height: '56px' }} disabled={verifying}>
                            {verifying ? <RefreshCw className="spin" /> : (isRTL ? 'تأكيد الاستلام' : 'Confirm & Complete Pickup')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerificationPortal;
