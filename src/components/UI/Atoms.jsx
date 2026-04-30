import React from 'react';
import { MapPin } from 'lucide-react';

export const Badge = ({ type, children }) => {
    // types: 'premium', 'nearest', 'best-price'
    return (
        <span className={`ui-badge ${type}`}>
            {children}
        </span>
    );
};

export const PrimaryCTA = ({ onClick, children, disabled, className = '' }) => (
    <button 
        className={`btn btn-primary ${className}`} 
        onClick={onClick} 
        disabled={disabled}
        style={{ width: '100%', borderRadius: 'var(--radius-pill)', padding: '16px' }}
    >
        {children}
    </button>
);

export const ReserveCTA = ({ onClick, children, disabled, className = '' }) => (
    <button 
        className={`btn btn-outline ${className}`} 
        onClick={onClick} 
        disabled={disabled}
        style={{ width: '100%', borderRadius: 'var(--radius-pill)', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
    >
        <MapPin size={18} />
        {children}
    </button>
);
