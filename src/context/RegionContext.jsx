import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api_v1_0_2';

export const RegionContext = createContext();

const FALLBACK_QATAR_REGION = {
    id: 7,
    name: 'Doha',
    code: 'DOH',
    currency_code: 'QAR'
};

export const RegionProvider = ({ children }) => {
    const [regions, setRegions] = useState(() => {
        try {
            const saved = localStorage.getItem('perfumehub_regions');
            return saved ? JSON.parse(saved) : [FALLBACK_QATAR_REGION];
        } catch (e) {
            return [FALLBACK_QATAR_REGION];
        }
    });

    const [activeRegion, setActiveRegion] = useState(() => {
        try {
            const saved = localStorage.getItem('perfumehub_active_region');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && (parsed.currency_code === 'QAR' || parsed.currency === 'QAR' || !parsed.currency_code)) {
                    return parsed;
                }
            }
        } catch (e) {}
        return FALLBACK_QATAR_REGION;
    });

    const [isSupported] = useState(true);
    const [detectedCountry] = useState('Qatar');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const initRegion = async () => {
            try {
                const res = await api.get('/regions');
                const list = Array.isArray(res.data) ? res.data : [];
                if (list.length > 0) {
                    setRegions(list);
                    localStorage.setItem('perfumehub_regions', JSON.stringify(list));

                    const savedId = localStorage.getItem('perfumehub_selected_region_id');
                    const match = list.find(r => String(r.id) === String(savedId))
                        || list.find(r => String(r.id) === String(activeRegion?.id))
                        || list.find(r => r.code?.toUpperCase() === 'DOH' || r.code?.toUpperCase() === 'QA')
                        || list[0];

                    if (match) {
                        setActiveRegion(match);
                        localStorage.setItem('perfumehub_selected_region_id', String(match.id));
                        localStorage.setItem('perfumehub_active_region', JSON.stringify(match));
                    }
                } else {
                    setRegions([FALLBACK_QATAR_REGION]);
                    setActiveRegion(FALLBACK_QATAR_REGION);
                }
            } catch (err) {
                console.error('Failed to fetch regions:', err);
            }
        };

        // Clear any old foreign region (AED / GBP / etc.) from localStorage
        try {
            const savedActive = localStorage.getItem('perfumehub_active_region');
            if (savedActive) {
                const parsed = JSON.parse(savedActive);
                if (parsed.currency_code && parsed.currency_code !== 'QAR') {
                    localStorage.setItem('perfumehub_active_region', JSON.stringify(FALLBACK_QATAR_REGION));
                    localStorage.setItem('perfumehub_selected_region_id', String(FALLBACK_QATAR_REGION.id));
                    setActiveRegion(FALLBACK_QATAR_REGION);
                }
            }
        } catch (e) {
            // Ignore storage parse error
        }

        initRegion();
    }, []);

    const changeRegion = (regionId) => {
        const found = regions.find(r => String(r.id) === String(regionId));
        const target = found || regions[0] || FALLBACK_QATAR_REGION;
        setActiveRegion(target);
        localStorage.setItem('perfumehub_selected_region_id', String(target.id));
        localStorage.setItem('perfumehub_active_region', JSON.stringify(target));
    };

    return (
        <RegionContext.Provider value={{
            regions,
            activeRegion,
            isSupported,
            detectedCountry,
            changeRegion,
            loading
        }}>
            {children}
        </RegionContext.Provider>
    );
};

