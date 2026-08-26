import React, { useState, useEffect, useContext } from 'react';
import { PlusCircle, Link, Globe, Edit, Trash2, X, Plus, Search, Store, ShieldCheck, UserMinus, Users } from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api_v1_0_2';
import './RegionsManager.css';

const RegionsManager = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const [regions, setRegions] = useState([]);
    const [users, setUsers] = useState([]);
    const [assignedAdmins, setAssignedAdmins] = useState([]);
    const [searchAdminQuery, setSearchAdminQuery] = useState('');
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

    // Unassign Admin Modal
    const [unassignConfirmModal, setUnassignConfirmModal] = useState({
        isOpen: false,
        adminId: null,
        regionId: null,
        adminName: '',
        regionName: ''
    });

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [activeMobileTab, setActiveMobileTab] = useState('add_region'); // 'add_region' | 'assign_admin'

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (user) {
            fetchRegions();
            fetchUsers();
            fetchAssignedAdmins();
        } else {
            const timer = setTimeout(() => setLoading(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const fetchAssignedAdmins = async () => {
        try {
            const res = await api.get('/regions/assigned-admins', {
                headers: {
                    'x-user-id': user?.id
                }
            });
            setAssignedAdmins(res.data || []);
        } catch (err) {
            console.error('Fetch assigned admins error:', err);
        }
    };

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
            const res = await api.get('/users', {
                headers: {
                    'x-user-id': user?.id
                }
            });
            const allUsers = res.data || [];
            // Filter to only show Vendors and Admins (exclude retail customers)
            const adminAndVendors = allUsers.filter(u => 
                u.role === 'vendor' || 
                u.role === 'admin' || 
                u.role === 'regional_admin'
            );
            setUsers(adminAndVendors);
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
        setActiveMobileTab('add_region');
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
            const res = await api.post('/regions/assign-admin', {
                admin_id: parseInt(assignAdminId) || assignAdminId,
                region_id: parseInt(assignRegionId) || assignRegionId,
                assigned_by: user?.id
            }, {
                headers: { 
                    'x-user-id': user?.id
                }
            });
            
            setSuccessMessage(isRTL ? 'تم تعيين المشرف الإقليمي بنجاح' : (res.data?.message || 'Regional admin assigned successfully'));
            setAssignAdminId('');
            setAssignRegionId('');
            fetchAssignedAdmins();
            fetchUsers();
            fetchRegions();
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || err.message);
        }
    };

    const handleUnassignClick = (adminMapping) => {
        setUnassignConfirmModal({
            isOpen: true,
            adminId: adminMapping.admin_id,
            regionId: adminMapping.region_id,
            adminName: adminMapping.name,
            regionName: adminMapping.region_name
        });
    };

    const confirmUnassign = async () => {
        if (!unassignConfirmModal.adminId || !unassignConfirmModal.regionId) return;
        setError(null);
        setSuccessMessage('');
        try {
            const res = await api.post('/regions/unassign-admin', {
                admin_id: unassignConfirmModal.adminId,
                region_id: unassignConfirmModal.regionId
            }, {
                headers: {
                    'x-user-id': user?.id
                }
            });

            setSuccessMessage(isRTL ? 'تم إلغاء تعيين المشرف الإقليمي بنجاح' : (res.data?.message || 'Regional admin unassigned successfully'));
            fetchAssignedAdmins();
            fetchUsers();
            fetchRegions();
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || err.message);
        } finally {
            setUnassignConfirmModal({ isOpen: false, adminId: null, regionId: null, adminName: '', regionName: '' });
        }
    };

    const filteredAdmins = (assignedAdmins || []).filter(item => {
        if (!searchAdminQuery || !searchAdminQuery.trim()) return true;
        const q = searchAdminQuery.toLowerCase();
        return (
            (item.name || '').toLowerCase().includes(q) ||
            (item.email || '').toLowerCase().includes(q) ||
            (item.region_name || '').toLowerCase().includes(q) ||
            (item.region_code || '').toLowerCase().includes(q)
        );
    });

    if (loading) return <div className="loading-spinner">Loading...</div>;

    return (
        <div className={`manager-content regions-manager ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="manager-header" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
                    <h2 style={{ 
                        margin: 0, 
                        fontSize: isMobile ? '1.15rem' : '1.5rem', 
                        color: '#f8fafc', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        whiteSpace: 'nowrap' 
                    }}>
                        <Globe size={isMobile ? 20 : 24} color="#c8a951" />
                        {isRTL ? 'إدارة المناطق' : 'Regions Management'}
                    </h2>
                    <span style={{ 
                        background: 'rgba(200, 169, 81, 0.15)', 
                        border: '1px solid rgba(200, 169, 81, 0.3)', 
                        color: '#c8a951', 
                        padding: '3px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
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

            {/* Mobile Tab Switcher */}
            {isMobile && (
                <div style={{
                    display: 'flex',
                    background: '#0f172a',
                    padding: '4px',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    marginBottom: '14px',
                    gap: '6px'
                }}>
                    <button
                        type="button"
                        onClick={() => setActiveMobileTab('add_region')}
                        style={{
                            flex: 1,
                            padding: '7px 10px',
                            borderRadius: '7px',
                            border: 'none',
                            fontSize: '0.82rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: activeMobileTab === 'add_region' ? 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)' : 'transparent',
                            color: activeMobileTab === 'add_region' ? '#000000' : '#cbd5e1',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <PlusCircle size={14} />
                        {editingRegionId ? (isRTL ? 'تعديل المنطقة' : 'Edit Region') : (isRTL ? 'إضافة منطقة' : 'Add Region')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveMobileTab('assign_admin')}
                        style={{
                            flex: 1,
                            padding: '7px 10px',
                            borderRadius: '7px',
                            border: 'none',
                            fontSize: '0.82rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: activeMobileTab === 'assign_admin' ? 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)' : 'transparent',
                            color: activeMobileTab === 'assign_admin' ? '#000000' : '#cbd5e1',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <Link size={14} />
                        {isRTL ? 'تخصيص مشرف' : 'Assign Admin'}
                    </button>
                </div>
            )}

            <div className="grid-layout" style={{ display: isMobile ? 'block' : 'grid', width: '100%', boxSizing: 'border-box' }}>
                {/* Add New Region */}
                {(!isMobile || activeMobileTab === 'add_region') && (
                    <div className="card" style={{ position: 'relative', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: isMobile ? '14px 16px' : '20px', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: isMobile ? '0.95rem' : '1.05rem', color: '#f8fafc' }}>
                            {editingRegionId 
                                ? (isRTL ? 'تعديل المنطقة' : 'Edit Region') 
                                : (isRTL ? 'إضافة منطقة جديدة' : 'Add New Region')
                            }
                        </h3>
                        {editingRegionId && (
                            <button onClick={cancelEdit} className="admin-action-btn" style={{ position: 'absolute', top: '12px', right: isRTL ? 'auto' : '12px', left: isRTL ? '12px' : 'auto' }}>
                                <X size={16} />
                            </button>
                        )}
                        <form onSubmit={handleCreateRegion} className="region-form" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '12px', width: '100%', boxSizing: 'border-box' }}>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>{isRTL ? 'اسم المنطقة' : 'Region Name'}</label>
                                <input 
                                    type="text"
                                    className="form-control"
                                    value={newRegionName}
                                    onChange={(e) => setNewRegionName(e.target.value)}
                                    placeholder="e.g. United Arab Emirates"
                                    required 
                                    style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: isMobile ? '7px 10px' : '10px 14px', borderRadius: '8px', fontSize: isMobile ? '0.84rem' : '0.9rem', height: isMobile ? '38px' : 'auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                                />
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                                    <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>{isRTL ? 'رمز المنطقة' : 'Region Code'}</label>
                                    <input 
                                        type="text"
                                        className="form-control"
                                        value={newRegionCode}
                                        onChange={(e) => setNewRegionCode(e.target.value.toUpperCase())}
                                        placeholder="AE"
                                        maxLength={3}
                                        required 
                                        style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: isMobile ? '7px 10px' : '10px 14px', borderRadius: '8px', fontSize: isMobile ? '0.84rem' : '0.9rem', height: isMobile ? '38px' : 'auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                                    <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>{isRTL ? 'العملة' : 'Currency'}</label>
                                    <input 
                                        type="text"
                                        className="form-control"
                                        value={newCurrencyCode}
                                        onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                                        placeholder="AED"
                                        maxLength={4}
                                        required 
                                        style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: isMobile ? '7px 10px' : '10px 14px', borderRadius: '8px', fontSize: isMobile ? '0.84rem' : '0.9rem', height: isMobile ? '38px' : 'auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-gold" style={{ marginTop: '4px', width: '100%', height: isMobile ? '38px' : '44px', borderRadius: '8px', fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                {editingRegionId ? <Edit size={15} /> : <PlusCircle size={15} />}
                                {editingRegionId 
                                    ? (isRTL ? 'تحديث المنطقة' : 'Update Region') 
                                    : (isRTL ? 'إضافة جغرافية' : 'Create Region')
                                }
                            </button>
                        </form>
                    </div>
                )}

                {/* Assign Admin to Region */}
                {(!isMobile || activeMobileTab === 'assign_admin') && (
                    <div className="card" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: isMobile ? '14px 16px' : '20px', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: isMobile ? '0.95rem' : '1.05rem', color: '#f8fafc' }}>{isRTL ? 'تخصيص مشرف إقليمي' : 'Assign Regional Admin'}</h3>
                        <form onSubmit={handleAssignAdmin} className="region-form" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '12px', width: '100%', boxSizing: 'border-box' }}>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>{isRTL ? 'اختر المشرف' : 'Select Admin/Vendor'}</label>
                                <select 
                                    className="form-control"
                                    value={assignAdminId}
                                    onChange={(e) => setAssignAdminId(e.target.value)}
                                    required
                                    style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: isMobile ? '7px 10px' : '10px 14px', borderRadius: '8px', fontSize: isMobile ? '0.84rem' : '0.9rem', height: isMobile ? '38px' : 'auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                                >
                                    <option value="">{isRTL ? '-- اختر --' : '-- Select User --'}</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.role}) - {u.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>{isRTL ? 'المنطقة' : 'Select Region'}</label>
                                <select 
                                    className="form-control"
                                    value={assignRegionId}
                                    onChange={(e) => setAssignRegionId(e.target.value)}
                                    required
                                    style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: isMobile ? '7px 10px' : '10px 14px', borderRadius: '8px', fontSize: isMobile ? '0.84rem' : '0.9rem', height: isMobile ? '38px' : 'auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                                >
                                    <option value="">{isRTL ? '-- اختر --' : '-- Select --'}</option>
                                    {regions.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-gold" style={{ marginTop: '4px', width: '100%', height: isMobile ? '38px' : '44px', borderRadius: '8px', fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Link size={15} />
                                {isRTL ? 'ربط المشرف' : 'Assign to Region'}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Regional Admins Listing */}
            <div className="card full-width mt-4" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: isMobile ? '16px' : '24px', marginTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={20} color="#c8a951" />
                            {isRTL ? 'المشرفون الإقليميون والمتاجر التابعة' : 'Assigned Regional Admins & Jurisdictions'}
                        </h3>
                        <span style={{ 
                            background: 'rgba(200, 169, 81, 0.15)', 
                            border: '1px solid rgba(200, 169, 81, 0.3)', 
                            color: '#c8a951', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            fontSize: '0.75rem', 
                            fontWeight: '700' 
                        }}>
                            {assignedAdmins.length} {isRTL ? 'مشرفين' : 'Admins'}
                        </span>
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative', width: isMobile ? '100%' : '320px' }}>
                        <Search size={16} style={{ 
                            position: 'absolute', 
                            left: isRTL ? 'auto' : '12px', 
                            right: isRTL ? '12px' : 'auto', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            color: '#94a3b8',
                            pointerEvents: 'none'
                        }} />
                        <input
                            type="text"
                            value={searchAdminQuery}
                            onChange={(e) => setSearchAdminQuery(e.target.value)}
                            placeholder={isRTL ? 'ابحث بالاسم، البريد أو المنطقة...' : 'Search by name, email, region...'}
                            style={{
                                width: '100%',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#f8fafc',
                                padding: isRTL ? '8px 36px 8px 12px' : '8px 12px 8px 36px',
                                fontSize: '0.88rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>

                {filteredAdmins.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 20px', background: '#0f172a', borderRadius: '12px', border: '1px dashed #334155', color: '#94a3b8' }}>
                        <Users size={32} color="#64748b" style={{ margin: '0 auto 10px', display: 'block' }} />
                        <p style={{ margin: 0, fontWeight: '600', color: '#cbd5e1' }}>
                            {searchAdminQuery 
                                ? (isRTL ? 'لا يوجد مشرفين إقليميين يطابقون بحثك' : 'No regional admins found matching your search.')
                                : (isRTL ? 'لا يوجد مشرفين إقليميين معينين حالياً' : 'No regional admins currently assigned.')}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                            {isRTL ? 'يمكنك تعيين مشرف لمنطقة باستخدام النموذج أعلاه' : 'Use the form above to assign an administrator to a country/region.'}
                        </p>
                    </div>
                ) : isMobile ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {filteredAdmins.map(item => (
                            <div key={item.id} style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <strong style={{ color: '#f8fafc', fontSize: '1rem' }}>{item.name}</strong>
                                            <span style={{ background: 'linear-gradient(135deg, #c8a951, #ebb637)', color: '#000', fontSize: '0.68rem', fontWeight: '800', padding: '1px 6px', borderRadius: '4px' }}>RA</span>
                                        </div>
                                        <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>{item.email}</span>
                                    </div>
                                    <button
                                        onClick={() => handleUnassignClick(item)}
                                        title={isRTL ? 'إلغاء التعيين' : 'Unassign'}
                                        style={{ width: '34px', height: '34px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.45)', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid rgba(51, 65, 85, 0.6)' }}>
                                    <span className="badge code" style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                                        {item.region_name} ({item.region_code})
                                    </span>
                                    <span style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '5px', 
                                        background: item.vendor_count > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)', 
                                        border: `1px solid ${item.vendor_count > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
                                        color: item.vendor_count > 0 ? '#4ade80' : '#94a3b8', 
                                        padding: '3px 8px', 
                                        borderRadius: '6px', 
                                        fontSize: '0.75rem', 
                                        fontWeight: '700' 
                                    }}>
                                        <Store size={12} />
                                        {item.vendor_count} {isRTL ? 'متاجر' : (item.vendor_count === 1 ? 'Vendor' : 'Vendors')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                        <table className="admin-table" style={{ width: '100%', minWidth: '700px' }}>
                            <thead>
                                <tr>
                                    <th>{isRTL ? 'المشرف الإقليمي' : 'Regional Admin'}</th>
                                    <th>{isRTL ? 'المنطقة المعينة' : 'Assigned Region'}</th>
                                    <th>{isRTL ? 'المتاجر التابعة للمنطقة' : 'Vendors in Region'}</th>
                                    <th>{isRTL ? 'تاريخ التعيين' : 'Assigned Date'}</th>
                                    <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAdmins.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{item.name}</strong>
                                                    <span style={{ background: 'linear-gradient(135deg, #c8a951, #ebb637)', color: '#000', fontSize: '0.68rem', fontWeight: '800', padding: '1px 6px', borderRadius: '4px' }}>RA</span>
                                                </div>
                                                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{item.email}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: '#f8fafc', fontWeight: '600' }}>{item.region_name}</span>
                                                <span className="badge code" style={{ padding: '2px 6px', fontSize: '0.72rem' }}>{item.region_code}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                gap: '6px', 
                                                background: item.vendor_count > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)', 
                                                border: `1px solid ${item.vendor_count > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
                                                color: item.vendor_count > 0 ? '#4ade80' : '#94a3b8', 
                                                padding: '4px 10px', 
                                                borderRadius: '6px', 
                                                fontSize: '0.8rem', 
                                                fontWeight: '700' 
                                            }}>
                                                <Store size={14} />
                                                {item.vendor_count} {isRTL ? 'متاجر' : (item.vendor_count === 1 ? 'Vendor' : 'Vendors')}
                                            </span>
                                        </td>
                                        <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                            {item.assigned_at ? new Date(item.assigned_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td>
                                            <button 
                                                className="admin-action-btn delete-btn" 
                                                onClick={() => handleUnassignClick(item)} 
                                                title={isRTL ? 'إلغاء تعيين المشرف' : 'Unassign Regional Admin'}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', height: 'auto', fontSize: '0.8rem', borderRadius: '6px' }}
                                            >
                                                <Trash2 size={14} />
                                                <span>{isRTL ? 'فك الارتباط' : 'Unassign'}</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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

            {/* Region Delete Confirmation Modal */}
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

            {/* Unassign Regional Admin Confirmation Modal */}
            <ConfirmModal
                isOpen={unassignConfirmModal.isOpen}
                onClose={() => setUnassignConfirmModal({ ...unassignConfirmModal, isOpen: false })}
                onConfirm={confirmUnassign}
                title={isRTL ? 'إلغاء تعيين المشرف الإقليمي' : 'UNASSIGN REGIONAL ADMIN'}
                message={isRTL 
                    ? `هل أنت متأكد أنك تريد إلغاء تعيين "${unassignConfirmModal.adminName}" من منطقة "${unassignConfirmModal.regionName}"؟` 
                    : `Are you sure you want to unassign "${unassignConfirmModal.adminName}" from region "${unassignConfirmModal.regionName}"?`
                }
                confirmText={isRTL ? 'فك الارتباط' : 'UNASSIGN'}
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
