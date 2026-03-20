import React, { useContext, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProductCard from '../../components/ProductCard/ProductCard';
import Newsletter from '../../components/Newsletter/Newsletter';
import { ShopContext } from '../../context/ShopContext';
import brandStoryImg from '../../assets/logo_no_border.png';
import './Home.css';

const Home = () => {
    const { i18n, t } = useTranslation();
    const { isRTL } = useOutletContext();
    const { featuredProducts, newArrivals, mensProducts, womensProducts } = useContext(ShopContext);
    const [showAllCategories, setShowAllCategories] = useState(false);
    const [showAllNewArrivals, setShowAllNewArrivals] = useState(false);
    const [showAllMens, setShowAllMens] = useState(false);
    const [showAllWomens, setShowAllWomens] = useState(false);

    const categories = [
        {
            id: 'men',
            title: t('categories.men'),
            link: '/category/men',
            image: 'https://images.unsplash.com/photo-1582211594533-268f4f1edcb9?auto=format&fit=crop&q=80&w=800'
        },
        {
            id: 'women',
            title: t('categories.women'),
            link: '/category/women',
            image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800'
        },
        {
            id: 'arabic',
            title: t('categories.arabic'),
            link: '/category/arabic',
            image: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&q=80&w=800'
        },
        {
            id: 'brands',
            title: t('categories.brands'),
            link: '/brands',
            image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800'
        }
    ];

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-background"></div>
                <div className="hero-overlay"></div>
                <div className="container hero-content text-center animate-fade-in">
                    <span className="hero-subtitle">
                        {t('hero.subtitle')}
                    </span>
                    <h1 className="hero-title">
                        {t('hero.title')}
                    </h1>
                    <p className="hero-text">
                        {t('hero.text')}
                    </p>
                    <div className="hero-buttons">
                        <Link to="/shop" className="btn btn-gold">
                            {t('hero.shop_now')}
                        </Link>
                        <Link to="/ai-advisor" className="btn btn-outline" style={{ color: '#fff', borderColor: '#fff' }}>
                            {t('hero.scent_advisor')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Shop By Categories */}
            <section className="section container reveal">
                <div className="section-header text-center">
                    <h2 className="section-title">{t('categories.title')}</h2>
                    <p className="section-subtitle">
                        {t('categories.subtitle')}
                    </p>
                </div>

                <div className={`category-grid-wrapper${showAllCategories ? '' : ' collapsed'}`}>
                    <div className="category-grid">
                        {categories.map(category => (
                            <Link key={category.id} to={category.link} className="category-card">
                                <div className="category-image">
                                    <img src={category.image} alt={category.title} />
                                    <div className="category-overlay"></div>
                                </div>
                                <h3 className="category-title">{category.title}</h3>
                            </Link>
                        ))}
                    </div>
                    {!showAllCategories && <div className="category-grid-fade"></div>}
                </div>

                <div className="text-center categories-view-more">
                    <button
                        className="btn btn-outline"
                        onClick={() => setShowAllCategories(prev => !prev)}
                    >
                        {showAllCategories
                            ? t('common.view_less')
                            : t('common.view_more')}
                    </button>
                </div>
            </section>

            {/* Featured Products */}
            <section className="section container reveal">
                <div className="section-header text-center">
                    <h2 className="section-title">{t('featured.title')}</h2>
                    <p className="section-subtitle">
                        {t('featured.subtitle')}
                    </p>
                </div>

                <div className="products-grid">
                    {featuredProducts.map(product => (
                        <ProductCard key={product.id} product={product} isRTL={isRTL} />
                    ))}
                </div>

                <div className="text-center" style={{ marginTop: '50px' }}>
                    <Link to="/shop" className="btn btn-outline">
                        {t('featured.view_all')}
                    </Link>
                </div>
            </section>

            {/* New Arrivals */}
            <section className="section container reveal">
                <div className="section-header text-center">
                    <h2 className="section-title">{t('new_arrivals.title')}</h2>
                    <p className="section-subtitle">
                        {t('new_arrivals.subtitle')}
                    </p>
                </div>

                <div className={`products-grid-wrapper${showAllNewArrivals ? '' : ' collapsed'}`}>
                    <div className="products-grid">
                        {newArrivals.map(product => (
                            <ProductCard key={product.id} product={product} isRTL={isRTL} />
                        ))}
                    </div>
                    {!showAllNewArrivals && <div className="products-grid-fade"></div>}
                </div>

                <div className="text-center section-view-more">
                    <button className="btn btn-outline" onClick={() => setShowAllNewArrivals(prev => !prev)}>
                        {showAllNewArrivals
                            ? t('common.view_less')
                            : t('common.view_more')}
                    </button>
                </div>
            </section>

            {/* Men's Section */}
            <section className="section container reveal">
                <div className="section-header text-center">
                    <h2 className="section-title">{t('mens.title')}</h2>
                    <p className="section-subtitle">
                        {t('mens.subtitle')}
                    </p>
                </div>

                <div className={`products-grid-wrapper${showAllMens ? '' : ' collapsed'}`}>
                    <div className="products-grid">
                        {mensProducts.map(product => (
                            <ProductCard key={product.id} product={product} isRTL={isRTL} />
                        ))}
                    </div>
                    {!showAllMens && <div className="products-grid-fade"></div>}
                </div>

                <div className="text-center section-view-more">
                    <button className="btn btn-outline" onClick={() => setShowAllMens(prev => !prev)}>
                        {showAllMens
                            ? t('common.view_less')
                            : t('common.view_more')}
                    </button>
                    <Link to="/category/men" className="btn btn-outline" style={{ marginLeft: '12px' }}>
                        {t('common.view_all')}
                    </Link>
                </div>
            </section>

            {/* Women's Section */}
            <section className="section container reveal">
                <div className="section-header text-center">
                    <h2 className="section-title">{t('womens.title')}</h2>
                    <p className="section-subtitle">
                        {t('womens.subtitle')}
                    </p>
                </div>

                <div className={`products-grid-wrapper${showAllWomens ? '' : ' collapsed'}`}>
                    <div className="products-grid">
                        {womensProducts.map(product => (
                            <ProductCard key={product.id} product={product} isRTL={isRTL} />
                        ))}
                    </div>
                    {!showAllWomens && <div className="products-grid-fade"></div>}
                </div>

                <div className="text-center section-view-more">
                    <button className="btn btn-outline" onClick={() => setShowAllWomens(prev => !prev)}>
                        {showAllWomens
                            ? t('common.view_less')
                            : t('common.view_more')}
                    </button>
                    <Link to="/category/women" className="btn btn-outline" style={{ marginLeft: '12px' }}>
                        {t('common.view_all')}
                    </Link>
                </div>
            </section>

            {/* Brand Story Snippet */}
            <section className="brand-story-section reveal">
                <div className="brand-story-container container">
                    <div className="brand-story-image">
                        <img src={brandStoryImg} alt="Luxury Perfumes" />
                    </div>
                    <div className="brand-story-content">
                        <span className="text-gold" style={{ letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                            {t('brand_story.our_story')}
                        </span>
                        <h2>{t('brand_story.title')}</h2>
                        <p>
                            {t('brand_story.text')}
                        </p>
                        <Link to="/about" className="btn btn-outline" style={{ marginTop: '20px' }}>
                            {t('brand_story.discover_more')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Newsletter Section */}
            <Newsletter isRTL={isRTL} />
        </div>
    );
};

export default Home;
