import React, { useState, useContext, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShopContext } from '../../context/ShopContext';
import ProductCard from '../../components/ProductCard/ProductCard';
import './PerfumeHubAI.css';
import { Sparkles, ArrowRight, ArrowLeft, RefreshCw, Zap, Moon, Sun, ShoppingBag, MapPin, Copy, Check, MessageCircle } from 'lucide-react';

// Static Data moved outside component for stability and performance
const QUESTIONS = [
    {
        id: 'gender',
        title: 'Who is this fragrance for?',
        options: [
            { id: 'men', label: 'For Men', icon: '♂️' },
            { id: 'women', label: 'For Women', icon: '♀️' },
            { id: 'unisex', label: 'Unisex', icon: '⚧️' }
        ]
    },
    {
        id: 'profile',
        title: 'Which scent profile do you prefer?',
        options: [
            { id: 'woody', label: 'Woody & Earthy', icon: '🌲', expert: true },
            { id: 'floral', label: 'Floral & Sweet', icon: '🌸', expert: true },
            { id: 'arabic', label: 'Arabic & Oriental', icon: '🕌', expert: true },
            { id: 'spicy', label: 'Spicy & Bold', icon: '🌶️', expert: true },
            { id: 'fresh', label: 'Fresh & Citrus', icon: '🌊', expert: true },
            { id: 'gourmand', label: 'Gourmand (Sweet/Foody)', icon: '🧁', expert: true }
        ]
    },
    {
        id: 'vibe',
        title: 'What is your desired vibe?',
        expertOnly: true,
        options: [
            { id: 'elegant', label: 'Elegant & Sophisticated', icon: '🎩' },
            { id: 'bold', label: 'Bold & Rebellious', icon: '🤘' },
            { id: 'romantic', label: 'Romantic & Soft', icon: '💖' },
            { id: 'mysterious', label: 'Mysterious & Deep', icon: '🌑' }
        ]
    },
    {
        id: 'note',
        title: 'Which key note do you love?',
        expertOnly: true,
        options: [
            { id: 'oud', label: 'Oud / Agarwood', icon: '🪵' },
            { id: 'vanilla', label: 'Vanilla / Sweet', icon: '🍦' },
            { id: 'rose', label: 'Rose / Jasmine', icon: '🌹' },
            { id: 'citrus', label: 'Lemon / Bergamot', icon: '🍋' },
            { id: 'musk', label: 'Musk / Clean', icon: '🫧' }
        ]
    },
    {
        id: 'season',
        title: 'When will you be wearing this?',
        expertOnly: true,
        options: [
            { id: 'winter', label: 'Cold / Winter', icon: '❄️' },
            { id: 'summer', label: 'Warm / Summer', icon: '☀️' },
            { id: 'all', label: 'All Seasons', icon: '📅' }
        ]
    },
    {
        id: 'occasion',
        title: 'On what occasion?',
        options: [
            { id: 'daily', label: 'Daily / Office', icon: <Sun size={32} /> },
            { id: 'night', label: 'Night / Events', icon: <Moon size={32} /> },
            { id: 'sporty', label: 'Sporty / Active', icon: <Zap size={32} /> }
        ]
    }
];

