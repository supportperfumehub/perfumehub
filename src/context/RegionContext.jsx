import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api_v1_0_2';

export const RegionContext = createContext();

const FALLBACK_QATAR_REGION = {
    id: 7,
    name: 'Doha',
    code: 'DOH',
    currency_code: 'QAR'
};

export const SUPPORTED_CURRENCIES = [
    { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', symbolAr: 'ر.ق' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', symbolAr: 'ر.س' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED', symbolAr: 'د.إ' },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD', symbolAr: 'د.ك' },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BHD', symbolAr: 'د.ب' },
    { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', symbolAr: 'ر.ع' },
    { code: 'USD', name: 'US Dollar', symbol: '$', symbolAr: '$' }
];

const DEFAULT_RATES = {
    QAR: 1.0,
    SAR: 1.03,
    AED: 1.008,
    KWD: 0.084,
    BHD: 0.103,
    OMR: 0.106,
    USD: 0.274
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
                if (parsed) return parsed;
            }
        } catch (e) {}
        return FALLBACK_QATAR_REGION;
    });

    const [currency, setCurrencyState] = useState(() => {
        try {
            return localStorage.getItem('perfumehub_selected_currency') || 'QAR';
        } catch (e) {
            return 'QAR';
        }
    });

    const [rates, setRates] = useState(DEFAULT_RATES);
    const [isSupported] = useState(true);
    const [detectedCountry] = useState('Qatar');
    const [loading, setLoading] = useState(false);

    const setCurrency = useCallback((newCurrency) => {
        if (!newCurrency) return;
        setCurrencyState(newCurrency);
        try {
            localStorage.setItem('perfumehub_selected_currency', newCurrency);
        } catch (e) {}
    }, []);

    useEffect(() => {
        const initRegionAndRates = async () => {
            setLoading(true);
            try {
                // 1. Fetch Qatar/Doha regions
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

            // 2. Fetch live exchange rates from backend
            try {
                const ratesRes = await api.get('/regions/rates');
                if (ratesRes.data?.rates) {
                    setRates(ratesRes.data.rates);
                }
            } catch (err) {
                console.warn('Failed to fetch live exchange rates, using defaults:', err);
            } finally {
                setLoading(false);
            }
        };

        initRegionAndRates();
    }, []);

    const changeRegion = (regionId) => {
        const found = regions.find(r => String(r.id) === String(regionId));
        const target = found || regions[0] || FALLBACK_QATAR_REGION;
        setActiveRegion(target);
        localStorage.setItem('perfumehub_selected_region_id', String(target.id));
        localStorage.setItem('perfumehub_active_region', JSON.stringify(target));
    };

    /**
     * Convert an amount in QAR to target currency (default current active preview currency)
     */
    const convertPrice = useCallback((amountInQar, targetCurrency = currency) => {
        const numeric = Number(amountInQar) || 0;
        if (targetCurrency === 'QAR' || !rates[targetCurrency]) {
            return numeric;
        }
        const rate = rates[targetCurrency] || 1.0;
        const converted = numeric * rate;
        // KWD, BHD, OMR typically have 3 decimals; others 2 or rounded
        if (['KWD', 'BHD', 'OMR'].includes(targetCurrency)) {
            return Math.round(converted * 1000) / 1000;
        }
        return Math.round(converted * 100) / 100;
    }, [currency, rates]);

    /**
     * Format an amount in QAR into localized currency string e.g. "1,250 QAR" or "343.50 USD"
     */
    const formatPrice = useCallback((amountInQar, targetCurrency = currency, isRTL = false) => {
        const val = convertPrice(amountInQar, targetCurrency);
        const currObj = SUPPORTED_CURRENCIES.find(c => c.code === targetCurrency);
        const symbol = isRTL ? (currObj?.symbolAr || targetCurrency) : (currObj?.symbol || targetCurrency);

        const formattedNumber = val.toLocaleString('en-US', {
            minimumFractionDigits: ['KWD', 'BHD', 'OMR'].includes(targetCurrency) ? 3 : (targetCurrency === 'USD' ? 2 : 0),
            maximumFractionDigits: ['KWD', 'BHD', 'OMR'].includes(targetCurrency) ? 3 : 2
        });

        if (isRTL) {
            return `${formattedNumber} ${symbol}`;
        }
        return `${formattedNumber} ${symbol}`;
    }, [convertPrice, currency]);

    return (
        <RegionContext.Provider value={{
            regions,
            activeRegion,
            isSupported,
            detectedCountry,
            changeRegion,
            loading,
            currency,
            setCurrency,
            rates,
            convertPrice,
            formatPrice,
            supportedCurrencies: SUPPORTED_CURRENCIES
        }}>
            {children}
        </RegionContext.Provider>
    );
};

