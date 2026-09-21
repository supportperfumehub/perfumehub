import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, ChevronUp, Search, MessageCircle, HelpCircle } from 'lucide-react';
import './FAQ.css';

const FAQ = () => {
  const { isRTL = false } = useOutletContext() || {};
  const [activeIndex, setActiveIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqData = [
    {
      category: isRTL ? 'التسوق والتوصيل في قطر' : 'Shopping & Express Delivery in Qatar',
      questions: [
        {
          q: isRTL ? 'أين يمكنني شراء عطور فاخرة أصلية عبر الإنترنت في قطر؟' : 'Where can I buy original luxury perfumes online in Qatar?',
          a: isRTL
            ? 'بيرفيوم هوب قطر (perfumehubqa.com) هي وجهتك الموثوقة الأولى في قطر لشراء العطور الفاخرة، والعود العربي الملكي، وعطور النيش الأصلية مع توصيل سريع لجميع بلديات قطر.'
            : 'PerfumeHub Qatar (perfumehubqa.com) is Qatar\'s trusted online boutique for authentic luxury perfumes, exclusive Arabian oud, and rare niche fragrances with express delivery across Doha and all municipalities.'
        },
        {
          q: isRTL ? 'ما هي سرعة توصيل العطور داخل الدوحة وقطر؟' : 'How fast is perfume delivery in Doha, Qatar?',
          a: isRTL
            ? 'نوفر خدمة التوصيل السريع خلال 2 إلى 4 ساعات داخل الدوحة، لوسيل، واللؤلؤة. أما باقي مناطق وبلديات قطر، فيستغرق التوصيل من 24 إلى 48 ساعة فقط.'
            : 'We offer 2-4 hour express delivery across Doha, Lusail, and The Pearl. Deliveries to all other Qatar municipalities are fulfilled within 24 to 48 hours.'
        },
        {
          q: isRTL ? 'هل العطور المعروضة على بيرفيوم هوب أصلية 100٪ ومضمونة؟' : 'Are perfumes sold on PerfumeHub Qatar 100% authentic?',
          a: isRTL
            ? 'نعم بكل تأكيد. جميع العطور والزيوت العطرية ومستحضرات التجميل مضمونة 100% أصلية ومغلقة في عبواتها الأصلية، ومستوردة مباشرة من الموزعين المعتمدين دولياً.'
            : 'Yes, absolutely. Every fragrance is 100% authentic, sealed, and sourced directly from verified authorized international brand distributors.'
        },
        {
          q: isRTL ? 'هل تتوفر خدمة الدفع عند الاستلام (COD) في قطر؟' : 'Can I pay Cash on Delivery (COD) for perfumes in Qatar?',
          a: isRTL
            ? 'نعم! نقبل الدفع نقداً عند الاستلام في كافة أنحاء قطر، بالإضافة إلى الدفع الآمن عبر آبل باي، والبطاقات الائتمانية، وبطاقات الخصم المباشر المحلية بالريال القطري (QAR).'
            : 'Yes! We accept Cash on Delivery (COD) across all Qatar municipalities, as well as Apple Pay, Credit Cards, and local QAR debit cards.'
        },
        {
          q: isRTL ? 'كيف أختار العطر الأنسب لمناخ قطر وأجوائها؟' : 'How do I choose the best perfume for Qatar\'s climate?',
          a: isRTL
            ? 'يمكنك استشارة مستشار العطور الذكي (Scent Genie AI) على موقعنا ليقدم لك توصيات مخصصة تناسب ذوقك وتمنحك ثباتاً وفوحاناً مثالياً في الأجواء الدافئة.'
            : 'You can use our smart Scent Genie AI advisor to receive bespoke recommendations tailored to your olfactive preferences and designed for optimum longevity in Qatar\'s warm climate.'
        }
      ]
    },
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
            ? 'يمكنك استخدام جني العطور الخاص بنا (Scent Genie) أو تصفح الأوصاف التفصيلية للمكونات (القمة، القلب، القاعدة) في صفحة كل منتج.' 
            : 'You can use our Scent Genie or browse the detailed ingredient descriptions (top, heart, base notes) on each product page.'
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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.flatMap(cat => 
      cat.questions.map(q => ({
        "@type": "Question",
        "name": q.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": q.a
        }
      }))
    )
  };

  return (
    <div className="faq-page animate-fade-in" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <Helmet>
        <title>{isRTL ? 'الأسئلة الشائعة | بيرفيوم هوب قطر' : 'Frequently Asked Questions | PerfumeHub Qatar'}</title>
        <meta name="description" content={isRTL ? 'إجابات على الأسئلة الشائعة حول شراء العطور الأصلية، الشحن داخل الدوحة، والدفع في قطر.' : 'Find answers to frequently asked questions about authentic perfumes, same-day shipping in Doha, and payments in Qatar.'} />
        <link rel="canonical" href="https://perfumehubqa.com/faq" />
        <meta property="og:title" content={isRTL ? 'الأسئلة الشائعة | بيرفيوم هوب قطر' : 'Frequently Asked Questions | PerfumeHub Qatar'} />
        <meta property="og:url" content="https://perfumehubqa.com/faq" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
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
