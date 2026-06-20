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

    useEffect(() => {
        if (user) {
            fetchRegions();
            fetchUsers();
        } else {
            // If after 1s user is still not there, stop loading to show "Login" or "Unauthorized" 
            // if we had that logic, otherwise just clear loading so error banner shows.
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
        <div className={`admin-section regions-manager ${isRTL ? 'rtl' : 'ltr'}`}>
            <h2 className="section-title">
                <Globe size={24} className="icon" /> 
                {isRTL ? 'إدارة المناطق (المشرف العام)' : 'Global Regions Management'}
            </h2>

            {error && <div className="error-banner">{error}</div>}
            {successMessage && <div className="success-banner">{successMessage}</div>}

            <div className="grid-layout">
                {/* Add New Region */}
                <div className="card" style={{ position: 'relative' }}>
                        <h3>
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
                    <form onSubmit={handleCreateRegion} className="region-form" style={{ position: 'relative' }}>
                        <div className="form-group">
                            <label>{isRTL ? 'اسم المنطقة' : 'Region Name'}</label>
                            <input 
                                type="text"
                                value={newRegionName}
                                onChange={(e) => setNewRegionName(e.target.value)}
                                placeholder="e.g. United Arab Emirates"
                                required 
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>{isRTL ? 'رمز المنطقة' : 'Region Code'}</label>
                                <input 
                                    type="text"
                                    value={newRegionCode}
                                    onChange={(e) => setNewRegionCode(e.target.value.toUpperCase())}
                                    placeholder="AE"
                                    maxLength={3}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'العملة' : 'Currency'}</label>
                                <input 
                                    type="text"
                                    value={newCurrencyCode}
                                    onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                                    placeholder="AED"
                                    maxLength={4}
                                    required 
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-gold" style={{ marginTop: '8px', width: '100%', height: '48px', borderRadius: '8px', fontSize: '1rem' }}>
                            {editingRegionId ? <Edit size={18} /> : <PlusCircle size={18} />}
                            {editingRegionId 
                                ? (isRTL ? 'تحديث المنطقة' : 'Update Region') 
                                : (isRTL ? 'إضافة جغرافية' : 'Create Region')
                            }
                        </button>
                    </form>
                </div>

                {/* Assign Admin to Region */}
                <div className="card">
                    <h3>{isRTL ? 'تخصيص مشرف إقليمي' : 'Assign Regional Admin'}</h3>
                    <form onSubmit={handleAssignAdmin} className="region-form">
                        <div className="form-group">
                            <label>{isRTL ? 'اختر المشرف' : 'Select Admin/Vendor'}</label>
                            <select 
                                value={assignAdminId}
                                onChange={(e) => setAssignAdminId(e.target.value)}
                                required
                            >
                                <option value="">{isRTL ? '-- اختر --' : '-- Select User --'}</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.role}) - {u.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{isRTL ? 'المنطقة' : 'Select Region'}</label>
                            <select 
                                value={assignRegionId}
                                onChange={(e) => setAssignRegionId(e.target.value)}
                                required
                            >
                                <option value="">{isRTL ? '-- اختر --' : '-- Select --'}</option>
                                {regions.map(r => (
                                    <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="btn btn-gold" style={{ marginTop: '8px', width: '100%', height: '48px', borderRadius: '8px', fontSize: '1rem' }}>
                            <Link size={18} />
                            {isRTL ? 'ربط المشرف' : 'Assign to Region'}
                        </button>
                    </form>
                </div>
            </div>

            {/* List Regions */}
            <div className="card full-width mt-4">
                <h3>{isRTL ? 'المناطق النشطة' : 'Active Regions'}</h3>
                {regions.length === 0 ? (
                    <p className="no-data">{isRTL ? 'لا توجد مناطق' : 'No regions found.'}</p>
                ) : (
                    <div className="table-responsive">
                        <table className="admin-table">
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
