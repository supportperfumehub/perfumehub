import { AppError } from '../middleware/errorHandler.js';
import { uploadImageToStorage } from '../utils/storageUtils.js';
import { getAvatarUrl, saveAvatarUrl } from './avatarService.js';

export class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async getAllUsers(filters = {}) {
        const users = await this.userRepository.findAll(filters);
        return Promise.all(users.map(async (u) => {
            const { password, password_hash, ...safeUser } = u;
            if (!safeUser.avatar_url) {
                safeUser.avatar_url = await getAvatarUrl(u.id);
            }
            return safeUser;
        }));
    }

    async getUserProfile(id) {
        const user = await this.userRepository.findByIdWithShops(id);
        if (!user) throw new AppError('User not found', 404);

        const { password, password_hash, ...safeUser } = user;
        if (!safeUser.avatar_url) {
            safeUser.avatar_url = await getAvatarUrl(id);
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
                uploadedAvatar = updates.avatar_url || '';
            }
            // Persist avatar to Supabase backups store and memory cache
            await saveAvatarUrl(id, uploadedAvatar);
        }

        try {
            const updated = await this.userRepository.update(id, updates);
            const { password, password_hash, ...safeUser } = updated;
            if (!safeUser.avatar_url && uploadedAvatar) {
                safeUser.avatar_url = uploadedAvatar;
            }
            return safeUser;
        } catch (err) {
            // If avatar_url column does not exist yet in Supabase schema cache (Postgres 42703 or PostgREST PGRST204)
            const isAvatarColumnMissing = err?.code === '42703' || 
                                          err?.code === 'PGRST204' || 
                                          (err?.message && typeof err.message === 'string' && err.message.toLowerCase().includes('avatar_url'));

            if (isAvatarColumnMissing && updates.avatar_url !== undefined) {
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
