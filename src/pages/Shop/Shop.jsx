import React, { useState, useEffect, useContext } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
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
    const { products: mockProducts } = useContext(ShopContext);

    const [products, setProducts] = useState(mockProducts);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [sortType, setSortType] = useState('default');
    const [searchQuery, setSearchQuery] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [activeGender, setActiveGender] = useState('all');
    const [brandSearch, setBrandSearch] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    useEffect(() => {
        let result = [...mockProducts];

        // Filter by category param
        if (type) {
            result = result.filter(p =>
                (p.category && p.category.includes(type)) || p.gender === type
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

        // Sort products
        if (sortType === 'price-asc') {
            result.sort((a, b) => a.price - b.price);
        } else if (sortType === 'price-desc') {
            result.sort((a, b) => b.price - a.price);
        } else if (sortType === 'newest') {
            result.sort((a, b) => b.id - a.id); // Assuming higher ID is newer
        }

        setProducts(result);
    }, [type, selectedBrands, sortType, searchQuery, minPrice, maxPrice, activeGender, mockProducts]);

    useEffect(() => {
        window.scrollTo(0, 0);
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
            'men': isRTL ? 'عطور رجالية' : 'Men Perfumes',
            'women': isRTL ? 'عطور نسائية' : 'Women Perfumes',
            'arabic': isRTL ? 'عطور عربية' : 'Arabic Collection',
        };
        return titles[type] || (isRTL ? 'التسوق' : 'Shop');
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setMinPrice('');
        setMaxPrice('');
        setActiveGender('all');
        setSelectedBrands([]);
        setBrandSearch('');
        setShowResetModal(false);
    };

    const getHeaderBanner = () => {
        if (!type) return allBanner;
        const banners = {
            'men': menBanner,
            'women': womenBanner,
            'arabic': arabicBanner,
        };
        return banners[type] || allBanner;
    };

    return (
        <div className="shop-page">
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
                        {isRTL
                            ? 'تصفح مجموعتنا الحصرية من العطور المختارة بعناية.'
                            : 'Browse our exclusive collection of hand-picked fragrances.'}
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
                                placeholder={isRTL ? 'ابحث عن عطر...' : 'Search perfume...'}
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

                    <div className="filter-block">
                        <h3 className="filter-title">
                            <SlidersHorizontal size={18} />
                            {isRTL ? 'تصفية حسب الماركة' : 'Filter by Brand'}
                        </h3>

                        <div className="filter-content">
                            {/* Brand Search Input */}
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

                            {/* Popular Brands List */}
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
                                {POPULAR_BRANDS
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
                    </div>

                    <div className="filter-mobile-footer mobile-only">
                        <button className="apply-filters-btn" onClick={() => setIsFilterOpen(false)}>
                            {isRTL ? 'تم' : 'Done'}
                        </button>
                    </div>
                </div>

                <div className="shop-content">
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
                            products.map(product => (
                                <ProductCard key={product.id} product={product} isRTL={isRTL} />
                            ))
                        ) : (
                            <div className="no-products">
                                <p>{isRTL ? 'لا توجد منتجات مطابقة للبحث.' : 'No products match your criteria.'}</p>
                            </div>
                        )}
                    </div>
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
