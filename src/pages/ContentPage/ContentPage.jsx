import React, { useEffect } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';

const ContentPage = () => {
    const { pathname } = useLocation();
    const { isRTL } = useOutletContext();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    const pageInfo = {
        '/about': { title: isRTL ? 'من نحن' : 'About Us', text: isRTL ? 'معلومات عن تاريخنا العريق في عالم العطور.' : 'Information about our rich history in the world of perfumes.' },
        '/contact': { title: isRTL ? 'تواصل معنا' : 'Contact Us', text: isRTL ? 'نحن هنا لمساعدتك والإجابة على استفساراتك.' : 'We are here to help and answer your queries.' },
        '/faq': { title: isRTL ? 'الأسئلة الشائعة' : 'FAQ', text: isRTL ? 'إجابات لأهم الأسئلة المتعلقة بالتوصيل والدفع.' : 'Answers to common questions regarding delivery and payment.' },
        '/blog': { title: isRTL ? 'المدونة' : 'Blog', text: isRTL ? 'نصائح عن العطور وكيفية اختيار العطر المناسب لك.' : 'Tips on perfumes and how to choose the right one for you.' },
        '/cart': { title: isRTL ? 'سلة التسوق' : 'Shopping Cart', text: isRTL ? 'سلتك فارغة حالياً. تسوق الآن للبدء.' : 'Your cart is currently empty. Shop now to get started.' }
    };

    const info = pageInfo[pathname] || { title: 'Page', text: 'Content coming soon.' };

    return (
        <div className="section container text-center" style={{ paddingTop: '150px', minHeight: '60vh' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>{info.title}</h1>
            <p style={{ color: 'var(--color-text-light)', fontSize: '1.2rem' }}>{info.text}</p>
        </div>
    );
};

export default ContentPage;
