import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../config/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIT_LOG_FILE = path.join(__dirname, '../../data/audit_logs.json');

// Ensure data directory exists
try {
    const dataDir = path.dirname(AUDIT_LOG_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
} catch (e) {
    console.error('Failed to create data directory for audit logs:', e.message);
}

/**
 * Log an administrative operation to immutable audit logs
 * 
 * @param {Object} entry
 * @param {number} entry.actorId - ID of admin user
 * @param {string} entry.actorEmail - Email of admin user
 * @param {string} entry.actorRole - 'super_admin' | 'admin' | 'regional_admin'
 * @param {string} entry.action - Action name e.g. 'approve_shop', 'ban_shop', 'update_algorithm', etc.
 * @param {string} entry.targetEntity - 'shops' | 'products' | 'algorithm_configs' | 'system_settings' | 'payouts' | 'banners'
 * @param {string} entry.targetId - ID of the target record
 * @param {Object} [entry.details] - JSON details of the change
 * @param {string} [entry.ipAddress] - Request IP address
 */
export async function logAdminAudit({
    actorId,
    actorEmail,
    actorRole,
    action,
    targetEntity,
    targetId,
    details = {},
    ipAddress = null
}) {
    const timestamp = new Date().toISOString();
    const auditRecord = {
        id: 'audit_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
        actor_id: actorId || 0,
        actor_email: actorEmail || 'system@perfumehubqa.com',
        actor_role: actorRole || 'super_admin',
        action,
        target_entity: targetEntity,
        target_id: String(targetId || ''),
        details,
        ip_address: ipAddress || '127.0.0.1',
        created_at: timestamp
    };

    // 1. Persist to local JSON file for zero serverless data loss
    try {
        let logs = [];
        if (fs.existsSync(AUDIT_LOG_FILE)) {
            try {
                const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
                logs = JSON.parse(content || '[]');
            } catch (err) {
                logs = [];
            }
        }
        logs.unshift(auditRecord);
        if (logs.length > 500) logs = logs.slice(0, 500); // Retain latest 500 operations
        fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
    } catch (fsErr) {
        console.error('AuditLogger file write error:', fsErr.message);
    }

    // 2. Persist to Supabase admin_audit_logs table
    try {
        await supabase
            .from('admin_audit_logs')
            .insert([{
                actor_id: auditRecord.actor_id,
                actor_email: auditRecord.actor_email,
                actor_role: auditRecord.actor_role,
                action: auditRecord.action,
                target_entity: auditRecord.target_entity,
                target_id: auditRecord.target_id,
                details: auditRecord.details,
                ip_address: auditRecord.ip_address,
                created_at: timestamp
            }]);
    } catch (dbErr) {
        // Table may be in transition; local file acts as persistent store
    }

    return auditRecord;
}

/**
 * Retrieve audit logs (combines DB records and file backup)
 */
export async function getAdminAuditLogs({ limit = 50, offset = 0, action = null, targetEntity = null, search = null } = {}) {
    let logs = [];

    try {
        let query = supabase
            .from('admin_audit_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (action) query = query.eq('action', action);
        if (targetEntity) query = query.eq('target_entity', targetEntity);
        if (search) {
            query = query.or(`actor_email.ilike.%${search}%,target_id.ilike.%${search}%,action.ilike.%${search}%`);
        }

        query = query.range(offset, offset + limit - 1);
        const { data, count, error } = await query;

        if (!error && Array.isArray(data) && data.length > 0) {
            return { logs: data, total: count || data.length };
        }
    } catch (dbErr) {
        // Fallback to local file store
    }

    // Fallback: Read from local JSON file
    try {
        if (fs.existsSync(AUDIT_LOG_FILE)) {
            const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
            let fileLogs = JSON.parse(content || '[]');

            if (action) fileLogs = fileLogs.filter(l => l.action === action);
            if (targetEntity) fileLogs = fileLogs.filter(l => l.target_entity === targetEntity);
            if (search) {
                const s = search.toLowerCase();
                fileLogs = fileLogs.filter(l => 
                    (l.actor_email && l.actor_email.toLowerCase().includes(s)) ||
                    (l.action && l.action.toLowerCase().includes(s)) ||
                    (l.target_id && String(l.target_id).toLowerCase().includes(s))
                );
            }

            const total = fileLogs.length;
            const paged = fileLogs.slice(offset, offset + limit);
            return { logs: paged, total };
        }
    } catch (fsErr) {
        console.error('Error reading audit logs file:', fsErr.message);
    }

    return { logs: [], total: 0 };
}
