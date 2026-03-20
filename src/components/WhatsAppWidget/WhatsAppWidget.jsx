import React from 'react';
import { MessageCircle } from 'lucide-react';
import './WhatsAppWidget.css';

const WhatsAppWidget = ({ isRTL }) => {
    const whatsappNumber = "97412345678"; // Dummy Qatar number
    const message = isRTL
        ? "مرحباً، أود الاستفسار عن عطوركم الفاخرة."
        : "Hello, I would like to inquire about your luxury perfumes.";

    const encodedMessage = encodeURIComponent(message);

    return (
        <a
            href={`https://wa.me/${whatsappNumber}?text=${encodedMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-widget"
            aria-label="Chat on WhatsApp"
        >
            <MessageCircle size={30} color="#fff" fill="#25D366" stroke="none" />
            <span className="whatsapp-tooltip">
                {isRTL ? 'تحدث معنا' : 'Chat with us'}
            </span>
        </a>
    );
};

export default WhatsAppWidget;
