/**
 * Geolocation Utility with Multi-Layer Fallback
 * 
 * Priority: GPS → IP Geolocation → Saved Location → Platform Default
 * Each layer tags the result with `source` and `accuracy` (meters)
 * so the API can adapt its search radius accordingly.
 */

// Default radius per accuracy source (in km)
const RADIUS_BY_SOURCE = {
    gps: 10,
    ip: 30,
    saved: 50,
    default: 100
};

/**
 * Attempts to get the user's location through multiple fallback layers.
 * @returns {Promise<{lat: number, lng: number, source: string, accuracy: number, suggestedRadiusKm: number}>}
 */
export const getLocationWithFallback = async () => {
    // Layer 1: Browser GPS (most accurate)
    if ('geolocation' in navigator) {
        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 5000,
                    maximumAge: 300000,     // Accept cached position up to 5 min old
                    enableHighAccuracy: false // Use network location for speed
                });
            });

            const loc = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                source: 'gps',
                accuracy: pos.coords.accuracy, // meters
                suggestedRadiusKm: RADIUS_BY_SOURCE.gps
            };

            // Cache for future fallback
            try { localStorage.setItem('ph_user_location', JSON.stringify({ lat: loc.lat, lng: loc.lng })); } catch (storageErr) { console.warn('Could not cache GPS location:', storageErr); }
            return loc;
        } catch (e) {
            // GPS blocked or timed out — fall through silently
            console.log('GPS unavailable, falling back:', e.code === 1 ? 'Permission denied' : 'Timeout');
        }
    }

    // Layer 2: IP Geolocation (city-level accuracy)
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();

        if (data.latitude && data.longitude) {
            return {
                lat: data.latitude,
                lng: data.longitude,
                source: 'ip',
                accuracy: 50000,   // ~50km city-level
                suggestedRadiusKm: RADIUS_BY_SOURCE.ip
            };
        }
    } catch (e) {
        console.warn('IP geolocation failed, falling back:', e?.message || e);
    }

    // Layer 3: Previously saved location
    try {
        const saved = localStorage.getItem('ph_user_location');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.lat && parsed.lng) {
                return {
                    lat: parsed.lat,
                    lng: parsed.lng,
                    source: 'saved',
                    accuracy: 100000,  // May be outdated
                    suggestedRadiusKm: RADIUS_BY_SOURCE.saved
                };
            }
        }
    } catch (storageErr) { console.warn('Could not read saved location:', storageErr); }

    // Layer 4: Platform default (Doha, Qatar)
    return {
        lat: 25.2854,
        lng: 51.5310,
        source: 'default',
        accuracy: 200000,
        suggestedRadiusKm: RADIUS_BY_SOURCE.default
    };
};

/**
 * Fetches the nearest shops that have a specific product in stock.
 * Automatically determines location via fallback chain.
 * 
 * @param {number} productId - The product to search for
 * @param {{lat?: number, lng?: number}} overrideLocation - Optional manual override
 * @returns {Promise<{shops: Array, locationSource: string}>}
 */
export const fetchNearestShopsForProduct = async (productId, overrideLocation = null) => {
    let location;
    
    if (overrideLocation?.lat && overrideLocation?.lng) {
        location = { ...overrideLocation, source: 'manual', suggestedRadiusKm: 20 };
    } else {
        location = await getLocationWithFallback();
    }

    const params = new URLSearchParams({
        product_id: productId,
        lat: location.lat,
        lng: location.lng,
        radius: location.suggestedRadiusKm
    });

    try {
        const res = await fetch(`/api/shops/nearest-for-product?${params}`);
        if (!res.ok) throw new Error('Failed to fetch nearest shops');
        const data = await res.json();
        return {
            shops: data.data || [],
            locationSource: location.source,
            accuracy: location.accuracy
        };
    } catch (e) {
        console.error('Nearest shop fetch error:', e);
        return { shops: [], locationSource: location.source, accuracy: location.accuracy };
    }
};
