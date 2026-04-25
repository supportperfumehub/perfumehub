import { supabase } from '../config/supabaseClient.js';

export class UserRepository {
    /**
     * Find a user by email
     */
    async findByEmail(email) {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Find a user by ID
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Create a new user
     */
    async create(userData) {
        const { data, error } = await supabase
            .from('customers')
            .insert([userData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    /**
     * Update user details
     */
    async update(id, updates) {
        const { data, error } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    /**
     * Increment failed login attempts
     */
    async incrementFailedAttempts(id, currentAttempts, lockoutDurationMins) {
        const updates = { failed_attempts: currentAttempts + 1 };
        
        if (currentAttempts + 1 >= parseInt(process.env.LOCKOUT_ATTEMPTS || '5')) {
            const lockoutDate = new Date();
            lockoutDate.setMinutes(lockoutDate.getMinutes() + parseInt(lockoutDurationMins));
            updates.lockout_until = lockoutDate.toISOString();
        }

        return this.update(id, updates);
    }

    /**
     * Reset login attempts upon successful login
     */
    async resetLoginAttempts(id) {
        return this.update(id, { 
            failed_attempts: 0, 
            lockout_until: null,
            last_login: new Date().toISOString()
        });
    }

    /**
     * Refresh Token Management
     */
    async saveRefreshToken(userId, token, expiresAt) {
        const { error } = await supabase
            .from('refresh_tokens')
            .insert([{ user_id: userId, token, expires_at: expiresAt }]);
        
        if (error) throw error;
    }

    async findRefreshToken(token) {
        const { data, error } = await supabase
            .from('refresh_tokens')
            .select('*')
            .eq('token', token)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async revokeRefreshToken(token) {
        const { error } = await supabase
            .from('refresh_tokens')
            .update({ is_revoked: true })
            .eq('token', token);
        
        if (error) throw error;
    }

    async revokeAllUserTokens(userId) {
        const { error } = await supabase
            .from('refresh_tokens')
            .update({ is_revoked: true })
            .eq('user_id', userId);
        
        if (error) throw error;
    }

    /**
     * Find all users with filters
     */
    async findAll(filters = {}) {
        let query = supabase.from('customers').select('id, name, email, role');
        if (filters.role) query = query.eq('role', filters.role);
        
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    /**
     * Find specialized ID with shop join
     */
    async findByIdWithShops(id) {
        const { data, error } = await supabase
            .from('customers')
            .select('*, shops:shop_id(*)')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    }
}
