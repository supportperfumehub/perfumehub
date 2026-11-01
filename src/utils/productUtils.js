/**
 * Product & Variant Utility Functions
 * PerfumeHub Qatar
 *
 * Ensures multi-version products showcase their most discounted variant on the card face
 * and across all customer-facing touchpoints (Shop, Home, AI Advisor, Wishlist, QuickView, ProductDetails).
 */

/**
 * Normalizes all versions/sizes of a product into a structured array.
 * Each item has { name, price, oldPrice, discount, savings, originalIndex }.
 *
 * @param {Object} product
 * @returns {Array<Object>}
 */
export const normalizeVariants = (product) => {
    if (!product) return [];

    const basePrice = product.price !== undefined && product.price !== null && product.price !== '' 
        ? Number(product.price) 
        : 0;

    const rawBaseOld = product.oldPrice !== undefined && product.oldPrice !== null && product.oldPrice !== '' 
        ? Number(product.oldPrice) 
        : (product.old_price !== undefined && product.old_price !== null && product.old_price !== '' ? Number(product.old_price) : null);

    const baseOldPrice = rawBaseOld && rawBaseOld > basePrice ? rawBaseOld : null;
    const baseDiscount = Number(product.discount) > 0 
        ? Number(product.discount) 
        : (baseOldPrice ? Math.round((1 - basePrice / baseOldPrice) * 100) : 0);

    const rawSizes = Array.isArray(product.size)
        ? product.size
        : (product.size ? [product.size] : []);

    return rawSizes.map((s, index) => {
        if (typeof s === 'object' && s !== null) {
            const name = String(s.name || s.size || `Option ${index + 1}`).trim();
            const price = (s.price !== undefined && s.price !== null && s.price !== '')
                ? Number(s.price)
                : basePrice;

            let oldPrice = (s.oldPrice !== undefined && s.oldPrice !== null && s.oldPrice !== '')
                ? Number(s.oldPrice)
                : (s.old_price !== undefined && s.old_price !== null && s.old_price !== '' ? Number(s.old_price) : null);

            // If variant price equals basePrice and base has oldPrice, inherit base oldPrice if variant has none
            if (!oldPrice && price === basePrice && baseOldPrice) {
                oldPrice = baseOldPrice;
            }

            let discount = (s.discount !== undefined && s.discount !== null && s.discount !== '')
                ? Number(s.discount)
                : 0;

            if (!discount && oldPrice && oldPrice > price) {
                discount = Math.round((1 - price / oldPrice) * 100);
            } else if (!discount && price === basePrice && baseDiscount > 0) {
                discount = baseDiscount;
            }

            const savings = (oldPrice && oldPrice > price) ? (oldPrice - price) : 0;

            return {
                ...s,
                name,
                price,
                oldPrice: (oldPrice && oldPrice > price) ? oldPrice : null,
                discount: discount > 0 ? discount : 0,
                savings: savings > 0 ? savings : 0,
                originalIndex: index
            };
        }

        const name = String(s).trim();
        const price = basePrice;
        const oldPrice = baseOldPrice;
        const discount = baseDiscount;
        const savings = (oldPrice && oldPrice > price) ? (oldPrice - price) : 0;

        return {
            name,
            price,
            oldPrice,
            discount,
            savings,
            originalIndex: index
        };
    });
};

/**
 * Returns the most discounted version/variant of a product.
 * If multiple versions exist:
 * 1. Variant with highest discount %
 * 2. Tie-break: Variant with highest absolute savings (oldPrice - price)
 * 3. Tie-break: Lower price or original order (index 0)
 *
 * If single version or no versions exist:
 * Returns base product data.
 *
 * @param {Object} product
 * @returns {Object} { bestVariant, hasMultipleVariants, displayPrice, displayOldPrice, displayDiscount, displaySavings, displaySizeName, allVariants }
 */
export const getBestVariant = (product) => {
    if (!product) {
        return {
            bestVariant: null,
            hasMultipleVariants: false,
            displayPrice: 0,
            displayOldPrice: null,
            displayDiscount: 0,
            displaySavings: 0,
            displaySizeName: '',
            allVariants: []
        };
    }

    const variants = normalizeVariants(product);
    const hasMultipleVariants = variants.length > 1;

    if (!hasMultipleVariants) {
        const single = variants[0];
        const basePrice = single ? single.price : (Number(product.price) || 0);
        const rawOld = single?.oldPrice !== undefined && single?.oldPrice !== null
            ? single.oldPrice
            : (product.oldPrice !== undefined && product.oldPrice !== null ? Number(product.oldPrice) : (product.old_price ? Number(product.old_price) : null));
        const baseOldPrice = rawOld && rawOld > basePrice ? rawOld : null;
        const baseDiscount = single?.discount !== undefined && single?.discount > 0
            ? single.discount
            : (Number(product.discount) > 0 ? Number(product.discount) : (baseOldPrice ? Math.round((1 - basePrice / baseOldPrice) * 100) : 0));
        const baseSavings = (baseOldPrice && baseOldPrice > basePrice) ? (baseOldPrice - basePrice) : 0;
        const sizeName = single?.name || (typeof product.size === 'string' ? product.size : '');

        const fallbackVariant = single || {
            name: sizeName,
            price: basePrice,
            oldPrice: baseOldPrice,
            discount: baseDiscount,
            savings: baseSavings,
            originalIndex: 0
        };

        return {
            bestVariant: fallbackVariant,
            hasMultipleVariants: false,
            displayPrice: basePrice,
            displayOldPrice: baseOldPrice,
            displayDiscount: baseDiscount,
            displaySavings: baseSavings,
            displaySizeName: sizeName,
            allVariants: variants
        };
    }

    // Has multiple versions: Rank by discount % (desc), then savings (desc), then original index (asc)
    const sorted = [...variants].sort((a, b) => {
        if (b.discount !== a.discount) {
            return b.discount - a.discount;
        }
        if (b.savings !== a.savings) {
            return b.savings - a.savings;
        }
        return a.originalIndex - b.originalIndex;
    });

    const best = sorted[0];

    return {
        bestVariant: best,
        hasMultipleVariants: true,
        displayPrice: best.price,
        displayOldPrice: best.oldPrice,
        displayDiscount: best.discount,
        displaySavings: best.savings,
        displaySizeName: best.name,
        allVariants: variants
    };
};

/**
 * Resolves a specific variant by size name, or falls back to the best variant.
 *
 * @param {Object} product
 * @param {string} sizeName
 * @returns {Object}
 */
export const getVariantByName = (product, sizeName) => {
    if (!product) return null;
    const variants = normalizeVariants(product);
    if (!sizeName || variants.length === 0) {
        return getBestVariant(product).bestVariant;
    }
    const matched = variants.find(v => String(v.name).toLowerCase() === String(sizeName).toLowerCase());
    return matched || getBestVariant(product).bestVariant;
};
