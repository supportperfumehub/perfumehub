import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Snowflake, Gift, Store } from 'lucide-react';
import './TrustBadges.css';

const TrustBadges = ({ variant = 'grid', isRTL = false }) => {
    const { t } = useTranslation();

    const badges = [
        {
            icon: <ShieldCheck size={26} className="badge-icon" />,
            titleEn: '100% Authentic Guarantee',
            titleAr: 'أصالة مضمونة 100%',
            descEn: 'Direct from Parisian & Arabian Haute Parfumeries',
            descAr: 'توريد مباشر من دور العطور الباريسية والشرقية العريقة'
        },
        {
            icon: <Snowflake size={26} className="badge-icon" />,
            titleEn: 'Climate-Controlled Delivery',
            titleAr: 'توصيل مبرد ومحمي',
            descEn: 'Preserving volatile notes from Gulf heat',
            descAr: 'سيارات مبردة لحماية جزيئات العطر من حرارة الخليج'
        },
        {
            icon: <Gift size={26} className="badge-icon" />,
            titleEn: 'Complimentary Gift Wrapping',
            titleAr: 'تغليف هدايا ملكي مجاني',
            descEn: 'Signature satin ribbon & embossed wax seal',
            descAr: 'شرائط حريرية ملكية مع ختم شمعي وبطاقة إهداء مخصصة'
        },
        {
            icon: <Store size={26} className="badge-icon" />,
            titleEn: '1-Hour Boutique Pickup',
            titleAr: 'استلام فوري خلال ساعة',
            descEn: 'Priority VIP collection at Souq Al Jabor & Lusail',
            descAr: 'استلام مباشر من بوتيك سوق الجبر ولوسيل مارينا'
        }
    ];

    return (
        <div className={`luxury-trust-badges-wrapper variant-${variant}`}>
            <div className="luxury-trust-grid">
                {badges.map((badge, idx) => (
                    <div key={idx} className="luxury-trust-item">
                        <div className="badge-icon-box">
                            {badge.icon}
                        </div>
                        <div className="badge-text-box">
                            <h4>{isRTL ? badge.titleAr : badge.titleEn}</h4>
                            <p>{isRTL ? badge.descAr : badge.descEn}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TrustBadges;
