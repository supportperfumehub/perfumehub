import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api_v1_0_2';

export const RegionContext = createContext();

const DEFAULT_QATAR_REGION = {
    id: 4,
    name: 'Qatar',
    code: 'QA',
    currency_code: 'QAR'
};

export const RegionProvider = ({ children }) => {
    const [regions, setRegions] = useState([DEFAULT_QATAR_REGION]);
    const [activeRegion, setActiveRegion] = useState(DEFAULT_QATAR_REGION);
    const [isSupported] = useState(true);
    const [detectedCountry] = useState('Qatar');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const initRegion = async () => {
            try {
                const res = await api.get('/regions');
                const list = res.data || [];
                const qatarRegion = list.find(r => r.code?.toUpperCase() === 'QA') || DEFAULT_QATAR_REGION;
                setRegions(list.length > 0 ? list : [DEFAULT_QATAR_REGION]);
                setActiveRegion(qatarRegion);
                localStorage.setItem('perfumehub_regions', JSON.stringify(list.length > 0 ? list : [DEFAULT_QATAR_REGION]));
                localStorage.setItem('perfumehub_selected_region_id', String(qatarRegion.id));
                localStorage.setItem('perfumehub_active_region', JSON.stringify(qatarRegion));
            } catch (err) {
                console.error('Failed to fetch regions:', err);
                setActiveRegion(DEFAULT_QATAR_REGION);
            }
        };

        // Clear any old selected foreign region from localStorage
        try {
            const savedActive = localStorage.getItem('perfumehub_active_region');
            if (savedActive) {
                const parsed = JSON.parse(savedActive);
                if (parsed.code && parsed.code.toUpperCase() !== 'QA') {
                    localStorage.setItem('perfumehub_active_region', JSON.stringify(DEFAULT_QATAR_REGION));
                    localStorage.setItem('perfumehub_selected_region_id', String(DEFAULT_QATAR_REGION.id));
                }
            }
        } catch (e) {
            // Ignore storage parse error
        }

        initRegion();
    }, []);

    const changeRegion = (regionId) => {
        // Qatar is the only region
        setActiveRegion(DEFAULT_QATAR_REGION);
        localStorage.setItem('perfumehub_selected_region_id', String(DEFAULT_QATAR_REGION.id));
        localStorage.setItem('perfumehub_active_region', JSON.stringify(DEFAULT_QATAR_REGION));
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

