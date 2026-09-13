import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
    ShieldCheck, ShieldAlert, RefreshCw, Search, Filter, 
    Download, Clock, User, FileText, CheckCircle, AlertTriangle,
    Database, HardDrive, Key, Activity, Layers, ArrowDownUp
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api_v1_0_2';

const AuditLogsManager = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [entityFilter, setEntityFilter] = useState('all');
    const [expandedLogId, setExpandedLogId] = useState(null);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get('/admin/audit-logs');
            const data = Array.isArray(res.data) ? res.data : (res.data?.logs || []);
            setLogs(data);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchLogs();
        }
    }, [user]);

    // Unique actions and entities for filters
    const availableActions = useMemo(() => {
        const set = new Set(logs.map(l => l.action).filter(Boolean));
        return Array.from(set);
    }, [logs]);

    const availableEntities = useMemo(() => {
        const set = new Set(logs.map(l => l.target_entity || l.targetEntity).filter(Boolean));
        return Array.from(set);
    }, [logs]);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const action = log.action || '';
            const entity = log.target_entity || log.targetEntity || '';
            const actor = log.actor_email || log.actorEmail || '';
            const detailsStr = JSON.stringify(log.details || {});

            const matchesAction = actionFilter === 'all' || action === actionFilter;
            const matchesEntity = entityFilter === 'all' || entity === entityFilter;
            const matchesSearch = !searchQuery || 
                action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
                actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                detailsStr.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesAction && matchesEntity && matchesSearch;
        });
    }, [logs, actionFilter, entityFilter, searchQuery]);

    const getActionBadge = (action) => {
        const act = (action || '').toLowerCase();
        let bg = 'rgba(59, 130, 246, 0.15)';
        let color = '#60a5fa';
        let border = '#60a5fa44';

        if (act.includes('delete') || act.includes('reject') || act.includes('emergency')) {
            bg = 'rgba(239, 68, 68, 0.15)';
            color = '#f87171';
            border = '#ef444444';
        } else if (act.includes('approve') || act.includes('create') || act.includes('verified')) {
            bg = 'rgba(16, 185, 129, 0.15)';
            color = '#34d399';
            border = '#10b98144';
        } else if (act.includes('update') || act.includes('tier') || act.includes('settings')) {
            bg = 'rgba(245, 158, 11, 0.15)';
            color = '#fbbf24';
            border = '#f59e0b44';
        }

        return (
            <span style={{
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: '700',
                fontFamily: 'monospace',
                background: bg,
                color: color,
                border: `1px solid ${border}`,
                display: 'inline-block'
            }}>
                {action}
            </span>
        );
    };

    const handleExportJson = () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `perfumehub_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    return (
        <div className="manager-content animate-fade-in" style={{ color: '#f8fafc' }}>
            {/* Header */}
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldAlert size={26} color="#d4af37" />
                        {isRTL ? 'سجل التدقيق والأمان غير القابل للتعديل' : 'Immutable Platform Security & Audit Trail'}
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                        {isRTL 
                            ? 'تسجيل موثق ومزدوج لجميع التعديلات السيادية: الكتالوج، الحوالات المالية، وترقيات البوتيكات' 
                            : 'Cryptographic dual-ledger recording all executive catalog, payout, tier, and meta-control mutations'}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={fetchLogs}
                        disabled={loading}
                        style={{
                            padding: '8px 16px',
                            background: '#1e293b',
                            color: '#f8fafc',
                            border: '1px solid #475569',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <RefreshCw size={15} className={loading ? 'spin' : ''} />
                        {isRTL ? 'تحديث السجل' : 'Refresh Trail'}
                    </button>
                    <button
                        type="button"
                        onClick={handleExportJson}
                        style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Download size={15} />
                        {isRTL ? 'تصدير السجل الكامل (JSON)' : 'Export Audit Trail (JSON)'}
                    </button>
                </div>
            </div>

            {/* Architecture Invariant Banner */}
            <div style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37' }}>
                        <Database size={20} />
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.92rem' }}>
                            {isRTL ? 'حماية السجل المزدوج الفوري (Dual-Ledger Persistence)' : 'Zero Cold-Start Data Loss Dual-Ledger'}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                            {isRTL 
                                ? 'كل حدث يسجل تزامناً في قاعدة بيانات PostgreSQL السيادية وملف السجل المحلي المشفر على القرص الصلب' 
                                : 'Every executive mutation is mirrored between Supabase PostgreSQL and local filesystem backend/data/audit_logs.json'}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ fontSize: '0.75rem', background: '#1e293b', border: '1px solid #334155', padding: '4px 10px', borderRadius: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle size={12} /> Supabase PostgreSQL
                    </span>
                    <span style={{ fontSize: '0.75rem', background: '#1e293b', border: '1px solid #334155', padding: '4px 10px', borderRadius: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle size={12} /> Disk Append Journal
                    </span>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#1e293b', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: '500' }}>
                        {isRTL ? 'إجمالي العمليات المسجلة' : 'Total Audited Mutations'}
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc', marginTop: '6px' }}>
                        {logs.length}
                    </div>
                </div>

                <div style={{ background: '#1e293b', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: '500' }}>
                        {isRTL ? 'عمليات تسوية الأرصدة والتحويل' : 'Financial Payout Clearances'}
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981', marginTop: '6px' }}>
                        {logs.filter(l => (l.action || '').includes('payout')).length}
                    </div>
                </div>

                <div style={{ background: '#1e293b', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: '500' }}>
                        {isRTL ? 'تعديلات الكتالوج السيادي' : 'Catalog Master Updates'}
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#38bdf8', marginTop: '6px' }}>
                        {logs.filter(l => (l.action || '').includes('product')).length}
                    </div>
                </div>

                <div style={{ background: '#1e293b', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: '500' }}>
                        {isRTL ? 'حوكمة البوتيكات وترقية الفئات' : 'Tier & Governance Actions'}
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#c8a951', marginTop: '6px' }}>
                        {logs.filter(l => (l.action || '').includes('tier') || (l.action || '').includes('shop')).length}
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
                    <Search size={16} color="#64748b" style={{ position: 'absolute', left: isRTL ? 'auto' : '12px', right: isRTL ? '12px' : 'auto', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder={isRTL ? 'بحث بالبريد، الإجراء، أو التفاصيل...' : 'Search by email, action, entity, details...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: isRTL ? '9px 38px 9px 12px' : '9px 12px 9px 38px',
                            color: '#f8fafc',
                            fontSize: '0.85rem'
                        }}
                    />
                </div>

                <div style={{ minWidth: '160px' }}>
                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        style={{
                            width: '100%',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '9px 12px',
                            color: '#f8fafc',
                            fontSize: '0.85rem'
                        }}
                    >
                        <option value="all">{isRTL ? 'جميع الإجراءات' : 'All Actions'}</option>
                        {availableActions.map(act => (
                            <option key={act} value={act}>{act}</option>
                        ))}
                    </select>
                </div>

                <div style={{ minWidth: '160px' }}>
                    <select
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                        style={{
                            width: '100%',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '9px 12px',
                            color: '#f8fafc',
                            fontSize: '0.85rem'
                        }}
                    >
                        <option value="all">{isRTL ? 'جميع الكيانات' : 'All Target Entities'}</option>
                        {availableEntities.map(ent => (
                            <option key={ent} value={ent}>{ent}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Audit Log Table */}
            <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', fontSize: '0.86rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', background: '#0f172a' }}>
                                <th style={{ padding: '12px 14px' }}>{isRTL ? 'التوقيت' : 'Timestamp'}</th>
                                <th style={{ padding: '12px 14px' }}>{isRTL ? 'المشرف المسؤول' : 'Executive Actor'}</th>
                                <th style={{ padding: '12px 14px' }}>{isRTL ? 'نوع الإجراء' : 'Action'}</th>
                                <th style={{ padding: '12px 14px' }}>{isRTL ? 'الكيان المستهدف' : 'Target Entity'}</th>
                                <th style={{ padding: '12px 14px' }}>{isRTL ? 'المعرف' : 'Target ID'}</th>
                                <th style={{ padding: '12px 14px' }}>{isRTL ? 'تفاصيل السجل' : 'Payload & Changes'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                                        {loading ? (isRTL ? 'جاري استرجاع السجلات المشفرة...' : 'Retrieving encrypted audit trail...') : (isRTL ? 'لا توجد سجلات تطابق الفلتر' : 'No audit records match active filter')}
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const logId = log.id || `${log.timestamp}-${log.action}`;
                                    const isExpanded = expandedLogId === logId;
                                    const actorEmail = log.actor_email || log.actorEmail || 'system';
                                    const actorRole = log.actor_role || log.actorRole || 'admin';
                                    const entity = log.target_entity || log.targetEntity || '-';
                                    const targetId = log.target_id || log.targetId || '-';
                                    const dateStr = log.created_at || log.timestamp;
                                    const formattedDate = dateStr ? new Date(dateStr).toLocaleString() : 'Recent';

                                    return (
                                        <React.Fragment key={logId}>
                                            <tr 
                                                style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.2s', cursor: 'pointer' }}
                                                onClick={() => setExpandedLogId(isExpanded ? null : logId)}
                                            >
                                                <td style={{ padding: '12px 14px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                                    <Clock size={12} style={{ display: 'inline', marginRight: '5px', color: '#64748b' }} />
                                                    {formattedDate}
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.84rem' }}>{actorEmail}</div>
                                                    <span style={{ fontSize: '0.7rem', color: '#c8a951', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        {actorRole}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    {getActionBadge(log.action)}
                                                </td>
                                                <td style={{ padding: '12px 14px', color: '#cbd5e1', fontWeight: '500' }}>
                                                    {entity}
                                                </td>
                                                <td style={{ padding: '12px 14px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                    {String(targetId).substring(0, 12)}
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedLogId(isExpanded ? null : logId);
                                                        }}
                                                        style={{
                                                            background: isExpanded ? '#334155' : 'transparent',
                                                            border: '1px solid #475569',
                                                            color: isExpanded ? '#d4af37' : '#cbd5e1',
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {isExpanded ? (isRTL ? 'إخفاء التفاصيل' : 'Hide JSON') : (isRTL ? 'عرض التفاصيل' : 'Inspect JSON')}
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr style={{ background: '#0a0f1d' }}>
                                                    <td colSpan={6} style={{ padding: '16px 20px' }}>
                                                        <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>
                                                            {isRTL ? 'حمولة السجل والتغييرات التفصيلية:' : 'Cryptographic Event Payload & Mutation Diff:'}
                                                        </div>
                                                        <pre style={{
                                                            margin: 0,
                                                            padding: '12px',
                                                            background: '#040711',
                                                            borderRadius: '8px',
                                                            border: '1px solid #1e293b',
                                                            color: '#34d399',
                                                            fontSize: '0.78rem',
                                                            fontFamily: 'Consolas, monospace',
                                                            overflowX: 'auto',
                                                            lineHeight: '1.5'
                                                        }}>
                                                            {JSON.stringify(log.details || log, null, 2)}
                                                        </pre>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLogsManager;
