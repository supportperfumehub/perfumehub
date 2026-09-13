import React, { createContext, useState, useEffect } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem('perfumehub_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    useEffect(() => {
        localStorage.setItem('perfumehub_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product, quantity = 1, isGiftWrapped = false, selectedSize = null, selectedPrice = null, shopId = null, inventoryId = null, vendorName = null, vendorAddress = null) => {
        setCartItems(prevItems => {
            const sizeToUse = selectedSize || (Array.isArray(product.size) ? (typeof product.size[0] === 'object' ? product.size[0].name : product.size[0]) : product.size);
            const priceToUse = selectedPrice !== null && selectedPrice !== undefined ? selectedPrice : product.price;
            const finalShopId = shopId || product.shop_id || (product.inventories && product.inventories[0]?.shop_id) || null;
            const finalInventoryId = inventoryId || product.inventory_id || (product.inventories && product.inventories[0]?.id) || null;
            const finalVendorName = vendorName || product.vendor_name || product.shop_name || 'PerfumeHub Luxury Boutique';
            const finalVendorAddress = vendorAddress || product.vendor_address || product.shop_address || 'Doha / Lusail';

            const existingItemIndex = prevItems.findIndex(
                item => item.product.id === product.id && 
                        item.isGiftWrapped === isGiftWrapped && 
                        item.selectedSize === sizeToUse && 
                        item.selectedPrice === priceToUse &&
                        (finalShopId ? item.shop_id === finalShopId : true)
            );

            if (existingItemIndex >= 0) {
                // Item exists with same shop, gift wrap status, size AND price, increment quantity
                const updatedItems = [...prevItems];
                updatedItems[existingItemIndex].quantity += quantity;
                return updatedItems;
            } else {
                // New item with explicit vendor attribution
                return [...prevItems, { 
                    product, 
                    quantity, 
                    isGiftWrapped, 
                    selectedSize: sizeToUse, 
                    selectedPrice: priceToUse,
                    shop_id: finalShopId,
                    inventory_id: finalInventoryId,
                    vendor_name: finalVendorName,
                    vendor_address: finalVendorAddress
                }];
            }
        });
    };

    const mergeUserCart = (incomingItems) => {
        if (!Array.isArray(incomingItems) || incomingItems.length === 0) return;
        setCartItems(prevItems => {
            const merged = [...prevItems];
            incomingItems.forEach(incoming => {
                const idx = merged.findIndex(item => 
                    item.product?.id === incoming.product?.id &&
                    item.selectedSize === incoming.selectedSize &&
                    item.isGiftWrapped === incoming.isGiftWrapped
                );
                if (idx >= 0) {
                    merged[idx].quantity = Math.max(merged[idx].quantity, incoming.quantity || 1);
                } else {
                    merged.push(incoming);
                }
            });
            return merged;
        });
    };

    const removeFromCart = (productId, isGiftWrapped, selectedSize, shopId = null) => {
        setCartItems(prevItems => prevItems.filter(
            item => !(item.product.id === productId && 
                      item.isGiftWrapped === isGiftWrapped && 
                      item.selectedSize === selectedSize &&
                      (shopId ? item.shop_id === shopId : true))
        ));
    };

    const updateQuantity = (productId, isGiftWrapped, selectedSize, newQuantity, shopId = null) => {
        if (newQuantity <= 0) return;
        setCartItems(prevItems =>
            prevItems.map(item =>
                (item.product.id === productId && 
                 item.isGiftWrapped === isGiftWrapped && 
                 item.selectedSize === selectedSize &&
                 (shopId ? item.shop_id === shopId : true))
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
            getCartCount,
            mergeUserCart
        }}>
            {children}
        </CartContext.Provider>
    );
};
