import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { ShopContext } from '../../context/ShopContext';
import './Contact.css';

const Contact = () => {
    const { isRTL } = useOutletContext();
    const { showToast } = useContext(ShopContext);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission logic here
        showToast(isRTL ? 'تم إرسال رسالتك بنجاح!' : 'Your message has been sent successfully!', 'success');
        setFormData({ name: '', email: '', subject: '', message: '' });
    };

    return (
        <div className="contact-page section container" style={{ paddingTop: '150px', minHeight: '60vh' }}>
            <div className="contact-header text-center">
                <h1 className="contact-title">{isRTL ? 'تواصل معنا' : 'Contact Us'}</h1>
                <p className="contact-subtitle">
                    {isRTL
                        ? 'نحن هنا لمساعدتك. تواصل معنا لأي استفسارات حول منتجاتنا أو طلباتك.'
                        : 'We are here to help. Contact us for any inquiries about our products or your orders.'}
                </p>
            </div>

            <div className="contact-content">
                <div className="contact-info">
                    <h2>{isRTL ? 'معلومات الاتصال' : 'Contact Information'}</h2>

                    <div className="info-item">
                        <div className="info-icon"><MapPin size={24} /></div>
                        <div>
                            <h4>{isRTL ? 'عنواننا' : 'Our Address'}</h4>
                            <p className="premium-location">Souq al Jabor Doha Qatar.</p>
                        </div>
                    </div>

                    <div className="info-item">
                        <div className="info-icon"><Phone size={24} /></div>
                        <div>
                            <h4>{isRTL ? 'رقم الهاتف' : 'Phone Number'}</h4>
                            <p><a href="tel:+97430301901">+974 3030 1901</a></p>
                            <p><a href="https://wa.me/97430301901" target="_blank" rel="noopener noreferrer" className="whatsapp-link">
                                WhatsApp: {isRTL ? 'دردش معنا' : 'Chat with us'}
                            </a></p>
                        </div>
                    </div>

                    <div className="info-item">
                        <div className="info-icon"><Mail size={24} /></div>
                        <div>
                            <h4>{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</h4>
                            <p>supportperfumehub@gmail.com</p>
                        </div>
                    </div>

                    <div className="info-item">
                        <div className="info-icon"><Clock size={24} /></div>
                        <div>
                            <h4>{isRTL ? 'ساعات العمل' : 'Working Hours'}</h4>
                            <p>{isRTL ? 'الأحد - الخميس: 9 ص - 10 م' : 'Sunday - Thursday: 9 AM - 10 PM'}<br />
                                {isRTL ? 'الجمعة - السبت: 2 م - 11 م' : 'Friday - Saturday: 2 PM - 11 PM'}</p>
                        </div>
                    </div>
                </div>

                <div className="contact-form-container">
                    <h2>{isRTL ? 'أرسل لنا رسالة' : 'Send Us A Message'}</h2>
                    <form className="contact-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">{isRTL ? 'الاسم الكامل' : 'Full Name'}</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label htmlFor="subject">{isRTL ? 'الموضوع' : 'Subject'}</label>
                            <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label htmlFor="message">{isRTL ? 'رسالتك' : 'Your Message'}</label>
                            <textarea id="message" name="message" rows="5" value={formData.message} onChange={handleChange} required></textarea>
                        </div>

                        <button className="btn btn-primary w-100" type="submit">
                            {isRTL ? 'إرسال الرسالة' : 'Send Message'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;
