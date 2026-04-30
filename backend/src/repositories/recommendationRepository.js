import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';

export class RecommendationRepository {
    /**
     * Call the Postgres RPC for recommendation logic
     */
    async getRecommendedVendors(productId, lat, lng) {
        const { data, error } = await withTimeout(supabase.rpc('get_recommended_vendors', {
            p_id: productId,
            u_lat: parseFloat(lat),
            u_lng: parseFloat(lng)
        }));

        if (error) throw error;
        return data;
    }

    /**
     * Administrative: Update weights
     */
    async updateAlgorithmConfig(id, updates) {
        const { data, error } = await supabase
            .from('algorithm_configs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    /**
     * Administrative: Manual Boost / Featured
     */
    async updateShopBoost(shopId, updates) {
        const { data, error } = await supabase
            .from('shops')
            .update(updates)
            .eq('id', shopId)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    /**
     * Currency Exchange Rates
     */
    async updateExchangeRates(rates) {
        // rates = [{code, rate_to_qar}, ...]
        const { error } = await supabase
            .from('currency_exchange_rates')
            .upsert(rates);
        
        if (error) throw error;
    }
}
