import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import './ActionSlider.css';

const ActionSlider = ({ 
    onConfirm, 
    text = "Slide to confirm", 
    variant = 'primary', // 'primary' (gold) or 'danger' (crimson)
    isRTL = false 
}) => {
    const [sliderPos, setSliderPos] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const containerRef = useRef(null);
    const handleRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleStart = (e) => {
        if (isComplete) return;
        setIsDragging(true);
    };

    const handleMove = (e) => {
        if (!isDragging || isComplete) return;

        const container = containerRef.current;
        const handle = handleRef.current;
        if (!container || !handle) return;

        const rect = container.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        
        let pos;
        if (isRTL) {
            pos = rect.right - clientX - (handle.offsetWidth / 2);
        } else {
            pos = clientX - rect.left - (handle.offsetWidth / 2);
        }

        const maxPos = rect.width - handle.offsetWidth - 8; // 4px padding each side
        
        if (pos < 0) pos = 0;
        if (pos > maxPos) pos = maxPos;

        setSliderPos(pos);

        // Check for completion (90% threshold for organic feel)
        if (pos > maxPos * 0.95) {
            setIsComplete(true);
            setIsDragging(false);
            onConfirm();
        }
    };

    const handleEnd = () => {
        if (!isDragging || isComplete) return;
        setIsDragging(false);
        // Snap back if not reached
        setSliderPos(0);
    };

    useEffect(() => {
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isComplete, isRTL, isDragging]);

    return (
        <div 
            className={`action-slider-container ${variant} ${isRTL ? 'rtl' : ''} ${isComplete ? 'complete' : ''}`}
            ref={containerRef}
        >
            <div className="action-slider-track">
                <span className="action-slider-text">{isComplete ? "Action Confirmed" : text}</span>
            </div>
            
            <div 
                className="action-slider-handle"
                ref={handleRef}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                style={{ 
                    transform: isRTL ? `translateX(-${sliderPos}px)` : `translateX(${sliderPos}px)`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <ChevronRight size={20} className={isRTL ? 'rotate-180' : ''} />
            </div>
        </div>
    );
};

export default ActionSlider;
