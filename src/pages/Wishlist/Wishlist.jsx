import React, { useEffect, useContext } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import ProductCard from '../../components/ProductCard/ProductCard';
import { WishlistContext } from '../../context/WishlistContext';
import { HeartCrack } from 'lucide-react';
import './Wishlist.css';

const Wishlist = () => {
    const { isRTL } = useOutletContext();
    const { wishlistItems } = useContext(WishlistContext);

    useEffect(() => {
        // Scroll to top on mount
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="wishlist-page">
            <div className="wishlist-header text-center reveal">
                <div className="container">
                    <h1>{isRTL ? 'قائمة الأمنيات' : 'My Wishlist'}</h1>
                    <p className="wishlist-subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        {isRTL
                            ? 'المنتجات التي أبديت إعجابك بها محفوظة هنا.'
                            : 'The products you loved are saved here.'}
                    </p>
                </div>
            </div>

            <div className="container wishlist-container section reveal">
                {wishlistItems.length > 0 ? (
                    <div className="products-grid">
                        {wishlistItems.map(product => (
                            <div key={product.id} className="wishlist-item-wrapper relative">
                                <ProductCard product={product} isRTL={isRTL} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-wishlist text-center">
                        <HeartCrack size={64} className="empty-icon" />
                        <h2>{isRTL ? 'قائمة الأمنيات فارغة' : 'Your Wishlist is Empty'}</h2>
                        <p>
                            {isRTL
                                ? 'يبدو أنك لم تقم بإضافة أي منتجات إلى قائمة الأمنيات بعد.'
                                : 'It looks like you haven\'t added any products to your wishlist yet.'}
                        </p>
                        <Link to="/shop" className="btn btn-gold" style={{ marginTop: '20px' }}>
                            {isRTL ? 'العودة للتسوق' : 'Back to Shop'}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Wishlist;
