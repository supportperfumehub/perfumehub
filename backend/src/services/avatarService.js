import { supabase } from '../config/supabaseClient.js';
import fs from 'fs';
import path from 'path';

// In-memory cache for high-speed avatar lookups across requests
const avatarMemoryCache = new Map();

/**
 * Retrieve user avatar from memory cache, Supabase backups table, or disk
 */
export async function getAvatarUrl(userId) {
    if (!userId) return null;
    const key = String(userId);

    if (avatarMemoryCache.has(key)) {
        return avatarMemoryCache.get(key) || null;
    }

    // 1. Check Supabase backups table
    try {
        const { data, error } = await supabase
            .from('backups')
            .select('data')
            .eq('table_name', 'user_avatars')
            .eq('record_id', key)
            .order('id', { ascending: false })
            .limit(1);

        if (!error && data && data.length > 0 && data[0]?.data?.avatar_url) {
            const url = data[0].data.avatar_url;
            avatarMemoryCache.set(key, url);
            return url;
        }
    } catch (e) {
        console.warn(`[AvatarService] Supabase avatar lookup error for user ${key}:`, e.message);
    }

    // 2. Fallback to local filesystem
    try {
        const avatarFile = path.join(process.cwd(), 'backend', 'data', 'avatars', `${key}.json`);
        if (fs.existsSync(avatarFile)) {
            const fileData = JSON.parse(fs.readFileSync(avatarFile, 'utf8'));
            if (fileData?.avatar_url) {
                avatarMemoryCache.set(key, fileData.avatar_url);
                return fileData.avatar_url;
            }
        }
    } catch (_) {}

    avatarMemoryCache.set(key, null);
    return null;
}

/**
 * Synchronous avatar lookup from memory cache or local file
 */
export function getAvatarUrlSync(userId) {
    if (!userId) return null;
    const key = String(userId);

    if (avatarMemoryCache.has(key)) {
        return avatarMemoryCache.get(key) || null;
    }

    try {
        const avatarFile = path.join(process.cwd(), 'backend', 'data', 'avatars', `${key}.json`);
        if (fs.existsSync(avatarFile)) {
            const fileData = JSON.parse(fs.readFileSync(avatarFile, 'utf8'));
            if (fileData?.avatar_url) {
                avatarMemoryCache.set(key, fileData.avatar_url);
                return fileData.avatar_url;
            }
        }
    } catch (_) {}

    return null;
}

/**
 * Persist user avatar to memory cache, Supabase backups table, and disk
 */
export async function saveAvatarUrl(userId, avatarUrl) {
    if (!userId) return;
    const key = String(userId);
    const cleanUrl = avatarUrl || null;

    // 1. Update memory cache immediately
    avatarMemoryCache.set(key, cleanUrl);

    // 2. Persist to Supabase backups table (clean existing + insert fresh)
    try {
        await supabase
            .from('backups')
            .delete()
            .eq('table_name', 'user_avatars')
            .eq('record_id', key);

        if (cleanUrl) {
            const { error: insertErr } = await supabase
                .from('backups')
                .insert({
                    table_name: 'user_avatars',
                    record_id: key,
                    data: { 
                        avatar_url: cleanUrl, 
                        updated_at: new Date().toISOString() 
                    }
                });
            if (insertErr) {
                console.warn(`[AvatarService] Supabase avatar insert warning:`, insertErr.message);
            }
        }
    } catch (e) {
        console.warn(`[AvatarService] Supabase avatar persistence error:`, e.message);
    }

    // 3. Fallback to local disk (if filesystem is writable)
    try {
        const avatarsDir = path.join(process.cwd(), 'backend', 'data', 'avatars');
        if (!fs.existsSync(avatarsDir)) {
            fs.mkdirSync(avatarsDir, { recursive: true });
        }
        const avatarFile = path.join(avatarsDir, `${key}.json`);
        fs.writeFileSync(avatarFile, JSON.stringify({ 
            avatar_url: cleanUrl || '', 
            updated_at: new Date().toISOString() 
        }), 'utf8');
    } catch (_) {}
}
