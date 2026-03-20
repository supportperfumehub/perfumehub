import React, { createContext, useState, useEffect } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const savedCart = localStorage.getItem('perfumehub_cart');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            console.error('Failed to parse cart from localStorage:', error);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('perfumehub_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product, quantity = 1, isGiftWrapped = false, selectedSize = null, selectedPrice = null) => {
        setCartItems(prevItems => {
            const sizeToUse = selectedSize || (Array.isArray(product.size) ? (typeof product.size[0] === 'object' ? product.size[0].name : product.size[0]) : product.size);
            const priceToUse = selectedPrice || product.price;

            const existingItemIndex = prevItems.findIndex(
                item => item.product.id === product.id && item.isGiftWrapped === isGiftWrapped && item.selectedSize === sizeToUse && item.selectedPrice === priceToUse
            );

            if (existingItemIndex >= 0) {
                // Item exists with same gift wrap status, size AND price, increment quantity
                const updatedItems = [...prevItems];
                updatedItems[existingItemIndex].quantity += quantity;
                return updatedItems;
            } else {
                // New item
                return [...prevItems, { product, quantity, isGiftWrapped, selectedSize: sizeToUse, selectedPrice: priceToUse }];
            }
        });
    };

    const removeFromCart = (productId, isGiftWrapped, selectedSize) => {
        setCartItems(prevItems => prevItems.filter(
            item => !(item.product.id === productId && item.isGiftWrapped === isGiftWrapped && item.selectedSize === selectedSize)
        ));
    };

    const updateQuantity = (productId, isGiftWrapped, selectedSize, newQuantity) => {
        if (newQuantity <= 0) return;
        setCartItems(prevItems =>
            prevItems.map(item =>
                (item.product.id === productId && item.isGiftWrapped === isGiftWrapped && item.selectedSize === selectedSize)
                    ? { ...item, quantity: newQuantity }
                    : item
            )
        );
    };

    const clearCart = () => setCartItems([]);

    const getCartTotal = () => {
        return cartItems.reduce((total, item) => {
            const basePrice = item.selectedPrice || item.product.price;
            const itemPrice = parseFloat(basePrice) + (item.isGiftWrapped ? 10 : 0);
            return total + (itemPrice * item.quantity);
        }, 0);
    };

    const getCartCount = () => {
        return cartItems.reduce((count, item) => count + item.quantity, 0);
    };

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            getCartTotal,
            getCartCount
        }}>
            {children}
        </CartContext.Provider>
    );
};
