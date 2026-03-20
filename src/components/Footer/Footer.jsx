import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import logo from '../../assets/logo_transparent.png';
import './Footer.css';

const Footer = ({ isRTL }) => {
    const { t } = useTranslation();
    return (
        <footer className="footer">
            <div className="container footer-container">
                <div className="footer-brand">
                    <img src={logo} alt="PerfumeHub Logo" className="footer-logo" />
                    <p className="footer-desc">
                        {t('footer.description')}
                    </p>
                    <div className="social-links">
                        <a href="https://www.instagram.com/perfumehub__qa?igsh=MXZkNnNjeGwyNzE2Mg==" aria-label="Instagram"><Instagram size={20} /></a>
                        <a href="#" aria-label="Facebook"><Facebook size={20} /></a>
                        <a href="#" aria-label="Twitter"><Twitter size={20} /></a>
                    </div>
                </div>

                <div className="footer-links">
                    <h3>{t('footer.quick_links')}</h3>
                    <ul>
                        <li><Link to="/about">{t('footer.about_us')}</Link></li>
                        <li><Link to="/contact">{t('footer.contact_us_link')}</Link></li>
                        <li><Link to="/faq">{t('footer.faq')}</Link></li>
                        <li><Link to="/blog">{t('footer.blog')}</Link></li>
                    </ul>
                </div>

                <div className="footer-links">
                    <h3>{t('footer.policies')}</h3>
                    <ul>
                        <li><Link to="/privacy-policy">{t('footer.privacy_policy')}</Link></li>
                        <li><Link to="/terms-conditions">{t('footer.terms_conditions')}</Link></li>
                        <li><Link to="/refund-policy">{t('footer.refund_policy')}</Link></li>
                        <li><Link to="/shipping-policy">{t('footer.shipping_policy')}</Link></li>
                    </ul>
                </div>

                <div className="footer-links">
                    <h3>{t('footer.shopping')}</h3>
                    <ul>
                        <li><Link to="/shop">{t('footer.all_perfumes')}</Link></li>
                        <li><Link to="/category/arabic">{t('footer.arabic_perfumes')}</Link></li>
                        <li><Link to="/brands">{t('footer.brands')}</Link></li>
                    </ul>
                </div>

                <div className="footer-contact">
                    <h3>{t('footer.contact_us')}</h3>
                    <p>Doha, Qatar</p>
                    <p>Email: supportperfumehub@gmail.com</p>
                    <p>Phone: +974 1234 5678</p>

                    <div className="payment-methods">
                        {/* Payment Icons Simulation */}
                        <span>VISA</span>
                        <span>MasterCard</span>
                        <span>Apple Pay</span>
                        <span>QPay</span>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} PerfumeHub. {t('footer.rights_reserved')}</p>
            </div>
        </footer>
    );
};

export default Footer;
