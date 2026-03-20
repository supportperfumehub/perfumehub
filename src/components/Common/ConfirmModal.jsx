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
    if (!isOpen) return null;

    const getIcon = () => {
        const size = isPremium ? 36 : 32;
        switch (iconType) {
            case 'trash': return <Trash2 size={size} strokeWidth={1.5} />;
            case 'restore': return <RotateCcw size={size} strokeWidth={1.5} />;
            case 'archive': return <Archive size={size} strokeWidth={1.5} />;
            default: return <AlertTriangle size={size} strokeWidth={1.5} />;
        }
    };

    return (
        <div 
            className={`confirm-modal-overlay animate-fade-in ${isPremium ? 'premium-matte-overlay' : ''}`} 
            onClick={onClose}
        >
            <div 
                className={`confirm-modal-content ${isPremium ? 'premium-matte-content' : 'centered-premium-content'} ${isSlide ? 'animate-slide-up' : ''} ${isRTL ? 'rtl' : ''}`} 
                onClick={(e) => e.stopPropagation()}
                style={style}
            >
                <button className="confirm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                
                <div className="confirm-modal-body">
                    <div className={`confirm-modal-icon ${variant} ${isPremium ? 'premium-icon' : ''}`}>
                        {getIcon()}
                    </div>
                    <div className="confirm-modal-text">
                        <h3>{title}</h3>
                        <p>{message}</p>
                    </div>
                </div>

                <div className="confirm-modal-footer">
                    <button className="btn-modal btn-cancel" onClick={onClose}>
                        {cancelText || (isRTL ? 'إلغاء' : 'Cancel')}
                    </button>
                    <button className={`btn-modal btn-confirm ${variant} ${isPremium ? 'premium-confirm' : ''}`} onClick={onConfirm}>
                        {confirmText || (isRTL ? 'تأكيد' : 'Confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
