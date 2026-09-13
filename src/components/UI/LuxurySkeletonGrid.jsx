import React from 'react';
import './LuxurySkeletonGrid.css';

export const LuxurySkeletonCard = () => {
    return (
        <div className="luxury-skeleton-card">
            <div className="skeleton-image-box skeleton-shimmer">
                <div className="skeleton-badge-pill skeleton-shimmer" />
            </div>
            <div className="skeleton-card-body">
                <div className="skeleton-brand skeleton-shimmer" />
                <div className="skeleton-name skeleton-shimmer" />
                <div className="skeleton-meta skeleton-shimmer" />
                <div className="skeleton-price-row">
                    <div className="skeleton-price skeleton-shimmer" />
                    <div className="skeleton-btn skeleton-shimmer" />
                </div>
            </div>
        </div>
    );
};

export const LuxurySkeletonGrid = ({ count = 8, withHeader = true }) => {
    return (
        <div className="luxury-skeleton-wrapper container">
            {withHeader && (
                <div className="luxury-skeleton-header">
                    <div className="skeleton-title-bar skeleton-shimmer" />
                    <div className="skeleton-subtitle-bar skeleton-shimmer" />
                </div>
            )}
            <div className="luxury-skeleton-grid">
                {[...Array(count)].map((_, i) => (
                    <LuxurySkeletonCard key={i} />
                ))}
            </div>
        </div>
    );
};

export default LuxurySkeletonGrid;
