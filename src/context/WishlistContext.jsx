import React, { createContext, useState, useEffect } from 'react';

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
    const [wishlistItems, setWishlistItems] = useState(() => {
        try {
            const savedWishlist = localStorage.getItem('perfumehub_wishlist');
            if (!savedWishlist) return [];
            const parsed = JSON.parse(savedWishlist);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('Corrupt wishlist in localStorage, resetting:', e);
            try { localStorage.removeItem('perfumehub_wishlist'); } catch (_) {}
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('perfumehub_wishlist', JSON.stringify(wishlistItems));
        } catch (e) {
            console.warn('Failed to save wishlist to localStorage:', e);
        }
    }, [wishlistItems]);

    const addToWishlist = (product) => {
        setWishlistItems(prevItems => {
            if (!prevItems.find(item => item.id === product.id)) {
                return [...prevItems, product];
            }
            return prevItems;
        });
    };

    const removeFromWishlist = (productId) => {
        setWishlistItems(prevItems => prevItems.filter(item => item.id !== productId));
    };

    const toggleWishlist = (product) => {
        setWishlistItems(prevItems => {
            const exists = prevItems.find(item => item.id === product.id);
            if (exists) {
                return prevItems.filter(item => item.id !== product.id);
            } else {
                return [...prevItems, product];
            }
        });
    };

    const isInWishlist = (productId) => {
        return wishlistItems.some(item => item.id === productId);
    };

    return (
        <WishlistContext.Provider value={{
            wishlistItems,
            addToWishlist,
            removeFromWishlist,
            toggleWishlist,
            isInWishlist
        }}>
            {children}
        </WishlistContext.Provider>
    );
};
