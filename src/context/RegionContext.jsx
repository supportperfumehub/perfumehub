import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api_v1_0_2';
import axios from 'axios';

export const RegionContext = createContext();

export const RegionProvider = ({ children }) => {
    const [regions, setRegions] = useState(() => {
        try {
            const saved = localStorage.getItem('perfumehub_regions');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });
    const [activeRegion, setActiveRegion] = useState(() => {
        try {
            const saved = localStorage.getItem('perfumehub_active_region');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const [isSupported, setIsSupported] = useState(true);
    const [detectedCountry, setDetectedCountry] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchRegions = async () => {
        try {
            const res = await api.get('/regions');
            const list = res.data || [];
            setRegions(list);
            localStorage.setItem('perfumehub_regions', JSON.stringify(list));
            return list;
        } catch (err) {
            console.error('Failed to fetch regions:', err);
            return [];
        }
    };

    useEffect(() => {
        const initRegion = async () => {
            setLoading(true);
            const list = await fetchRegions();
            
            // 1. Check if user already manually selected a region in localStorage
            const savedRegionId = localStorage.getItem('perfumehub_selected_region_id');
            let matchedRegion = null;
            if (savedRegionId && list.length > 0) {
                matchedRegion = list.find(r => String(r.id) === String(savedRegionId));
            }

            // 2. Geolocation detection if no saved preference
            if (!matchedRegion && list.length > 0) {
                try {
                    const geoRes = await axios.get('https://ipapi.co/json/').catch(() => null);
                    if (geoRes && geoRes.data && geoRes.data.country_code) {
                        const countryCode = geoRes.data.country_code.toUpperCase();
                        setDetectedCountry(geoRes.data.country_name || countryCode);
                        
                        matchedRegion = list.find(r => r.code?.toUpperCase() === countryCode);
                        if (!matchedRegion) {
                            setIsSupported(false);
                            matchedRegion = list.find(r => r.code?.toUpperCase() === 'QA');
                        }
                    }
                } catch (geoErr) {
                    console.error('IP Geolocation failed:', geoErr);
                }
            }

            // 3. Fallback to Qatar
            if (!matchedRegion && list.length > 0) {
                matchedRegion = list.find(r => r.code?.toUpperCase() === 'QA') || list[0];
            }

            if (matchedRegion) {
                setActiveRegion(matchedRegion);
                localStorage.setItem('perfumehub_selected_region_id', matchedRegion.id);
                localStorage.setItem('perfumehub_active_region', JSON.stringify(matchedRegion));
            }
            setLoading(false);
        };

        initRegion();
    }, []);

    const changeRegion = (regionId) => {
        const matched = regions.find(r => String(r.id) === String(regionId));
        if (matched) {
            setActiveRegion(matched);
            localStorage.setItem('perfumehub_selected_region_id', matched.id);
            localStorage.setItem('perfumehub_active_region', JSON.stringify(matched));
            setIsSupported(true); 
            window.location.reload();
        }
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
