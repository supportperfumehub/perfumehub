import React, { useState, useEffect } from 'react';
import { 
    DollarSign, CheckCircle, Clock, Download, RefreshCw, 
    Building2, ShieldCheck, ArrowUpRight, AlertCircle, Copy, 
    Check, Filter, Search, FileSpreadsheet
} from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';
import api from '../../utils/api_v1_0_2';
import './PayoutsManager.css';

const PayoutsManager = ({ isRTL }) => {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedIban, setCopiedIban] = useState(null);
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    // Confirm Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        payoutId: null,
        shopName: '',
        amount: 0
    });

    const fetchPayouts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/payouts');
            const data = Array.isArray(res.data) ? res.data : [];
            setPayouts(data);
        } catch (err) {
            console.error('Failed to fetch payouts:', err);
            setFeedback({
                message: isRTL ? 'فشل تحميل بيانات مستحقات البائعين' : 'Failed to load vendor payouts',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayouts();
    }, []);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedIban(id);
        setTimeout(() => setCopiedIban(null), 2000);
    };

    const handleApprove = async () => {
        if (!confirmModal.payoutId) return;
        try {
            setActionLoading(true);
            await api.post(`/admin/payouts/${confirmModal.payoutId}/approve`);
            setFeedback({
                message: isRTL ? 'تم تأكيد وصرف المستحقات للبوتيك بنجاح!' : 'Payout cleared and approved successfully!',
                type: 'success'
            });
            setConfirmModal({ isOpen: false, payoutId: null, shopName: '', amount: 0 });
            await fetchPayouts();
        } catch (err) {
            console.error('Error approving payout:', err);
            setFeedback({
                message: err.response?.data?.error || (isRTL ? 'حدث خطأ أثناء تأكيد الصرف' : 'Error approving payout'),
                type: 'error'
            });
        } finally {
            setActionLoading(false);
            setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
        }
    };

    const handleExportCSV = async () => {
        try {
            const res = await api.get('/admin/payouts/export-reconciliation', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `perfumehub_vendor_reconciliation_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error('Failed to export reconciliation CSV:', err);
        }
    };

    // Metrics
    const totalRequested = payouts.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalDisbursed = payouts
        .filter(p => p.status === 'completed' || p.status === 'approved')
        .reduce((acc, p) => acc + (Number(p.net_amount || p.amount) || 0), 0);
    const totalCommission = payouts
        .filter(p => p.status === 'completed' || p.status === 'approved')
        .reduce((acc, p) => acc + (Number(p.platform_commission || p.amount * 0.1) || 0), 0);
    const pendingCount = payouts.filter(p => (p.status || 'pending').toLowerCase() === 'pending').length;

    // Filtered list
    const filteredPayouts = payouts.filter(p => {
        const matchesStatus = filterStatus === 'all' || (p.status || 'pending').toLowerCase() === filterStatus;
        const matchesSearch = !searchTerm || 
            (p.shop_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.iban || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className={`manager-content payouts-manager ${isRTL ? 'rtl' : 'ltr'}`}>
            {/* Header & Controls */}
            <div className="manager-header">
                <div>
                    <h2>{isRTL ? 'إدارة المستحقات والتحويلات المالية للبائعين' : 'Vendor Settlements & Payouts Command'}</h2>
                    <p>{isRTL ? 'مراجعة طلبات سحب الأرباح واعتماد التحويلات البنكية للبوتيكات الشريكة' : 'Authorize boutique balance withdrawals, inspect IBANs, and generate GCC bank settlement files.'}</p>
                </div>
                <div className="manager-actions">
                    <button className="btn btn-outline" onClick={fetchPayouts} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        {isRTL ? 'تحديث' : 'Refresh'}
                    </button>
                    <button className="btn btn-gold" onClick={handleExportCSV}>
                        <FileSpreadsheet size={16} />
                        {isRTL ? 'تصدير كشف البنك (CSV)' : 'Export Bank CSV'}
                    </button>
                </div>
            </div>

            {/* Feedback Alert */}
            {feedback.message && (
                <div className={`payouts-alert ${feedback.type === 'success' ? 'success' : 'error'}`}>
                    {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* KPI Summary Cards */}
            <div className="payouts-kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon pending-icon"><Clock size={22} /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">{isRTL ? 'طلبات قيد الانتظار' : 'Pending Requests'}</span>
                        <h3 className="kpi-value">{pendingCount}</h3>
                        <span className="kpi-subtext">{isRTL ? 'بانتظار التحويل والمطابقة' : 'Awaiting manual clearance'}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon disbursed-icon"><CheckCircle size={22} /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">{isRTL ? 'إجمالي المبالغ المحولة' : 'Total Disbursed'}</span>
                        <h3 className="kpi-value">{Math.round(totalDisbursed).toLocaleString()} QAR</h3>
                        <span className="kpi-subtext">{isRTL ? 'صافي أرباح البوتيكات' : 'Paid out to partners'}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon commission-icon"><DollarSign size={22} /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">{isRTL ? 'عمولة المنصة المحصلة (10%)' : 'Platform Revenue (10%)'}</span>
                        <h3 className="kpi-value">{Math.round(totalCommission).toLocaleString()} QAR</h3>
                        <span className="kpi-subtext">{isRTL ? 'إيرادات بيرفيوم هوب' : 'Net platform commission'}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon total-icon"><Building2 size={22} /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">{isRTL ? 'إجمالي المبيعات المطلوبة' : 'Gross Sales Requested'}</span>
                        <h3 className="kpi-value">{Math.round(totalRequested).toLocaleString()} QAR</h3>
                        <span className="kpi-subtext">{isRTL ? 'شامل الرسوم البنكية' : 'All-time volume processed'}</span>
                    </div>
                </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="payouts-toolbar">
                <div className="search-box">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder={isRTL ? 'بحث باسم البوتيك أو رقم الآيبان...' : 'Search by boutique, IBAN, or reference...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <Filter size={16} />
                    <button 
                        className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                    >
                        {isRTL ? 'الكل' : 'All'} ({payouts.length})
                    </button>
                    <button 
                        className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('pending')}
                    >
                        {isRTL ? 'قيد الانتظار' : 'Pending'} ({pendingCount})
                    </button>
                    <button 
                        className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('completed')}
                    >
                        {isRTL ? 'مكتمل' : 'Completed'} ({payouts.length - pendingCount})
                    </button>
                </div>
            </div>

            {/* Payouts Table */}
            <div className="table-responsive payouts-table-wrapper">
                {loading ? (
                    <div className="payouts-loading">
                        <RefreshCw size={28} className="spin" />
                        <p>{isRTL ? 'جاري تحميل سجل المستحقات...' : 'Loading settlement records...'}</p>
                    </div>
                ) : filteredPayouts.length === 0 ? (
                    <div className="payouts-empty">
                        <DollarSign size={48} />
                        <h4>{isRTL ? 'لا توجد طلبات سحب مطابقة' : 'No payout requests match your criteria'}</h4>
                        <p>{isRTL ? 'ستظهر هنا كافة طلبات السحب المقدمة من البوتيكات الشريكة.' : 'Boutique balance withdrawal requests will appear here.'}</p>
                    </div>
                ) : (
                    <table className="admin-table payouts-table">
                        <thead>
                            <tr>
                                <th>{isRTL ? 'البوتيك الشريك' : 'Boutique'}</th>
                                <th>{isRTL ? 'الحساب البنكي (IBAN)' : 'Bank Details & IBAN'}</th>
                                <th>{isRTL ? 'المبلغ الإجمالي' : 'Gross'}</th>
                                <th>{isRTL ? 'عمولة المنصة' : 'Platform Fee (10%)'}</th>
                                <th>{isRTL ? 'الصافي للبوتيك' : 'Net Payout'}</th>
                                <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                <th style={{ textAlign: 'center' }}>{isRTL ? 'الإجراء' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayouts.map(p => {
                                const isPending = (p.status || 'pending').toLowerCase() === 'pending';
                                const gross = Number(p.amount) || 0;
                                const fee = Number(p.platform_commission || gross * 0.1);
                                const net = Number(p.net_amount || (gross - fee));

                                return (
                                    <tr key={p.id} className={isPending ? 'row-pending' : ''}>
                                        <td>
                                            <div className="boutique-cell">
                                                <span className="boutique-name">{p.shop_name || 'Flagship Boutique'}</span>
                                                <span className="payout-ref">{p.id}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="bank-cell">
                                                <span className="bank-name">{p.bank_name || 'QNB (Qatar National Bank)'}</span>
                                                <div className="iban-row">
                                                    <code>{p.iban || 'QA98QNBA000000001234567890123'}</code>
                                                    <button 
                                                        type="button" 
                                                        className="copy-btn" 
                                                        onClick={() => handleCopy(p.iban || 'QA98QNBA000000001234567890123', p.id)}
                                                        title="Copy IBAN"
                                                    >
                                                        {copiedIban === p.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                                                    </button>
                                                </div>
                                                {p.swift_code && <span className="swift-tag">SWIFT: {p.swift_code}</span>}
                                            </div>
                                        </td>
                                        <td><strong>{Math.round(gross).toLocaleString()} QAR</strong></td>
                                        <td className="text-gold">-{Math.round(fee).toLocaleString()} QAR</td>
                                        <td><strong className="text-success">{Math.round(net).toLocaleString()} QAR</strong></td>
                                        <td>
                                            <span className={`status-badge ${p.status || 'pending'}`}>
                                                {isPending 
                                                    ? (isRTL ? 'بانتظار الصرف' : 'Pending') 
                                                    : (isRTL ? 'تم الصرف بنجاح' : 'Completed')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="date-text">
                                                {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Today'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {isPending ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-gold"
                                                    onClick={() => setConfirmModal({
                                                        isOpen: true,
                                                        payoutId: p.id,
                                                        shopName: p.shop_name || 'Boutique',
                                                        amount: net
                                                    })}
                                                >
                                                    <CheckCircle size={14} />
                                                    {isRTL ? 'اعتماد وصرف' : 'Clear & Pay'}
                                                </button>
                                            ) : (
                                                <span className="cleared-indicator">
                                                    <ShieldCheck size={15} />
                                                    {isRTL ? 'معتمد' : 'Settled'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Approval Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={isRTL ? 'تأكيد صرف مستحقات البوتيك' : 'Confirm Vendor Payout Clearance'}
                message={isRTL
                    ? `هل تؤكد تحويل صافي المبلغ بقيمة ${Math.round(confirmModal.amount)} ر.ق إلى بوتيك (${confirmModal.shopName})؟ سيتم تسجيل العملية في سجل التدقيق غير القابل للتعديل.`
                    : `Authorize net payout disbursement of ${Math.round(confirmModal.amount)} QAR to "${confirmModal.shopName}"? This settlement will be permanently committed to the immutable platform audit ledger.`}
                confirmText={actionLoading ? (isRTL ? 'جاري الصرف...' : 'Clearing...') : (isRTL ? 'تأكيد وصرف الآن' : 'Authorize Disbursement')}
                cancelText={isRTL ? 'إلغاء' : 'Cancel'}
                onConfirm={handleApprove}
                onCancel={() => setConfirmModal({ isOpen: false, payoutId: null, shopName: '', amount: 0 })}
            />
        </div>
    );
};

export default PayoutsManager;
