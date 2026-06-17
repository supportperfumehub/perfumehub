import React, { useState, useEffect, useContext } from 'react';
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ProductCard from '../../components/ProductCard/ProductCard';
import { ShopContext } from '../../context/ShopContext';
import { SlidersHorizontal, Search, X, RotateCcw } from 'lucide-react';
import './Shop.css';

// Import category banners
import allBanner from '../../assets/shop_header_all.png';
import menBanner from '../../assets/shop_header_men.png';
import womenBanner from '../../assets/shop_header_women.png';
import arabicBanner from '../../assets/shop_header_arabic.png';

const POPULAR_BRANDS = [
    'Chanel', 'Dior', 'Tom Ford', 'Gucci', 'Versace',
    'Armani', 'Prada', 'Burberry', 'Yves Saint Laurent', 'Givenchy',
    'Lancôme', 'Hermès', 'Valentino', 'Calvin Klein', 'Hugo Boss',
    'Creed', 'Jo Malone', 'Maison Margiela', 'Lattafa', 'Arabian Oud'
];

const Shop = () => {
    const { isRTL } = useOutletContext();
    const { type } = useParams(); // For category pages
    const [searchParams] = useSearchParams();
    const shopIdFilter = searchParams.get('shop_id');
    const { products: mockProducts } = useContext(ShopContext);

    const [products, setProducts] = useState(mockProducts);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedMaterials, setSelectedMaterials] = useState([]);
    const [sortType, setSortType] = useState('default');
    const [searchQuery, setSearchQuery] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [activeGender, setActiveGender] = useState('all');
    const [brandSearch, setBrandSearch] = useState('');
    const [showResetModal, setShowResetModal] = useState(false);
    const [visibleCount, setVisibleCount] = useState(20);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeSubcategory, setActiveSubcategory] = useState('all');

    // Dynamically compute brands from mockProducts based on category
    const categoryBrands = React.useMemo(() => {
        let items = [...mockProducts];
        if (type) {
            items = items.filter(p =>
                (Array.isArray(p.category) && (p.category.includes(type) || p.category.includes(type.replace('-', '')))) ||
                p.gender === type
            );
        }
        return [...new Set(items.map(p => p.brand))].filter(Boolean).sort();
    }, [mockProducts, type]);

    const availableSizes = React.useMemo(() => {
        let items = mockProducts.filter(p => Array.isArray(p.category) && p.category.includes('fashion'));
        let sizes = new Set();
        items.forEach(p => {
            if (Array.isArray(p.size)) {
                p.size.forEach(s => sizes.add(typeof s === 'object' ? s.name : s));
            } else if (p.size) {
                sizes.add(p.size);
            }
        });
        return Array.from(sizes).sort();
    }, [mockProducts]);

    const availableColors = React.useMemo(() => {
        let items = mockProducts.filter(p => Array.isArray(p.category) && p.category.includes('fashion'));
        let colors = new Set();
        items.forEach(p => {
            const color = p.attributes?.color || p.attributes?.colors;
            if (Array.isArray(color)) color.forEach(c => colors.add(c));
            else if (color) colors.add(color);
        });
        return Array.from(colors).sort();
    }, [mockProducts]);

    const availableMaterials = React.useMemo(() => {
        let items = mockProducts.filter(p => Array.isArray(p.category) && p.category.includes('jewellery'));
        let materials = new Set();
        items.forEach(p => {
            const mat = p.attributes?.material || p.attributes?.materials;
            if (Array.isArray(mat)) mat.forEach(m => materials.add(m));
            else if (mat) materials.add(mat);
        });
        return Array.from(materials).sort();
    }, [mockProducts]);

    useEffect(() => {
        let result = [...mockProducts];

        // Filter by category param
        if (type) {
            result = result.filter(p =>
                (Array.isArray(p.category) && (p.category.includes(type) || p.category.includes(type.replace('-', '')))) ||
                p.gender === type
            );
        }

        // Subcategory Filter (Fashion only)
        if (type === 'fashion' && activeSubcategory !== 'all') {
            result = result.filter(p => Array.isArray(p.category) && p.category.includes(activeSubcategory));
        }

        // Filter by shop ID
        if (shopIdFilter) {
            result = result.filter(p => 
                String(p.shop_id) === String(shopIdFilter) || 
                String(p.vendor_id) === String(shopIdFilter) ||
                p.shop_id === 'core' || p.shop_id === null
            );
        }

        // Search Query
        if (searchQuery.trim() !== '') {
            result = result.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Price Filter
        if (minPrice !== '') {
            result = result.filter(p => p.price >= Number(minPrice));
        }
        if (maxPrice !== '') {
            result = result.filter(p => p.price <= Number(maxPrice));
        }

        // Gender Filter (Explicit override if not all)
        if (activeGender !== 'all') {
            result = result.filter(p => p.gender === activeGender);
        }

        // Filter by brand
        if (selectedBrands.length > 0) {
            result = result.filter(p => selectedBrands.includes(p.brand.toLowerCase()));
        }

        // Size Filter
        if (selectedSizes.length > 0) {
            result = result.filter(p => {
                const sizes = Array.isArray(p.size)
                    ? p.size.map(s => typeof s === 'object' ? s.name : s)
                    : [p.size];
                return selectedSizes.some(size => sizes.some(ps => String(ps).toLowerCase().includes(size.toLowerCase())));
            });
        }

        // Color Filter
        if (selectedColors.length > 0) {
            result = result.filter(p => {
                const color = p.attributes?.color || p.attributes?.colors;
                if (!color) return false;
                const colors = Array.isArray(color) ? color.map(c => String(c).toLowerCase()) : [String(color).toLowerCase()];
                return selectedColors.some(c => colors.some(pc => pc.includes(c.toLowerCase())));
            });
        }

        // Material Filter
        if (selectedMaterials.length > 0) {
            result = result.filter(p => {
                const material = p.attributes?.material || p.attributes?.materials;
                if (!material) return false;
                const materials = Array.isArray(material) ? material.map(m => String(m).toLowerCase()) : [String(material).toLowerCase()];
                return selectedMaterials.some(m => materials.some(pm => pm.includes(m.toLowerCase())));
            });
        }

        // Sort products
        if (sortType === 'price-asc') {
            result.sort((a, b) => a.price - b.price);
        } else if (sortType === 'price-desc') {
            result.sort((a, b) => b.price - a.price);
        } else if (sortType === 'newest') {
            result.sort((a, b) => b.id - a.id); // Assuming higher ID is newer
        }

        setProducts(result);
        setVisibleCount(20); // Reset visible count when filters change
    }, [type, shopIdFilter, selectedBrands, selectedSizes, selectedColors, selectedMaterials, sortType, searchQuery, minPrice, maxPrice, activeGender, mockProducts, activeSubcategory]);

    useEffect(() => {
        window.scrollTo(0, 0);
        setActiveSubcategory('all'); // Reset subcategory when page category changes
    }, [type]);

    const handleFilter = (brandName) => {
        if (brandName === 'all') {
            setSelectedBrands([]);
        } else {
            const lowerBrand = brandName.toLowerCase();
            setSelectedBrands(prev => 
                prev.includes(lowerBrand) 
                    ? prev.filter(b => b !== lowerBrand) 
                    : [...prev, lowerBrand]
            );
        }
    };

    const getPageTitle = () => {
        if (!type) return isRTL ? 'جميع العطور' : 'All Perfumes';
        const titles = {
            'men': isRTL ? 'مجموعة الأزياء' : 'Fashion Collection',
            'fashion': isRTL ? 'مجموعة الأزياء' : 'Fashion Collection',
            'women': isRTL ? 'مجموعة المجوهرات' : 'Jewellery Collection',
            'jewellery': isRTL ? 'مجموعة المجوهرات' : 'Jewellery Collection',
            'arabic': isRTL ? 'صناديق الهدايا' : 'Gift Box',
            'gift-box': isRTL ? 'صناديق الهدايا' : 'Gift Box',
            'abaya': isRTL ? 'مجموعة العبايات الحصرية' : 'Exclusive Abaya Collection',
        };
        return titles[type] || (isRTL ? 'التسوق' : 'Shop');
    };

    const getPageSubtitle = () => {
        if (type === 'fashion') {
            return isRTL ? 'تصفح مجموعتنا الحصرية من الملابس والأزياء الفاخرة.' : 'Browse our exclusive collection of luxury apparel and fashion.';
        }
        if (type === 'abaya') {
            return isRTL ? 'تصفح مجموعتنا الحصرية من العبايات الفاخرة المصممة بأيدي أشهر المصممين.' : 'Browse our premium hand-crafted luxury Abayas from Qatar\'s top designers.';
        }
        if (type === 'jewellery') {
            return isRTL ? 'اكتشف أرقى تصميمات المجوهرات والساعات الفاخرة.' : 'Discover the finest designs of luxury jewellery and watches.';
        }
        if (type === 'gift-box' || type === 'giftbox') {
            return isRTL ? 'صناديق هدايا فاخرة ومخصصة لمختلف المناسبات.' : 'Luxury curated gift boxes tailored for every special occasion.';
        }
        return isRTL ? 'تصفح مجموعتنا الحصرية من العطور والمنتجات الفاخرة.' : 'Browse our exclusive collection of hand-picked luxury items.';
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setMinPrice('');
        setMaxPrice('');
        setActiveGender('all');
        setSelectedBrands([]);
        setSelectedSizes([]);
        setSelectedColors([]);
        setSelectedMaterials([]);
        setBrandSearch('');
        setActiveSubcategory('all');
        setShowResetModal(false);
    };

    const getHeaderBanner = () => {
        if (!type) return allBanner;
        const banners = {
            'men': menBanner,
            'fashion': menBanner,
            'women': womenBanner,
            'jewellery': womenBanner,
            'arabic': arabicBanner,
            'gift-box': arabicBanner,
            'abaya': womenBanner,
        };
        return banners[type] || allBanner;
    };

    return (
        <div className="shop-page">
            <Helmet>
                <title>{isRTL ? 'المتجر | بيرفيوم هوب - عطور وفخامة في قطر' : 'Shop | PerfumeHub - Luxury Fragrances & Marketplace Qatar'}</title>
                <meta name="description" content={isRTL ? 'تسوق أفضل العطور والساعات والمجوهرات في قطر. وجهتك الأولى للفخامة مع توصيل سريع في الدوحة.' : 'Shop the best perfumes, watches, and jewellery in Qatar. Your premier destination for luxury with fast delivery in Doha.'} />
                <link rel="canonical" href="https://perfumehubqa.com/shop" />
            </Helmet>
            <div 
                className="shop-header" 
                style={{ 
                    backgroundColor: '#1a1a1a',
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("${getHeaderBanner()}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="container text-center">
                    <h1 className="header-title">{getPageTitle()}</h1>
                    <p className="shop-subtitle">
                        {getPageSubtitle()}
                    </p>
                </div>
            </div>

            <div className="container mobile-filter-bar">
                <button className="mobile-filter-btn" onClick={() => setIsFilterOpen(true)}>
                    <SlidersHorizontal size={18} />
                    {isRTL ? 'تصفية المنتجات' : 'Filter Products'}
                </button>
            </div>

            <div className={`sidebar-backdrop ${isFilterOpen ? 'active' : ''}`} onClick={() => setIsFilterOpen(false)} />

            <div className="container shop-container section">
                <div className={`shop-sidebar ${isFilterOpen ? 'mobile-open' : ''}`}>
                    <div className="sidebar-mobile-header">
                        <h3>{isRTL ? 'تصفية النتائج' : 'Filter Products'}</h3>
                        <div className="header-actions">
                            <button className="reset-btn-mobile" onClick={() => setShowResetModal(true)}>
                                <RotateCcw size={16} />
                                {isRTL ? 'إعادة تعيين' : 'Reset'}
                            </button>
                            <button className="close-sidebar" onClick={() => setIsFilterOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="sidebar-header-desktop pc-only">
                         <h3>{isRTL ? 'تصفية' : 'Filters'}</h3>
                         <button className="reset-btn-desktop" onClick={() => setShowResetModal(true)}>
                            <RotateCcw size={14} />
                            {isRTL ? 'مسح الكل' : 'Reset All'}
                         </button>
                    </div>

                    <div className="sidebar-content-area">
                        <div className="filter-block">
                            <h3 className="filter-title">
                                {isRTL ? 'بحث' : 'Search'}
                            </h3>
                            <div className="filter-content">
                                <input
                                    type="text"
                                    placeholder={type === 'fashion' ? (isRTL ? 'ابحث عن أزياء...' : 'Search fashion...') : type === 'jewellery' ? (isRTL ? 'ابحث عن مجوهرات...' : 'Search jewellery...') : type === 'gift-box' ? (isRTL ? 'ابحث عن صناديق هدايا...' : 'Search gift boxes...') : (isRTL ? 'ابحث عن عطر...' : 'Search perfume...')}
                                    className="search-input"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="filter-block">
                            <h3 className="filter-title">
                                {isRTL ? 'تصفية حسب السعر' : 'Price Filter'}
                            </h3>
                            <div className="filter-content">
                                <div className="price-filter">
                                    <input
                                        type="number"
                                        placeholder={isRTL ? 'الحد الأدنى' : 'Min'}
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                    />
                                    <span>-</span>
                                    <input
                                        type="number"
                                        placeholder={isRTL ? 'الحد الأقصى' : 'Max'}
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* FASHION ONLY FILTERS */}
                        {type === 'fashion' && availableSizes.length > 0 && (
                            <div className="filter-block animate-fade-in">
                                <h3 className="filter-title">
                                    {isRTL ? 'المقاس' : 'Sizes'}
                                </h3>
                                <div className="filter-content">
                                    <ul className="filter-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: 0 }}>
                                        {availableSizes.map(size => {
                                            const isSelected = selectedSizes.includes(size.toLowerCase());
                                            return (
                                                <li key={size} style={{ margin: 0, listStyle: 'none' }}>
                                                    <button
                                                        onClick={() => setSelectedSizes(prev => isSelected ? prev.filter(s => s !== size.toLowerCase()) : [...prev, size.toLowerCase()])}
                                                        style={{
                                                            padding: '6px 12px',
                                                            border: isSelected ? '1px solid var(--color-gold, #d4af37)' : '1px solid rgba(0,0,0,0.1)',
                                                            backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                                            color: isSelected ? 'var(--color-gold, #d4af37)' : 'inherit',
                                                            borderRadius: '20px',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {size}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {type === 'fashion' && availableColors.length > 0 && (
                            <div className="filter-block animate-fade-in">
                                <h3 className="filter-title">
                                    {isRTL ? 'اللون' : 'Colors'}
                                </h3>
                                <div className="filter-content">
                                    <ul className="filter-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: 0 }}>
                                        {availableColors.map(color => {
                                            const isSelected = selectedColors.includes(color.toLowerCase());
                                            return (
                                                <li key={color} style={{ margin: 0, listStyle: 'none' }}>
                                                    <button
                                                        onClick={() => setSelectedColors(prev => isSelected ? prev.filter(c => c !== color.toLowerCase()) : [...prev, color.toLowerCase()])}
                                                        style={{
                                                            padding: '6px 12px',
                                                            border: isSelected ? '1px solid var(--color-gold, #d4af37)' : '1px solid rgba(0,0,0,0.1)',
                                                            backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                                            color: isSelected ? 'var(--color-gold, #d4af37)' : 'inherit',
                                                            borderRadius: '20px',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {color}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* JEWELLERY ONLY FILTERS */}
                        {type === 'jewellery' && availableMaterials.length > 0 && (
                            <div className="filter-block animate-fade-in">
                                <h3 className="filter-title">
                                    {isRTL ? 'المواد' : 'Materials'}
                                </h3>
                                <div className="filter-content">
                                    <ul className="filter-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: 0 }}>
                                        {availableMaterials.map(mat => {
                                            const isSelected = selectedMaterials.includes(mat.toLowerCase());
                                            return (
                                                <li key={mat} style={{ margin: 0, listStyle: 'none' }}>
                                                    <button
                                                        onClick={() => setSelectedMaterials(prev => isSelected ? prev.filter(m => m !== mat.toLowerCase()) : [...prev, mat.toLowerCase()])}
                                                        style={{
                                                            padding: '6px 12px',
                                                            border: isSelected ? '1px solid var(--color-gold, #d4af37)' : '1px solid rgba(0,0,0,0.1)',
                                                            backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                                            color: isSelected ? 'var(--color-gold, #d4af37)' : 'inherit',
                                                            borderRadius: '20px',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {mat}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Gender Filter (Skip for gift box since they are usually unisex, otherwise show) */}
                        {type !== 'gift-box' && (
                            <div className="filter-block">
                                <h3 className="filter-title">
                                    {isRTL ? 'الجنس' : 'Gender'}
                                </h3>
                                <div className="filter-content">
                                    <ul className="filter-list">
                                        <li>
                                            <button
                                                className={activeGender === 'all' ? 'active' : ''}
                                                onClick={() => setActiveGender('all')}
                                            >
                                                {isRTL ? 'الكل' : 'All'}
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={activeGender === 'men' ? 'active' : ''}
                                                onClick={() => setActiveGender('men')}
                                            >
                                                {isRTL ? 'رجالي' : 'Men'}
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={activeGender === 'women' ? 'active' : ''}
                                                onClick={() => setActiveGender('women')}
                                            >
                                                {isRTL ? 'نسائي' : 'Women'}
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={activeGender === 'unisex' ? 'active' : ''}
                                                onClick={() => setActiveGender('unisex')}
                                            >
                                                {isRTL ? 'للجنسين' : 'Unisex'}
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Brands Filter (Adaptive based on computed brands) */}
                        {categoryBrands.length > 0 && (
                            <div className="filter-block">
                                <h3 className="filter-title">
                                    <SlidersHorizontal size={18} />
                                    {isRTL ? 'تصفية حسب الماركة' : 'Filter by Brand'}
                                </h3>

                                <div className="filter-content">
                                    <div className="brand-search-wrapper">
                                        <Search size={15} className="brand-search-icon" />
                                        <input
                                            type="text"
                                            className="brand-search-input"
                                            placeholder={isRTL ? 'ابحث عن ماركة...' : 'Search brand...'}
                                            value={brandSearch}
                                            onChange={(e) => setBrandSearch(e.target.value)}
                                        />
                                    </div>

                                    <ul className="filter-list brand-filter-list">
                                        {!brandSearch && (
                                            <li>
                                                <button
                                                    className={selectedBrands.length === 0 ? 'active' : ''}
                                                    onClick={() => handleFilter('all')}
                                                >
                                                    {isRTL ? 'الكل' : 'All Brands'}
                                                </button>
                                            </li>
                                        )}
                                        {categoryBrands
                                            .filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
                                            .map(brand => (
                                                <li key={brand}>
                                                    <button
                                                        className={selectedBrands.includes(brand.toLowerCase()) ? 'active' : ''}
                                                        onClick={() => handleFilter(brand.toLowerCase())}
                                                    >
                                                        <span className="brand-dot"></span>
                                                        {brand}
                                                    </button>
                                                </li>
                                            ))
                                        }
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="filter-mobile-footer mobile-only">
                        <button className="apply-filters-btn" onClick={() => setIsFilterOpen(false)}>
                            {isRTL ? 'تم' : 'Done'}
                        </button>
                    </div>
                </div>

                <div className="shop-content">
                    {/* Render subcategory pills for Fashion */}
                    {type === 'fashion' && (
                        <div className="subcategories-pills animate-fade-in" style={{
                            display: 'flex',
                            gap: '10px',
                            flexWrap: 'wrap',
                            marginBottom: '25px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            paddingBottom: '15px'
                        }}>
                            {[
                                { id: 'all', label: isRTL ? 'الكل' : 'All Fashion' },
                                { id: 'abaya', label: isRTL ? 'عبايات حصرية' : 'Exclusive Abayas' },
                                { id: 'clothing', label: isRTL ? 'ملابس' : 'Apparel' },
                                { id: 'accessories', label: isRTL ? 'إكسسوارات' : 'Accessories' },
                                { id: 'eyewear', label: isRTL ? 'نظارات' : 'Eyewear' }
                            ].map(pill => (
                                <button
                                    key={pill.id}
                                    className={`btn ${activeSubcategory === pill.id ? 'btn-gold' : 'btn-outline'}`}
                                    onClick={() => setActiveSubcategory(pill.id)}
                                    style={{
                                        padding: '8px 18px',
                                        fontSize: '0.85rem',
                                        borderRadius: '30px',
                                        borderWidth: '1px',
                                        backgroundColor: activeSubcategory === pill.id ? 'var(--color-gold)' : 'transparent',
                                        color: activeSubcategory === pill.id ? '#000000' : 'inherit',
                                        fontWeight: '700',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    {pill.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="shop-controls">
                        <span>
                            {isRTL
                                ? `عرض ${products.length} من المنتجات`
                                : `Showing ${products.length} products`}
                        </span>
                        <select className="sort-select" value={sortType} onChange={(e) => setSortType(e.target.value)}>
                            <option value="default">{isRTL ? 'الترتيب الافتراضي' : 'Default Sorting'}</option>
                            <option value="price-asc">{isRTL ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
                            <option value="price-desc">{isRTL ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
                            <option value="newest">{isRTL ? 'الأحدث' : 'Newest'}</option>
                        </select>
                    </div>

                    <div className="products-grid">
                        {products.length > 0 ? (
                            products.slice(0, visibleCount).map(product => (
                                <ProductCard key={product.id} product={product} isRTL={isRTL} />
                            ))
                        ) : (
                            <div className="no-products">
                                <p>{isRTL ? 'لا توجد منتجات مطابقة للبحث.' : 'No products match your criteria.'}</p>
                            </div>
                        )}
                    </div>

                    {visibleCount < products.length && (
                        <div className="load-more-container animate-fade-in">
                            <button 
                                className="load-more-btn" 
                                onClick={() => setVisibleCount(prev => prev + 20)}
                            >
                                <span>{isRTL ? 'عرض المزيد' : 'Load More'}</span>
                                <RotateCcw size={18} className="load-more-icon" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            {showResetModal && (
                <div className="reset-modal-overlay">
                    <div className="reset-modal-content">
                        <div className="reset-modal-icon">
                            <RotateCcw size={32} />
                        </div>
                        <h2>{isRTL ? 'مسح التصفية؟' : 'Clear All Filters?'}</h2>
                        <p>
                            {isRTL 
                                ? 'سيتم مسح جميع خيارات البحث والتصفية التي اخترتها.' 
                                : 'This will reset all your search and filter preferences.'}
                        </p>
                        <div className="reset-modal-actions">
                            <button className="reset-cancel-btn" onClick={() => setShowResetModal(false)}>
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button className="reset-confirm-btn" onClick={handleResetFilters}>
                                {isRTL ? 'مسح الكل' : 'Reset All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shop;
