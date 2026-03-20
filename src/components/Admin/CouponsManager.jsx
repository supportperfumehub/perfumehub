import React, { useState, useContext } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';

const CouponsManager = ({ isRTL }) => {
    const { coupons, addCoupon, updateCoupon, deleteCoupon } = useContext(ShopContext);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ 
        isOpen: false, 
        couponId: null, 
        couponCode: '' 
    });

    const initialFormState = {
        code: '',
        discountType: 'percentage',
        discountValue: '',
        expiryDate: '',
        isActive: true,
        usageLimit: 100
    };

    const [formData, setFormData] = useState(initialFormState);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const couponData = {
            ...formData,
            code: formData.code.toUpperCase(),
            discountValue: Number(formData.discountValue),
            usageCount: editingId ? formData.usageCount : 0
        };

        if (editingId) {
            updateCoupon(editingId, couponData);
        } else {
            addCoupon(couponData);
        }

        setFormData(initialFormState);
        setShowForm(false);
        setEditingId(null);
    };

    const handleEdit = (coupon) => {
        setFormData(coupon);
        setEditingId(coupon.id);
        setShowForm(true);
    };

    const handleDelete = (id, code) => {
        setConfirmModal({
            isOpen: true,
            couponId: id,
            couponCode: code
        });
    };

    const confirmDelete = () => {
        if (confirmModal.couponId) {
            deleteCoupon(confirmModal.couponId);
            setConfirmModal({ isOpen: false, couponId: null, couponCode: '' });
        }
    };

    const cancelEdit = () => {
        setFormData(initialFormState);
        setShowForm(false);
        setEditingId(null);
    };

    return (
        <div className="manager-content animate-fade-in">
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>{isRTL ? 'إدارة الكوبونات' : 'Coupons Management'}</h2>
                {!showForm && (
                    <button className="btn btn-gold" onClick={() => setShowForm(true)}>
                        <Plus size={18} style={{ margin: isRTL ? '0 0 0 8px' : '0 8px 0 0', display: 'inline-block', verticalAlign: 'middle' }} />
                        {isRTL ? 'إضافة كوبون جديد' : 'Add New Coupon'}
                    </button>
                )}
            </div>

            {showForm && (
                <div className="admin-form animate-fade-in" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3>{editingId ? (isRTL ? 'تعديل الكوبون' : 'Edit Coupon') : (isRTL ? 'إضافة كوبون' : 'Add Coupon')}</h3>
                        <button onClick={cancelEdit} className="admin-action-btn"><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>{isRTL ? 'رمز الكوبون' : 'Coupon Code'}</label>
                                <input type="text" name="code" className="form-control" value={formData.code} onChange={handleInputChange} required style={{ textTransform: 'uppercase' }} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</label>
                                <input type="date" name="expiryDate" className="form-control" value={formData.expiryDate} onChange={handleInputChange} required />
                            </div>
                        </div>

                        <div className="form-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '15px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>{isRTL ? 'نوع الخصم' : 'Discount Type'}</label>
                                <select name="discountType" className="form-control" value={formData.discountType} onChange={handleInputChange}>
                                    <option value="percentage">{isRTL ? 'نسبة مئوية (%)' : 'Percentage (%)'}</option>
                                    <option value="fixed">{isRTL ? 'مبلغ ثابت' : 'Fixed Amount'}</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>{isRTL ? 'قيمة الخصم' : 'Discount Value'}</label>
                                <input type="number" name="discountValue" className="form-control" value={formData.discountValue} onChange={handleInputChange} required min="1" max={formData.discountType === 'percentage' ? "100" : undefined} />
                            </div>
                        </div>

                        <div className="form-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '15px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>{isRTL ? 'حد الاستخدام' : 'Usage Limit'}</label>
                                <input type="number" name="usageLimit" className="form-control" value={formData.usageLimit} onChange={handleInputChange} min="1" />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, marginTop: '25px' }}>
                                <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleInputChange} />
                                <label htmlFor="isActive" style={{ marginBottom: 0 }}>{isRTL ? 'نشط؟' : 'Is Active?'}</label>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-gold" style={{ marginTop: '20px' }}>
                            {editingId ? (isRTL ? 'حفظ التغييرات' : 'Save Changes') : (isRTL ? 'إضافة الكوبون' : 'Add Coupon')}
                        </button>
                    </form>
                </div>
            )}

            <div className="table-responsive">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{isRTL ? 'الرمز' : 'Code'}</th>
                            <th>{isRTL ? 'النوع' : 'Type'}</th>
                            <th>{isRTL ? 'القيمة' : 'Value'}</th>
                            <th>{isRTL ? 'تاريخ الانتهاء' : 'Expiry'}</th>
                            <th>{isRTL ? 'الاستخدام' : 'Usage'}</th>
                            <th>{isRTL ? 'الحالة' : 'Status'}</th>
                            <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coupons.map(coupon => (
                            <tr key={coupon.id}>
                                <td><strong>{coupon.code}</strong></td>
                                <td>{coupon.discountType === 'percentage' ? (isRTL ? 'نسبة' : 'Percentage') : (isRTL ? 'ثابت' : 'Fixed')}</td>
                                <td>{coupon.discountValue}{coupon.discountType === 'percentage' ? '%' : (isRTL ? ' ر.ق' : ' QAR')}</td>
                                <td>{coupon.expiryDate}</td>
                                <td>
                                    <span style={{
                                        color: (coupon.usageCount >= coupon.usageLimit) ? '#ff3333' : 'inherit',
                                        fontWeight: (coupon.usageCount >= coupon.usageLimit) ? 'bold' : 'normal'
                                    }}>
                                        {coupon.usageCount || 0} / {coupon.usageLimit || '∞'}
                                    </span>
                                </td>
                                <td>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.85em',
                                        fontWeight: 'bold',
                                        backgroundColor: (coupon.isActive && (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit)) ? '#e6ffed' : '#ffe6e6',
                                        color: (coupon.isActive && (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit)) ? '#00b33c' : '#ff3333'
                                    }}>
                                        {coupon.isActive
                                            ? (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit
                                                ? (isRTL ? 'مكتمل' : 'Limit Reached')
                                                : (isRTL ? 'نشط' : 'Active'))
                                            : (isRTL ? 'غير نشط' : 'Inactive')}
                                    </span>
                                </td>
                                <td>
                                    <button className="admin-action-btn edit-btn" onClick={() => handleEdit(coupon)} title={isRTL ? 'تعديل' : 'Edit'} style={{ background: 'none', border: 'none', cursor: 'pointer', margin: '0 5px', color: '#666' }}>
                                        <Edit size={18} />
                                    </button>
                                    <button className="admin-action-btn delete-btn" onClick={() => handleDelete(coupon.id, coupon.code)} title={isRTL ? 'حذف' : 'Delete'} style={{ background: 'none', border: 'none', cursor: 'pointer', margin: '0 5px', color: '#ff3333' }}>
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmDelete}
                title={isRTL ? 'أرشفة الرمز الترويجي' : 'ARCHIVE PROMO CODE'}
                message={isRTL 
                    ? `هل أنت متأكد أنك تريد أرشفة الكوبون "${confirmModal.couponCode}"؟ سيتم تعطيله فوراً.` 
                    : `This will safely remove "${confirmModal.couponCode}" from active use. You can restore this promo code later from the Recovery section.`
                }
                confirmText={isRTL ? 'تعطيل الرمز' : 'DEACTIVATE CODE'}
                cancelText={isRTL ? 'إلغاء' : 'CANCEL'}
                isRTL={isRTL}
                variant="danger"
                isPremium={true}
                iconType="archive"
            />
        </div>
    );
};

export default CouponsManager;
