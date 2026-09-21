import { AppError } from '../middleware/errorHandler.js';
import { uploadImageToStorage } from '../utils/storageUtils.js';
import fs from 'fs';
import path from 'path';

export class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    _getAvatarFallback(id) {
        try {
            const avatarFile = path.join(process.cwd(), 'backend', 'data', 'avatars', `${id}.json`);
            if (fs.existsSync(avatarFile)) {
                const data = JSON.parse(fs.readFileSync(avatarFile, 'utf8'));
                return data?.avatar_url || null;
            }
        } catch (e) {
            // Ignore error
        }
        return null;
    }

    _saveAvatarFallback(id, avatarUrl) {
        try {
            const avatarsDir = path.join(process.cwd(), 'backend', 'data', 'avatars');
            if (!fs.existsSync(avatarsDir)) {
                fs.mkdirSync(avatarsDir, { recursive: true });
            }
            const avatarFile = path.join(avatarsDir, `${id}.json`);
            fs.writeFileSync(avatarFile, JSON.stringify({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }), 'utf8');
        } catch (e) {
            console.warn('[UserService] Could not write avatar fallback:', e.message);
        }
    }

    async getAllUsers(filters = {}) {
        const users = await this.userRepository.findAll(filters);
        return users.map(u => {
            const { password, password_hash, ...safeUser } = u;
            if (!safeUser.avatar_url) {
                safeUser.avatar_url = this._getAvatarFallback(u.id);
            }
            return safeUser;
        });
    }

    async getUserProfile(id) {
        const user = await this.userRepository.findByIdWithShops(id);
        if (!user) throw new AppError('User not found', 404);

        const { password, password_hash, ...safeUser } = user;
        if (!safeUser.avatar_url) {
            safeUser.avatar_url = this._getAvatarFallback(id);
        }
        return safeUser;
    }

    async updateUserProfile(id, updates) {
        // Prevent sensitive field updates via general profile route
        const forbidden = ['role', 'password_hash', 'id', 'email_verified'];
        forbidden.forEach(key => delete updates[key]);

        let uploadedAvatar = null;
        if (updates.avatar_url !== undefined) {
            if (updates.avatar_url && updates.avatar_url.startsWith('data:')) {
                uploadedAvatar = await uploadImageToStorage(updates.avatar_url, `avatar_${id}`, 'avatars');
                updates.avatar_url = uploadedAvatar;
            } else {
                uploadedAvatar = updates.avatar_url;
            }
            this._saveAvatarFallback(id, updates.avatar_url);
        }

        try {
            const updated = await this.userRepository.update(id, updates);
            const { password, password_hash, ...safeUser } = updated;
            if (!safeUser.avatar_url && uploadedAvatar) {
                safeUser.avatar_url = uploadedAvatar;
            }
            return safeUser;
        } catch (err) {
            // If avatar_url column does not exist yet in Supabase schema cache
            if (err?.code === '42703' && updates.avatar_url !== undefined) {
                console.warn('[UserService] avatar_url not in DB schema cache, saving with dual persistence fallback');
                const cleanUpdates = { ...updates };
                delete cleanUpdates.avatar_url;

                let updatedUser = null;
                if (Object.keys(cleanUpdates).length > 0) {
                    updatedUser = await this.userRepository.update(id, cleanUpdates);
                } else {
                    updatedUser = await this.userRepository.findById(id);
                }
                const { password, password_hash, ...safeUser } = updatedUser;
                safeUser.avatar_url = updates.avatar_url || uploadedAvatar;
                return safeUser;
            }
            throw err;
        }
    }
}