const PROFILE_METADATA = {
    woody: {
        en: 'Royal Woody & Earthy Connoisseur',
        ar: 'عاشق العطور الخشبية والترابية الملكية',
        accords: 'Cedarwood • Royal Agarwood • Vetiver • Cashmeran',
        longevity: '8 – 12 Hours (Extrait de Parfum)',
        sillage: 'Strong & Magnetic (Leaves a memorable trail)'
    },
    arabic: {
        en: 'Imperial Arabian Oud & Amber Sovereign',
        ar: 'أمير العطور الشرقية والعود الملكي المعتق',
        accords: 'Dehn El Oud • Ambergris • Taif Rose • White Musk',
        longevity: '10 – 14 Hours (Royal Pure Essence)',
        sillage: 'Enveloping & Majestic (Supreme Gulf projection)'
    },
    floral: {
        en: 'Radiant Haute Florale & Rose Elysium',
        ar: 'عشاق النفحات الزهرية والورد الفاتن',
        accords: 'Damask Rose • Grasse Jasmine • Peony • Madagascan Vanilla',
        longevity: '7 – 10 Hours (Eau de Parfum)',
        sillage: 'Delicate to Radiant (Leaves an aura of elegance)'
    },
    fresh: {
        en: 'Azure Mediterranean & Citrus Luminary',
        ar: 'عشاق الانتعاش الحمضي والبحري الخالص',
        accords: 'Calabrian Bergamot • Sea Breeze • Juniper • Crisp Musk',
        longevity: '6 – 8 Hours (Eau de Parfum Fresh)',
        sillage: 'Crisp & Invigorating (Uplifting proximity)'
    },
    spicy: {
        en: 'Smoky Warm Spices & Velvet Leather Icon',
        ar: 'عشاق التوابل الحارة والجلود المخملية',
        accords: 'Cardamom • Cinnamon • Smoked Incense • Leather Accord',
        longevity: '8 – 12 Hours (Intense Nocturne)',
        sillage: 'Intense & Seductive (Nocturnal presence)'
    },
    gourmand: {
        en: 'Opulent Gourmand & Ambered Vanilla Muse',
        ar: 'عشاق الفانيليا والروائح السكرية الدافئة',
        accords: 'Madagascar Vanilla • Caramel Toffee • Roasted Tonka • Cocoa',
        longevity: '8 – 12 Hours (Comforting Elixir)',
        sillage: 'Intimate to Enveloping (Irresistibly delicious)'
    }
};

