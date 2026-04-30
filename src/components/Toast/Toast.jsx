import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, type, visible, onHide }) => {
    if (!visible && !message) return null;

    return (
        <div className={`toast-notification ${type} ${visible ? 'show' : 'hide'}`}>
            <div className="toast-content">
                <div className="toast-icon">
                    {type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                </div>
                <div className="toast-message">{message}</div>
                <button className="toast-close" onClick={onHide}>
                    <X size={16} />
                </button>
            </div>
            <div className="toast-progress"></div>
        </div>
    );
};

export default Toast;
