import React, { useContext, useState } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { RefreshCw, Trash2, ShieldAlert, Clock, Tag, Package, Search } from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';

const ArchiveManager = ({ isRTL }) => {
    const { backups, restoreItem, permanentlyDeleteBackup } = useContext(ShopContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTable, setFilterTable] = useState('all');
    const [confirmAction, setConfirmAction] = useState({
        isOpen: false,
        type: '', // 'restore' or 'delete'
        item: null
    });
    const [anchoredPositionStyles, setAnchoredPositionStyles] = useState({});

    const filteredBackups = backups.filter(item => {
        const matchesSearch = item.data?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             item.data?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             item.table_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTable = filterTable === 'all' || item.table_name === filterTable;
        return matchesSearch && matchesTable;
    });

    const handleActionClick = (e, type, item) => {
        setConfirmAction({
            isOpen: true,
            type,
            item
        });
    };

    const handleConfirm = async () => {
        if (!confirmAction.item) return;

        if (confirmAction.type === 'restore') {
            await restoreItem(confirmAction.item.id);
        } else if (confirmAction.type === 'delete') {
            await permanentlyDeleteBackup(confirmAction.item.id);
        }

        setConfirmAction({ isOpen: false, type: '', item: null });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString(isRTL ? 'ar-QA' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="manager-content animate-fade-in">
            <div className="manager-header">
                <div>
                    <h2>{isRTL ? 'قسم الاسترداد' : 'Recovery Section'}</h2>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '4px' }}>
                        {isRTL ? 'استعد البيانات المحذوفة أو احذفها نهائياً.' : 'Restore deleted data or delete it permanently.'}
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div className="admin-search-container" style={{ maxWidth: '250px' }}>
                        <input
                            type="text"
                            placeholder={isRTL ? 'بحث في الأرشيف...' : 'Search archive...'}
                            className="form-control admin-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="admin-search-icon">
                            <Search size={18} />
                        </div>
                    </div>

                    <select 
                        className="form-control" 
                        style={{ width: 'auto', minWidth: '150px' }}
                        value={filterTable}
                        onChange={(e) => setFilterTable(e.target.value)}
                    >
                        <option value="all">{isRTL ? 'الكل' : 'All Types'}</option>
                        <option value="products">{isRTL ? 'المنتجات' : 'Products'}</option>
                        <option value="coupons">{isRTL ? 'الكوبونات' : 'Coupons'}</option>
                    </select>
                </div>
            </div>

            <div className="table-responsive">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{isRTL ? 'النوع' : 'Type'}</th>
                            <th>{isRTL ? 'العنصر' : 'Item'}</th>
                            <th>{isRTL ? 'تاريخ الحذف' : 'Deleted At'}</th>
                            <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBackups.map(item => (
                            <tr key={item.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {item.table_name === 'products' ? (
                                            <Package size={16} color="#c8a951" />
                                        ) : (
                                            <Tag size={16} color="#4caf50" />
                                        )}
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                            {item.table_name === 'products' ? (isRTL ? 'منتج' : 'Product') : (isRTL ? 'كوبون' : 'Coupon')}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                                        {item.table_name === 'products' ? item.data?.name : item.data?.code}
                                    </div>
                                    <small style={{ color: '#94a3b8' }}>ID: {item.record_id}</small>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                        <Clock size={14} color="#94a3b8" />
                                        {formatDate(item.deleted_at)}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            className="admin-action-btn edit-btn" 
                                            onClick={(e) => handleActionClick(e, 'restore', item)}
                                            style={{ color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.2)' }}
                                            title={isRTL ? 'استعادة' : 'Restore'}
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                        <button 
                                            className="admin-action-btn delete-btn" 
                                            onClick={(e) => handleActionClick(e, 'delete', item)}
                                            title={isRTL ? 'حذف نهائي' : 'Delete Permanently'}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredBackups.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                                    <ShieldAlert size={48} style={{ marginBottom: '10px', opacity: 0.2 }} />
                                    <p>{isRTL ? 'لا توجد عناصر في الاسترداد' : 'No items found in recovery'}</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={confirmAction.isOpen}
                onClose={() => setConfirmAction({ isOpen: false, type: '', item: null })}
                onConfirm={handleConfirm}
                title={confirmAction.type === 'restore' 
                    ? (isRTL ? 'تأكيد الاستعادة' : 'RESTORE FROM ARCHIVE') 
                    : (isRTL ? 'تأكيد الحذف النهائي' : 'PERMANENT INVENTORY REMOVAL')}
                message={confirmAction.type === 'restore'
                    ? (isRTL 
                        ? `هل أنت متأكد أنك تريد استعادة "${confirmAction.item?.table_name === 'products' ? confirmAction.item?.data?.name : confirmAction.item?.data?.code}"؟` 
                        : `This action will securely reintegrate "${confirmAction.item?.table_name === 'products' ? confirmAction.item?.data?.name : confirmAction.item?.data?.code}" into your active boutique collection.`)
                    : (isRTL 
                        ? `تحذير: هذا الإجراء سيقوم بحذف "${confirmAction.item?.table_name === 'products' ? confirmAction.item?.data?.name : confirmAction.item?.data?.code}" نهائياً من قاعدة البيانات.` 
                        : `This operation is irreversible. "${confirmAction.item?.table_name === 'products' ? confirmAction.item?.data?.name : confirmAction.item?.data?.code}" will be permanently purged from the system.`)}
                confirmText={confirmAction.type === 'restore' ? (isRTL ? 'استعادة' : 'RESTORE NOW') : (isRTL ? 'حذف نهائياً' : 'PURGE NOW')}
                cancelText={isRTL ? 'إلغاء' : 'CANCEL'}
                isRTL={isRTL}
                variant={confirmAction.type === 'restore' ? 'primary' : 'danger'}
                isPremium={true}
                iconType={confirmAction.type === 'restore' ? 'restore' : 'trash'}
            />
        </div>
    );
};

export default ArchiveManager;
