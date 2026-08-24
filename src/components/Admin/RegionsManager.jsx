import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PlusCircle, Link, Globe, Edit, Trash2, X, Plus } from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';
import api from '../../utils/api_v1_0_2';
import './RegionsManager.css';

const RegionsManager = ({ isRTL }) => {
    const { user } = useOutletContext();
    const [regions, setRegions] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // New Region Form
    const [newRegionName, setNewRegionName] = useState('');
    const [newRegionCode, setNewRegionCode] = useState('');
    const [newCurrencyCode, setNewCurrencyCode] = useState('');

    // Assign Admin Form
    const [assignAdminId, setAssignAdminId] = useState('');
    const [assignRegionId, setAssignRegionId] = useState('');

    // Edit/Delete State
    const [editingRegionId, setEditingRegionId] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ 
        isOpen: false, 
        regionId: null, 
        regionName: '' 
    });

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (user) {
            fetchRegions();
            fetchUsers();
        } else {
            const timer = setTimeout(() => setLoading(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const fetchRegions = async () => {
        try {
            const res = await api.get('/regions', {
                headers: {
                    'x-user-id': user?.id
                }
            });
            setRegions(res.data || []);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users?role=vendor', {
                headers: {
                    'x-user-id': user?.id
                }
            });
            setUsers(res.data || []);
        } catch (err) {
            console.error('Fetch users error:', err);
        }
    };

    const handleCreateRegion = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');
        try {
            const url = editingRegionId ? `/regions/${editingRegionId}` : '/regions';
            const method = editingRegionId ? 'put' : 'post';

            const res = await api[method](url, {
                name: newRegionName,
                code: newRegionCode,
                currencyCode: newCurrencyCode
            }, {
                headers: { 
                    'x-user-id': user?.id
                }
            });
            
            setSuccessMessage(editingRegionId 
                ? (isRTL ? 'تم تحديث المنطقة بنجاح' : 'Region updated successfully')
                : (isRTL ? 'تم إنشاء المنطقة بنجاح' : 'Region created successfully')
            );
            
            setNewRegionName('');
            setNewRegionCode('');
            setNewCurrencyCode('');
            setEditingRegionId(null);
            fetchRegions();
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        }
    };

    const handleEdit = (region) => {
        setNewRegionName(region.name);
        setNewRegionCode(region.code);
        setNewCurrencyCode(region.currency_code);
        setEditingRegionId(region.id);
        setSuccessMessage('');
        setError('');
        window.scrollTo(0, 0);
    };

    const cancelEdit = () => {
        setNewRegionName('');
        setNewRegionCode('');
        setNewCurrencyCode('');
        setEditingRegionId(null);
    };

    const handleDelete = (id, name) => {
        setConfirmModal({
            isOpen: true,
            regionId: id,
            regionName: name
        });
    };

    const confirmDelete = async () => {
        if (!confirmModal.regionId) return;
        
        setError(null);
        setSuccessMessage('');
        try {
            await api.delete(`/regions/${confirmModal.regionId}`, {
                headers: {
                    'x-user-id': user?.id
                }
            });
            
            setSuccessMessage(isRTL ? 'تم حذف المنطقة' : 'Region deleted successfully');
            fetchRegions();
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setConfirmModal({ isOpen: false, regionId: null, regionName: '' });
        }
    };

    const handleAssignAdmin = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');
        try {
            await api.post('/regions/assign-admin', {
                admin_id: parseInt(assignAdminId),
                region_id: parseInt(assignRegionId),
                assigned_by: user?.id
            }, {
                headers: { 
                    'x-user-id': user?.id
                }
            });
            
            setSuccessMessage(isRTL ? 'تم تعيين المشرف بنجاح' : 'Admin assigned successfully');
            setAssignAdminId('');
            setAssignRegionId('');
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        }
    };

    if (loading) return <div className="loading-spinner">Loading...</div>;

    return (
        <div className={`manager-content regions-manager ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="manager-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
                    <h2 style={{ 
                        margin: 0, 
                        fontSize: isMobile ? '1.2rem' : '1.5rem', 
                        color: '#f8fafc', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        whiteSpace: 'nowrap' 
                    }}>
                        <Globe size={isMobile ? 22 : 24} color="#c8a951" />
                        {isRTL ? 'إدارة المناطق' : 'Regions Management'}
                    </h2>
                    <span style={{ 
                        background: 'rgba(200, 169, 81, 0.15)', 
                        border: '1px solid rgba(200, 169, 81, 0.3)', 
                        color: '#c8a951', 
                        padding: '3px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.78rem', 
                        fontWeight: '700',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}>
                        {regions.length} {isRTL ? 'مناطق' : 'Regions'}
                    </span>
                </div>
            </div>

            {error && <div className="error-banner">{error}</div>}
            {successMessage && <div className="success-banner">{successMessage}</div>}

            <div className="grid-layout">
                {/* Add New Region */}
                <div className="card" style={{ position: 'relative', background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: isMobile ? '16px' : '24px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: '#f8fafc' }}>
                        {editingRegionId 
                            ? (isRTL ? 'تعديل المنطقة' : 'Edit Region') 
                            : (isRTL ? 'إضافة منطقة جديدة' : 'Add New Region')
                        }
                    </h3>
                    {editingRegionId && (
                        <button onClick={cancelEdit} className="admin-action-btn" style={{ position: 'absolute', top: '15px', right: isRTL ? 'auto' : '15px', left: isRTL ? '15px' : 'auto' }}>
                            <X size={18} />
                        </button>
                    )}
                    <form onSubmit={handleCreateRegion} className="region-form" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600' }}>{isRTL ? 'اسم المنطقة' : 'Region Name'}</label>
                            <input 
                                type="text"
                                className="form-control"
                                value={newRegionName}
                                onChange={(e) => setNewRegionName(e.target.value)}
                                placeholder="e.g. United Arab Emirates"
                                required 
                                style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem' }}
                            />
                        </div>
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600' }}>{isRTL ? 'رمز المنطقة' : 'Region Code'}</label>
                                <input 
                                    type="text"
                                    className="form-control"
                                    value={newRegionCode}
                                    onChange={(e) => setNewRegionCode(e.target.value.toUpperCase())}
                                    placeholder="AE"
                                    maxLength={3}
                                    required 
                                    style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem' }}
                                />
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600' }}>{isRTL ? 'العملة' : 'Currency'}</label>
                                <input 
                                    type="text"
                                    className="form-control"
                                    value={newCurrencyCode}
                                    onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                                    placeholder="AED"
                                    maxLength={4}
                                    required 
                                    style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem' }}
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-gold" style={{ marginTop: '8px', width: '100%', height: '44px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            {editingRegionId ? <Edit size={16} /> : <PlusCircle size={16} />}
                            {editingRegionId 
                                ? (isRTL ? 'تحديث المنطقة' : 'Update Region') 
                                : (isRTL ? 'إضافة جغرافية' : 'Create Region')
                            }
                        </button>
                    </form>
                </div>

                {/* Assign Admin to Region */}
                <div className="card" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: isMobile ? '16px' : '24px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: '#f8fafc' }}>{isRTL ? 'تخصيص مشرف إقليمي' : 'Assign Regional Admin'}</h3>
                    <form onSubmit={handleAssignAdmin} className="region-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600' }}>{isRTL ? 'اختر المشرف' : 'Select Admin/Vendor'}</label>
                            <select 
                                className="form-control"
                                value={assignAdminId}
                                onChange={(e) => setAssignAdminId(e.target.value)}
                                required
                                style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem' }}
                            >
                                <option value="">{isRTL ? '-- اختر --' : '-- Select User --'}</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.role}) - {u.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600' }}>{isRTL ? 'المنطقة' : 'Select Region'}</label>
                            <select 
                                className="form-control"
                                value={assignRegionId}
                                onChange={(e) => setAssignRegionId(e.target.value)}
                                required
                                style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem' }}
                            >
                                <option value="">{isRTL ? '-- اختر --' : '-- Select --'}</option>
                                {regions.map(r => (
                                    <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="btn btn-gold" style={{ marginTop: '8px', width: '100%', height: '44px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Link size={16} />
                            {isRTL ? 'ربط المشرف' : 'Assign to Region'}
                        </button>
                    </form>
                </div>
            </div>

            {/* List Regions */}
            <div className="card full-width mt-4" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: isMobile ? '16px' : '24px', marginTop: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#f8fafc' }}>{isRTL ? 'المناطق النشطة' : 'Active Regions'}</h3>
                {regions.length === 0 ? (
                    <p className="no-data" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>{isRTL ? 'لا توجد مناطق' : 'No regions found.'}</p>
                ) : isMobile ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {regions.map(region => (
                            <div key={region.id} style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>#{region.id}</span>
                                        <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{region.name}</strong>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => handleEdit(region)} 
                                            title={isRTL ? 'تعديل' : 'Edit'}
                                            style={{ width: '34px', height: '34px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.45)', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(region.id, region.name)} 
                                            title={isRTL ? 'حذف' : 'Delete'}
                                            style={{ width: '34px', height: '34px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.45)', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(51, 65, 85, 0.6)' }}>
                                    <span className="badge code" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>{isRTL ? 'الرمز:' : 'Code:'} {region.code}</span>
                                    <span className="badge currency" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>{isRTL ? 'العملة:' : 'Currency:'} {region.currency_code}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                        <table className="admin-table" style={{ width: '100%', minWidth: '600px' }}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>{isRTL ? 'المنطقة' : 'Region'}</th>
                                    <th>{isRTL ? 'الرمز' : 'Code'}</th>
                                    <th>{isRTL ? 'العملة' : 'Currency'}</th>
                                    <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {regions.map(region => (
                                    <tr key={region.id}>
                                        <td>#{region.id}</td>
                                        <td>{region.name}</td>
                                        <td><span className="badge code">{region.code}</span></td>
                                        <td><span className="badge currency">{region.currency_code}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className="admin-action-btn edit-btn" onClick={() => handleEdit(region)} title={isRTL ? 'تعديل' : 'Edit'}>
                                                    <Edit size={18} />
                                                </button>
                                                <button className="admin-action-btn delete-btn" onClick={() => handleDelete(region.id, region.name)} title={isRTL ? 'حذف' : 'Delete'}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmDelete}
                title={isRTL ? 'حذف المنطقة' : 'DELETE REGION'}
                message={isRTL 
                    ? `هل أنت متأكد أنك تريد حذف المنطقة "${confirmModal.regionName}"؟ هذا الإجراء قد يفشل إذا كان هناك محلات مرتبطة بها.` 
                    : `Are you sure you want to permanently delete the region "${confirmModal.regionName}"? This action may fail if there are shops or admins assigned to it.`
                }
                confirmText={isRTL ? 'حذف نهائياً' : 'PERMANENTLY DELETE'}
                cancelText={isRTL ? 'إلغاء' : 'CANCEL'}
                isRTL={isRTL}
                variant="danger"
                isPremium={true}
                iconType="trash"
            />
        </div>
    );
};

export default RegionsManager;
