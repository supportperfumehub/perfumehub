import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Trash2, RotateCcw, Archive } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText, 
    cancelText, 
    isRTL,
    variant = 'danger',
    style = {},
    isSlide = true,
    isPremium = false,
    iconType = 'alert' // 'alert', 'trash', 'restore', 'archive'
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const getIcon = () => {
        const size = 32;
        switch (iconType) {
            case 'trash': return <Trash2 size={size} strokeWidth={1.8} />;
            case 'restore': return <RotateCcw size={size} strokeWidth={1.8} />;
            case 'archive': return <Archive size={size} strokeWidth={1.8} />;
            default: return <AlertTriangle size={size} strokeWidth={1.8} />;
        }
    };

    const modalContent = (
        <div 
            className="confirm-modal-overlay animate-fade-in" 
            onClick={onClose}
        >
            <div 
                className={`confirm-modal-card ${variant} ${isSlide ? 'animate-slide-up' : ''} ${isRTL ? 'rtl' : ''}`} 
                onClick={(e) => e.stopPropagation()}
                style={style}
            >
                <button type="button" className="confirm-modal-close-btn" onClick={onClose} aria-label="Close">
                    <X size={16} />
                </button>
                
                <div className="confirm-modal-body">
                    <div className={`confirm-modal-halo ${variant}`}>
                        {getIcon()}
                    </div>
                    <div className="confirm-modal-text">
                        <h3>{title}</h3>
                        <p>{message}</p>
                        <span className="confirm-modal-subtitle">
                            {isRTL ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.'}
                        </span>
                    </div>
                </div>

                <div className="confirm-modal-footer">
                    <button type="button" className="btn-modal-cancel" onClick={onClose}>
                        {cancelText || (isRTL ? 'إلغاء' : 'CANCEL')}
                    </button>
                    <button type="button" className={`btn-modal-confirm ${variant}`} onClick={(e) => { e.stopPropagation(); onConfirm(); }}>
                        {confirmText || (isRTL ? 'تأكيد' : 'CONFIRM')}
                    </button>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    return modalRoot ? createPortal(modalContent, modalRoot) : null;
};

export default ConfirmModal;
