import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronDown, ChevronUp, Search, MessageCircle, HelpCircle } from 'lucide-react';
import './FAQ.css';

const FAQ = () => {
  const { isRTL } = useOutletContext();
  const [activeIndex, setActiveIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqData = [
    {
      category: isRTL ? 'حول المنتجات' : 'Products & Authenticity',
      questions: [
        {
          q: isRTL ? 'هل جميع العطور أصلية؟' : 'Are all perfumes authentic?',
          a: isRTL 
            ? 'نعم، جميع عطورنا أصلية 100%. نحن نستورد مباشرة من الموزعين المعتمدين والعلامات التجارية لضمان الجودة والأصالة.' 
            : 'Yes, all our perfumes are 100% authentic. We source directly from authorized distributors and brands to guarantee quality and authenticity.'
        },
        {
          q: isRTL ? 'كيف أختار العطر المناسب لي؟' : 'How do I choose the right perfume for me?',
          a: isRTL 
            ? 'يمكنك استخدام مستشار الذكاء الاصطناعي الخاص بنا (PerfumeHub AI) أو تصفح الأوصاف التفصيلية للمكونات (القمة، القلب، القاعدة) في صفحة كل منتج.' 
            : 'You can use our AI Advisor (PerfumeHub AI) or browse the detailed ingredient descriptions (top, heart, base notes) on each product page.'
        }
      ]
    },
    {
      category: isRTL ? 'الشحن والتوصيل' : 'Shipping & Delivery',
      questions: [
        {
          q: isRTL ? 'ما هي مدة التوصيل؟' : 'How long does delivery take?',
          a: isRTL 
            ? 'يستغرق التوصيل داخل الدوحة من 24 إلى 48 ساعة. بالنسبة للمناطق الأخرى، قد يستغرق الأمر من 2 إلى 4 أيام عمل.' 
            : 'Delivery within Doha takes 24 to 48 hours. For other areas, it may take 2 to 4 business days.'
        },
        {
          q: isRTL ? 'هل التوصيل مجاني؟' : 'Is delivery free?',
          a: isRTL 
            ? 'نعم، نوفر توصيلاً مجانياً لجميع الطلبات داخل قطر.' 
            : 'Yes, we provide free delivery for all orders within Qatar.'
        }
      ]
    },
    {
      category: isRTL ? 'الطلبات والمدفوعات' : 'Orders & Payments',
      questions: [
        {
          q: isRTL ? 'ما هي طرق الدفع المتاحة؟' : 'What payment methods do you accept?',
          a: isRTL 
            ? 'نقبل بطاقات الائتمان (فيزا وماستركارد)، وآبل باي، والدفع عند الاستلام.' 
            : 'We accept credit cards (Visa, Mastercard), Apple Pay, and Cash on Delivery.'
        },
        {
          q: isRTL ? 'هل يمكنني إلغاء طلبي؟' : 'Can I cancel my order?',
          a: isRTL 
            ? 'يمكنك إلغاء طلبك طالما لم يتم شحنه بعد. يرجى التواصل مع خدمة العملاء في أقرب وقت ممكن.' 
            : 'You can cancel your order as long as it has not been shipped yet. Please contact customer service as soon as possible.'
        }
      ]
    },
    {
      category: isRTL ? 'الإرجاع والتبديل' : 'Returns & Exchanges',
      questions: [
        {
          q: isRTL ? 'ما هي سياسة الإرجاع الخاصة بكم؟' : 'What is your return policy?',
          a: isRTL 
            ? 'نقبل الإرجاع خلال 14 يوماً من تاريخ الاستلام، بشرط أن يكون العطر في تغليفه الأصلي ولم يتم فتحه.' 
            : 'We accept returns within 14 days of receipt, provided the perfume is in its original packaging and has not been opened.'
        }
      ]
    }
  ];

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const filteredFaqs = faqData.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q => 
      q.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
      q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <div className="faq-page animate-fade-in" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <div className="faq-hero">
        <div className="container text-center">
            <HelpCircle size={48} className="faq-icon-large" />
            <h1>{isRTL ? 'الأسئلة الشائعة' : 'How can we help?'}</h1>
            <p>{isRTL ? 'ابحث عن إجابات سريعة لاستفساراتك' : 'Find quick answers to your questions'}</p>
            
            <div className="faq-search-wrapper">
                <Search className="search-icon" size={20} />
                <input 
                    type="text" 
                    placeholder={isRTL ? 'ابحث عن سؤال...' : 'Search for a question...'} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="faq-search-input"
                />
            </div>
        </div>
      </div>

      <div className="container faq-content-wrapper section">
        <div className="faq-categories">
            {filteredFaqs.length > 0 ? (
                filteredFaqs.map((category, catIdx) => (
                    <div key={catIdx} className="faq-category-section">
                        <h2 className="faq-category-title">{category.category}</h2>
                        <div className="faq-list">
                            {category.questions.map((faq, qIdx) => {
                                const globalIdx = `${catIdx}-${qIdx}`;
                                const isOpen = activeIndex === globalIdx;
                                return (
                                    <div 
                                        key={qIdx} 
                                        className={`faq-item ${isOpen ? 'open' : ''}`}
                                        onClick={() => toggleAccordion(globalIdx)}
                                    >
                                        <div className="faq-question">
                                            <span>{faq.q}</span>
                                            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                        <div className="faq-answer">
                                            <p>{faq.a}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center no-results">
                    <p>{isRTL ? 'عذراً، لم نجد نتائج لبحثك.' : 'Sorry, no results found for your search.'}</p>
                </div>
            )}
        </div>

        <div className="faq-support-card reveal">
            <div className="support-content">
                <MessageCircle size={32} />
                <div>
                    <h3>{isRTL ? 'هل لا تزال لديك أسئلة؟' : 'Still have questions?'}</h3>
                    <p>{isRTL ? 'فريق الدعم لدينا متاح لمساعدتك 24/7' : 'Our support team is available 24/7 to help you'}</p>
                </div>
            </div>
            <button className="btn btn-primary">{isRTL ? 'تواصل معنا' : 'Contact Support'}</button>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
