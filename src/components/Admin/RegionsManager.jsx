import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PlusCircle, Link, Globe } from 'lucide-react';
import './RegionsManager.css';

const RegionsManager = ({ isRTL }) => {
    const { user } = useOutletContext();
    const [regions, setRegions] = useState([]);
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

    useEffect(() => {
        fetchRegions();
    }, []);

    const fetchRegions = async () => {
        try {
            const res = await fetch('/api/regions');
            if (!res.ok) throw new Error('Failed to fetch regions');
            const data = await res.json();
            setRegions(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRegion = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');
        try {
            const res = await fetch('/api/regions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newRegionName,
                    code: newRegionCode,
                    currencyCode: newCurrencyCode
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create region');
            
            setSuccessMessage(isRTL ? 'تم إنشاء المنطقة بنجاح' : 'Region created successfully');
            setNewRegionName('');
            setNewRegionCode('');
            setNewCurrencyCode('');
            fetchRegions();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAssignAdmin = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');
        try {
            const res = await fetch('/api/admins/assign-region', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_id: parseInt(assignAdminId),
                    region_id: parseInt(assignRegionId),
                    assigned_by: user.id
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to assign admin');
            
            setSuccessMessage(isRTL ? 'تم تعيين المشرف بنجاح' : 'Admin assigned successfully');
            setAssignAdminId('');
            setAssignRegionId('');
        } catch (err) {
            setError(err.message);
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
                <div className="card">
                    <h3>{isRTL ? 'إضافة منطقة جديدة' : 'Add New Region'}</h3>
                    <form onSubmit={handleCreateRegion} className="region-form">
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
                        <button type="submit" className="primary-btn">
                            <PlusCircle size={18} />
                            {isRTL ? 'إضافة جغرافية' : 'Create Region'}
                        </button>
                    </form>
                </div>

                {/* Assign Admin to Region */}
                <div className="card">
                    <h3>{isRTL ? 'تخصيص مشرف إقليمي' : 'Assign Regional Admin'}</h3>
                    <form onSubmit={handleAssignAdmin} className="region-form">
                        <div className="form-group">
                            <label>{isRTL ? 'معرف المشرف' : 'Admin User ID'}</label>
                            <input 
                                type="number"
                                value={assignAdminId}
                                onChange={(e) => setAssignAdminId(e.target.value)}
                                placeholder="Enter User ID"
                                required 
                            />
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
                        <button type="submit" className="primary-btn">
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
                                </tr>
                            </thead>
                            <tbody>
                                {regions.map(region => (
                                    <tr key={region.id}>
                                        <td>#{region.id}</td>
                                        <td>{region.name}</td>
                                        <td><span className="badge code">{region.code}</span></td>
                                        <td><span className="badge currency">{region.currency_code}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegionsManager;
