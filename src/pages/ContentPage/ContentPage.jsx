import React, { useEffect } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const ContentPage = () => {
    const { pathname } = useLocation();
    const { isRTL = false } = useOutletContext() || {};

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    const pageInfo = {
        '/about': { title: isRTL ? 'من نحن | دار العطور الفاخرة في قطر' : 'About Us | PerfumeHub Qatar - Luxury Fragrance Boutique', text: isRTL ? 'معلومات عن تاريخنا العريق في عالم العطور الفاخرة والأصيلة في قطر.' : 'Discover our journey as Qatar\'s leading luxury boutique for authentic French, Arabic, and niche fragrances.' },
        '/contact': { title: isRTL ? 'تواصل معنا' : 'Contact Us', text: isRTL ? 'نحن هنا لمساعدتك والإجابة على استفساراتك.' : 'We are here to help and answer your queries.' },
        '/faq': { title: isRTL ? 'الأسئلة الشائعة' : 'FAQ', text: isRTL ? 'إجابات لأهم الأسئلة المتعلقة بالتوصيل والدفع.' : 'Answers to common questions regarding delivery and payment.' },
        '/blog': { title: isRTL ? 'مدونة العطور | نصائح وأسرار العطور في قطر' : 'Fragrance Journal & Blog | PerfumeHub Qatar', text: isRTL ? 'نصائح عن العطور وكيفية اختيار العطر المناسب للأجواء والمناسبات.' : 'Expert tips, fragrance layering guides, and insights on luxury perfumes in the Gulf.' },
        '/cart': { title: isRTL ? 'سلة التسوق' : 'Shopping Cart', text: isRTL ? 'سلتك فارغة حالياً. تسوق الآن للبدء.' : 'Your cart is currently empty. Shop now to get started.' }
    };

    const info = pageInfo[pathname] || { title: 'PerfumeHub Qatar', text: 'Content coming soon.' };

    return (
        <div className="section container text-center" style={{ paddingTop: '150px', minHeight: '60vh' }}>
            <Helmet>
                <title>{info.title}</title>
                <meta name="description" content={info.text} />
                <link rel="canonical" href={`https://perfumehubqa.com${pathname}`} />
            </Helmet>
            <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>{info.title}</h1>
            <p style={{ color: 'var(--color-text-light)', fontSize: '1.2rem' }}>{info.text}</p>
        </div>
    );
};

export default ContentPage;