const PerfumeHubAI = () => {
    const { products, perfumeProducts } = useContext(ShopContext);
    const outletCtx = useOutletContext();
    const { t, i18n } = useTranslation();
    const isRTL = outletCtx?.isRTL || i18n.language === 'ar' || document.documentElement.dir === 'rtl';
    const [step, setStep] = useState(0); // 0: Start, 1..N: Questions, Loading, Results
    const [isExpertMode, setIsExpertMode] = useState(false);
    const [copied, setCopied] = useState(false);
    const [answers, setAnswers] = useState({
        gender: '',
        profile: '',
        occasion: '',
        vibe: '',
        note: '',
        season: '',
        level: ''
    });
    const [recommendations, setRecommendations] = useState([]);

    const currentQuestions = isExpertMode ? QUESTIONS : QUESTIONS.filter(q => !q.expertOnly);

    const handleAnswer = (questionId, optionId) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleNext = () => {
        if (step < currentQuestions.length) {
            setStep(step + 1);
        } else {
            setStep(10); // Loading state
            findRecommendations();
        }
    };

    const findRecommendations = () => {
        setStep(10); // Ensure loading is visible

        setTimeout(() => {
            const candidatePool = (perfumeProducts && perfumeProducts.length > 0) ? perfumeProducts : products;

            // In-store fragrance matching against live catalog
            const scored = candidatePool.map(p => {
                let score = 0;
                // Gender match
                const gender = (p.gender || '').toLowerCase();
                const reqGender = (answers.gender || 'unisex').toLowerCase();
                const genderMatch = reqGender === 'unisex' || gender === 'unisex' || gender === reqGender;
                if (!genderMatch) return null;

                // Category & Profile match
                const pCats = (Array.isArray(p.category) ? p.category.join(' ') : String(p.category || '')).toLowerCase();
                const reqProfile = (answers.profile || '').toLowerCase();
                if (reqProfile && (pCats.includes(reqProfile) || (reqProfile === 'arabic' && pCats.includes('oriental')))) {
                    score += 6;
                }

                // Notes match
                const pNotesStr = [
                    p.topNotes,
                    p.middleNotes,
                    p.baseNotes,
                    Array.isArray(p.notes) ? p.notes.join(' ') : p.notes,
                    p.name,
                    p.description
                ].filter(Boolean).join(' ').toLowerCase();

                // Profile thematic notes affinity
                const profileKeywords = {
                    woody: ['cedar', 'sandalwood', 'vetiver', 'patchouli', 'wood', 'oud', 'amber'],
                    arabic: ['oud', 'agarwood', 'amber', 'musk', 'taif', 'rose', 'oriental', 'bakhoor', 'frankincense'],
                    floral: ['rose', 'jasmine', 'iris', 'peony', 'floral', 'orange blossom', 'neroli'],
                    fresh: ['citrus', 'bergamot', 'marine', 'lemon', 'mandarin', 'aqua', 'mint', 'grapefruit'],
                    spicy: ['cardamom', 'cinnamon', 'pepper', 'saffron', 'leather', 'spicy', 'smoke'],
                    gourmand: ['vanilla', 'caramel', 'tonka', 'chocolate', 'coffee', 'sweet', 'praline']
                };

                const targetKeywords = profileKeywords[reqProfile] || [];
                const matchedNotesCount = targetKeywords.filter(kw => pNotesStr.includes(kw)).length;
                score += Math.min(matchedNotesCount * 2, 8);

                if (isExpertMode) {
                    if (answers.note && pNotesStr.includes(answers.note.toLowerCase())) score += 5;
                    const pVibes = Array.isArray(p.vibes) ? p.vibes.map(v => String(v).toLowerCase()) : [];
                    if (answers.vibe && (pVibes.includes(answers.vibe.toLowerCase()) || pNotesStr.includes(answers.vibe.toLowerCase()))) score += 4;
                    const pSeasons = Array.isArray(p.seasons) ? p.seasons.map(s => String(s).toLowerCase()) : [];
                    if (answers.season && answers.season !== 'all' && (pSeasons.includes(answers.season.toLowerCase()) || pSeasons.includes('all'))) score += 3;
                }

                const pOccasions = Array.isArray(p.occasions) ? p.occasions.map(o => String(o).toLowerCase()) : [];
                if (answers.occasion && (pOccasions.includes(answers.occasion.toLowerCase()) || pNotesStr.includes(answers.occasion.toLowerCase()))) score += 3;

                // Check stock availability
                const hasStock = Number(p.stock) > 0 || (Array.isArray(p.inventories) && p.inventories.some(inv => Number(inv.stock) > 0));
                if (hasStock) score += 4;

                // Assign boutique location
                let boutique = isRTL ? 'متوفر في بوتيك سوق الجبر وبوتيك لوسيل مارينا' : 'Available at Souq Al Jabor & Lusail Marina';
                if (Array.isArray(p.inventories) && p.inventories.length > 0) {
                    const activeInv = p.inventories.find(inv => Number(inv.stock) > 0 && inv.shop_name);
                    if (activeInv?.shop_name) {
                        boutique = isRTL ? `متوفر في ${activeInv.shop_name}` : `In Stock at ${activeInv.shop_name}`;
                    }
                } else if (p.shop_name) {
                    boutique = isRTL ? `متوفر في ${p.shop_name}` : `In Stock at ${p.shop_name}`;
                }

                // Compute luxury match percentage (88% to 99%)
                const matchPct = Math.min(99, Math.max(86, 80 + Math.round(score * 2.2)));

                return {
                    product: { ...p, boutiqueLocation: boutique, matchPercentage: matchPct },
                    score
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score);

            const topRecs = scored.slice(0, 4).map(x => x.product);

            // Fallback if very few matches: take general fragrances of correct gender
            if (topRecs.length === 0) {
                const fallback = candidatePool
                    .filter(p => answers.gender === 'unisex' || !p.gender || p.gender === 'unisex' || p.gender === answers.gender)
                    .slice(0, 4)
                    .map(p => ({
                        ...p,
                        boutiqueLocation: isRTL ? 'متوفر في بوتيك سوق الجبر وبوتيك لوسيل مارينا' : 'Available at Souq Al Jabor & Lusail Marina',
                        matchPercentage: 92
                    }));
                setRecommendations(fallback);
            } else {
                setRecommendations(topRecs);
            }

            // Save Scent DNA
            try {
                const profileMeta = PROFILE_METADATA[answers.profile] || PROFILE_METADATA.arabic;
                const scentDNA = {
                    gender: answers.gender || 'unisex',
                    primaryFamily: answers.profile || 'arabic',
                    profileTitleEn: profileMeta.en,
                    profileTitleAr: profileMeta.ar,
                    accords: profileMeta.accords,
                    longevity: profileMeta.longevity,
                    sillage: profileMeta.sillage,
                    breakdown: {
                        woody: answers.profile === 'woody' ? 45 : (answers.note === 'oud' ? 35 : 15),
                        oriental: answers.profile === 'arabic' ? 50 : (answers.note === 'oud' || answers.note === 'vanilla' ? 30 : 20),
                        fresh: answers.profile === 'fresh' ? 45 : (answers.note === 'citrus' ? 30 : 15),
                        floral: answers.profile === 'floral' ? 45 : (answers.note === 'rose' ? 35 : 15),
                        gourmand: answers.profile === 'gourmand' ? 45 : (answers.note === 'vanilla' ? 25 : 10)
                    },
                    keyNotes: [answers.note || 'oud', 'amber', 'bergamot', 'musk'].filter(Boolean),
                    vibe: answers.vibe || 'elegant',
                    season: answers.season || 'all',
                    occasion: answers.occasion || 'daily',
                    timestamp: Date.now()
                };
                localStorage.setItem('perfumehub_scent_dna', JSON.stringify(scentDNA));
            } catch (e) {
                console.error("Failed to save scent DNA:", e);
            }

            setStep(11);
        }, 1500);
    };

    const resetQuiz = () => {
        setStep(0);
        setIsExpertMode(false);
        setAnswers({ gender: '', profile: '', occasion: '', vibe: '', note: '', season: '', level: '' });
    };

    const startExpertMode = () => {
        setIsExpertMode(true);
        setStep(1);
    };

    const handleCopyShare = () => {
        const shareUrl = `${window.location.origin}/ai-advisor`;
        navigator.clipboard?.writeText?.(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const currentProfileMeta = PROFILE_METADATA[answers.profile] || PROFILE_METADATA.arabic;
    const whatsappText = encodeURIComponent(
        isRTL 
        ? `✨ بصمتي العطرية الملكية من PerfumeHub:\n👑 ${currentProfileMeta.ar}\n🌿 التوليفة: ${currentProfileMeta.accords}\n⏳ الثبات: ${currentProfileMeta.longevity}\n\nاكتشف عطرك الملكي عبر جني العطور:\n${window.location.origin}/ai-advisor`
        : `✨ My Luxury Scent DNA on PerfumeHub:\n👑 ${currentProfileMeta.en}\n🌿 Accords: ${currentProfileMeta.accords}\n⏳ Longevity: ${currentProfileMeta.longevity}\n\nDiscover your bespoke fragrance signature:\n${window.location.origin}/ai-advisor`
    );
    const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappText}`;

    return (
        <div className="ai-advisor-container">
            <div className="scent-aura-bg">
                {/* Shimmering Beams */}
                <div className="shimmer-beam" style={{ animationDelay: '0s' }}></div>
                <div className="shimmer-beam" style={{ animationDelay: '-7s', opacity: 0.5 }}></div>

                {/* Aura Bloom Particles (Slow Gradients) */}
                <div className="aura-particle" style={{ '--x': '150px', '--y': '100px', '--duration': '15s', top: '5%', left: '10%', width: '500px', height: '500px' }}></div>
                <div className="aura-particle" style={{ '--x': '-100px', '--y': '150px', '--duration': '20s', bottom: '10%', right: '5%', width: '600px', height: '600px' }}></div>
                
                {/* Twinkling Gold Dust */}
                {React.useMemo(() => [...Array(20)].map((_, i) => (
                    <div 
                        key={i} 
                        className="gold-dust" 
                        style={{ 
                            top: `${Math.random() * 100}%`, 
                            left: `${Math.random() * 100}%`,
                            '--duration': `${5 + Math.random() * 10}s`,
                            '--delay': `-${Math.random() * 10}s`
                        }}
                    ></div>
                )), [])}
            </div>
            
            <div className="ai-header" style={{ position: 'relative', zIndex: 2 }}>
                <Sparkles className="shine-icon" size={48} color="#d4af37" />
                <h1>{isRTL ? 'جني العطور' : 'Scent Genie'}</h1>
                <p>{isRTL ? 'دع جني العطور يحلل تفضيلاتك ويرشح لك عطرك المميز والفريد.' : 'Let Scent Genie curate your signature scent. Perfect for gifts or personal discovery.'}</p>
            </div>

            {step === 0 && (
                <div className="quiz-card start-card">
                    <div className="expert-badge">{isRTL ? 'جديد: وضع الخبير' : 'NEW: EXPERT MODE'}</div>
                    <h2>{isRTL ? 'جد عطرك المثالي' : 'Find Your Perfect Match'}</h2>
                    <p>{isRTL ? 'اكتشف العطور المصممة خصيصاً لتناسب شخصيتك وأسلوبك الفريد.' : 'Discover fragrances tailored specifically to your personality and style.'}</p>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px', flexWrap: 'wrap' }}>
                        <button className="btn-secondary" onClick={() => setStep(1)}>
                            {isRTL ? 'وضع الاستكشاف' : 'Discovery Mode'}
                        </button>
                        <button className="btn-primary" onClick={startExpertMode}>
                            {isRTL ? 'وضع الخبير' : 'Expert Mode'} <Sparkles size={16} />
                        </button>
                    </div>
                </div>
            )}

            {step >= 1 && step <= currentQuestions.length && (
                <div className="quiz-card">
                    <div className="quiz-progress" style={{ width: `${(step / currentQuestions.length) * 100}%` }}></div>
                    <div className="question-section">
                        <div className="step-count">{isRTL ? `السؤال ${step} من ${currentQuestions.length}` : `Question ${step} of ${currentQuestions.length}`}</div>
                        <h2>{currentQuestions[step - 1].title}</h2>
                        <div className="options-grid">
                            {currentQuestions[step - 1].options.map(option => (
                                <button
                                    key={option.id}
                                    className={`option-btn ${answers[currentQuestions[step - 1].id] === option.id ? 'selected' : ''}`}
                                    onClick={() => handleAnswer(currentQuestions[step - 1].id, option.id)}
                                >
                                    <div className="option-icon">
                                        {option.icon}
                                    </div>
                                    <span className="option-label">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="quiz-nav">
                        <button className="btn-secondary" onClick={() => (step === 1 ? setStep(0) : setStep(step - 1))}>
                            <ArrowLeft size={18} style={{ marginRight: isRTL ? 0 : '8px', marginLeft: isRTL ? '8px' : 0 }} /> {isRTL ? 'رجوع' : 'Back'}
                        </button>
                        {answers[currentQuestions[step - 1].id] && (
                            <button className="btn-primary" onClick={handleNext}>
                                {step === currentQuestions.length ? (isRTL ? 'اكتشف عطري' : 'Find My Scent') : (isRTL ? 'التالي' : 'Next')} <ArrowRight size={18} style={{ marginLeft: isRTL ? 0 : '8px', marginRight: isRTL ? '8px' : 0 }} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {step === 10 && (
                <div className="quiz-card loading-container">
                    <div className="loader"></div>
                    <h3>{isRTL ? 'جاري استشارة جني العطور...' : (isExpertMode ? 'Scent Genie Expert Analysis...' : 'Consulting the Scent Genie...')}</h3>
                    <p>{isRTL ? 'تحليل بيانات العطور ومطابقة ملف شخصيتك العطرية...' : 'Analyzing high-level scent data and matching your personality profile.'}</p>
                </div>
            )}

            {step === 11 && (
                <div className="results-section">
                    {/* Bespoke Scent DNA Card */}
                    <div className="scent-dna-card">
                        <div className="scent-dna-badge">
                            <Sparkles size={16} /> {isRTL ? 'ملفك العطري الحصري • Scent DNA' : 'Bespoke Olfactive DNA Signature'}
                        </div>
                        <h2 className="scent-dna-title">{isRTL ? currentProfileMeta.ar : currentProfileMeta.en}</h2>
                        <p className="scent-dna-desc">
                            {isRTL 
                                ? 'تم تحليل ذوقك العطري بدقة عبر تقنيات جني العطور لمطابقة أفخم التركيبات المتوفرة حصرياً في بوتيكاتنا.'
                                : 'Meticulously curated through multi-dimensional olfactory analysis, harmonizing with your personal aura and verified in-stock at our Qatar boutiques.'}
                        </p>

                        <div className="scent-dna-metrics">
                            <div className="dna-metric-item">
                                <span className="dna-metric-label">{isRTL ? 'النفحات الأساسية' : 'Key Accords'}</span>
                                <span className="dna-metric-value">{currentProfileMeta.accords}</span>
                            </div>
                            <div className="dna-metric-item">
                                <span className="dna-metric-label">{isRTL ? 'الثبات والتركيز' : 'Longevity Profile'}</span>
                                <span className="dna-metric-value">{currentProfileMeta.longevity}</span>
                            </div>
                            <div className="dna-metric-item">
                                <span className="dna-metric-label">{isRTL ? 'الفوحان والانتشار' : 'Sillage Projection'}</span>
                                <span className="dna-metric-value">{currentProfileMeta.sillage}</span>
                            </div>
                        </div>

                        <div className="scent-dna-actions">
                            <a 
                                href={whatsappUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn-whatsapp-share"
                            >
                                <MessageCircle size={18} /> {isRTL ? 'مشاركة عبر واتساب' : 'Share Scent DNA on WhatsApp'}
                            </a>
                            <button className="btn-copy-share" onClick={handleCopyShare}>
                                {copied ? <Check size={18} color="#22c55e" /> : <Copy size={18} />}
                                {copied ? (isRTL ? 'تم النسخ!' : 'Copied!') : (isRTL ? 'نسخ الرابط' : 'Copy Share Link')}
                            </button>
                        </div>
                    </div>

                    {/* Verified In-Stock Store Recommendations */}
                    <div className="store-recommendations">
                        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                            <div className="instock-header-badge">
                                <MapPin size={14} /> {isRTL ? 'متوفر حالياً للاستلام الفوري والتوصيل' : 'VERIFIED IN STOCK • SOUQ AL JABOR & LUSAIL MARINA'}
                            </div>
                            <h3 className="section-subtitle" style={{ fontSize: '1.9rem', color: '#f3e5ab' }}>
                                {isRTL ? 'العطور المطابقة لشخصيتك العطرية' : 'Your Signature Store Matches'}
                            </h3>
                            <p style={{ color: '#94a3b8', maxWidth: '640px', margin: '0 auto', fontSize: '0.95rem' }}>
                                {isRTL 
                                    ? 'هذه التحف العطرية متوفرة الآن في بوتيكات الدوحة وجاهزة للاستلام الفوري أو التوصيل المبرد في نفس اليوم.'
                                    : 'Every recommended masterpiece is active in our Qatar boutique inventory and ready for 1-hour pickup or same-day climate-controlled delivery.'}
                            </p>
                        </div>

                        <div className="recommendation-grid">
                            {recommendations.map(product => (
                                <div key={product.id} className="rec-card-wrapper">
                                    <ProductCard product={product} />
                                    <div className="rec-boutique-tag">
                                        <MapPin size={14} color="#d4af37" />
                                        <span>{product.boutiqueLocation || (isRTL ? 'متوفر في بوتيك سوق الجبر' : 'Available at Souq Al Jabor')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '50px' }}>
                        <button className="btn-secondary" onClick={resetQuiz}>
                            <RefreshCw size={18} style={{ marginRight: isRTL ? 0 : '8px', marginLeft: isRTL ? '8px' : 0 }} /> 
                            {isRTL ? 'إعادة الاختبار' : 'Retake Scent Quiz'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerfumeHubAI;
