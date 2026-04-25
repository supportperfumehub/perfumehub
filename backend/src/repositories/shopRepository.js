import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';

export class ShopRepository {
    async findAll(filters = {}) {
        let query = supabase.from('shops').select('*, customers!shops_owner_id_fkey(name, email)');
        
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
        if (filters.region_ids) query = query.in('region_id', filters.region_ids);

        const { data, error } = await withTimeout(query);
        if (error) throw error;
        return data;
    }

    async findById(id) {
        const { data, error } = await withTimeout(supabase
            .from('shops')
            .select('*, customers:owner_id(name, email)')
            .eq('id', id)
            .single());
        
        if (error) throw error;
        return data;
    }

    async findNearest(lat, lon, radiusKm) {
        const { data, error } = await withTimeout(supabase.rpc('search_shops', {
            user_lat: parseFloat(lat),
            user_lng: parseFloat(lon),
            radius_meters: parseFloat(radiusKm) * 1000
        }));

        if (error) throw error;
        return data;
    }

    async findNearestForProduct(productId, lat, lng, radiusKm, limit = 10) {
        const { data, error } = await withTimeout(supabase.rpc('find_nearest_shops_for_product', {
            p_product_id: parseInt(productId),
            p_lat: parseFloat(lat),
            p_lng: parseFloat(lng),
            p_radius_meters: parseFloat(radiusKm) * 1000,
            p_limit: parseInt(limit)
        }));

        if (error) throw error;
        return data || [];
    }

    async create(shopData) {
        const { data, error } = await supabase
            .from('shops')
            .insert([shopData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async update(id, updates) {
        const { data, error } = await supabase
            .from('shops')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async delete(id) {
        const { error } = await supabase.from('shops').delete().eq('id', id);
        if (error) throw error;
    }
}
