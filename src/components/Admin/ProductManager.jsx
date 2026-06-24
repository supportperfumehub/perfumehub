import React, { useState, useContext } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { Edit, Trash2, Plus, X, ImagePlus, Search, ImageOff, Store } from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';
import api from '../../utils/api_v1_0_2';

const typeCodes = {
    'Parfum': 'P',
    'EDP (Eau de Parfum)': 'EP',
    'EDT (Eau de Toilette)': 'ET',
    'EDC (Eau de Cologne)': 'EC',
    'Eau Fraîche': 'EF'
};

const ProductManager = ({ isRTL, shopId, hideHeader }) => {
    const { products, addProduct, updateProduct, deleteProduct, addInventory } = useContext(ShopContext);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isBindingCatalog, setIsBindingCatalog] = useState(false);
    const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);
    const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('default');
    const [isSkuAuto, setIsSkuAuto] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ 
        isOpen: false, 
        productId: null, 
        productName: '' 
    });

    const [shopsData, setShopsData] = useState([]);
    const [filterShop, setFilterShop] = useState('all');

    React.useEffect(() => {
        if (!shopId) { // Only fetch shop lists if we are running as global Super Admin
            const fetchShops = async () => {
                try {
                    const response = await api.get('/shops');
                    const shopsList = Array.isArray(response.data) ? response.data : (response.data.shops || []);
                    setShopsData(shopsList);
                } catch (error) {
                    console.error("Failed to fetch shops:", error);
                }
            };
            fetchShops();
        }
    }, [shopId]);

    const initialFormState = {
        name: '',
        brand: '',
        type: 'EDP (Eau de Parfum)',
        size: [], // Array of { name, price, oldPrice }
        price: '',
        oldPrice: '',
        discount: '',
        images: [''],
        category: [],
        gender: 'men',
        topNotes: '',
        middleNotes: '',
        baseNotes: '',
        isNew: false,
        isFeatured: false,
        stock: 10,
        sku: '',
        description: '',
        shop_id: shopId || 'core',
        pickup_available: true,
        attributes: {}
    };

    const [formData, setFormData] = useState(initialFormState);
    const [variantData, setVariantData] = useState({ name: '', price: '', oldPrice: '', discount: '' });
    const [customCatInput, setCustomCatInput] = useState('');
    const isEditingLinkedCatalog = editingId && shopId && String(formData.shop_id) !== String(shopId);

    const handleVariantInputChange = (e) => {
        const { name, value } = e.target;
        const updated = { ...variantData, [name]: value };

        const oldP = parseFloat(name === 'oldPrice' ? value : updated.oldPrice);
        const disc = parseFloat(name === 'discount' ? value : updated.discount);
        const newP = parseFloat(name === 'price' ? value : updated.price);

        if (name === 'price') {
            if (!isNaN(oldP) && oldP > 0 && !isNaN(newP) && newP >= 0 && newP < oldP) {
                updated.discount = Math.round((1 - newP / oldP) * 100);
            } else if (!isNaN(newP) && !isNaN(oldP) && newP >= oldP) {
                updated.discount = 0;
            }
        } else if (name === 'oldPrice' || name === 'discount') {
            if (!isNaN(oldP) && oldP > 0 && !isNaN(disc) && disc > 0 && disc <= 100) {
                updated.price = parseFloat((oldP * (1 - disc / 100)).toFixed(2));
            }
        }
        setVariantData(updated);
    };

    // Automatic SKU Generation Effect
    React.useEffect(() => {
        if (isSkuAuto && !editingId) {
            const formatSegment = (str, length = 3) => {
                const cleaned = str
                    .trim()
                    .toUpperCase()
                    .replace(/[^A-Z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                return cleaned.slice(0, length);
            };

            const cleanBrand = formatSegment(formData.brand, 2);
            const cleanName = formatSegment(formData.name, 2);
            
            // Get code based on categories or mapping
            let typeCode = '';
            const categories = formData.category || [];
            if (categories.includes('fashion')) {
                typeCode = 'FSH';
            } else if (categories.includes('jewellery')) {
                typeCode = 'JWL';
            } else if (categories.includes('giftbox') || categories.includes('gift-box')) {
                typeCode = 'GBX';
            } else {
                typeCode = typeCodes[formData.type];
                if (!typeCode && formData.type) {
                    typeCode = formatSegment(formData.type, 2);
                }
            }
            typeCode = typeCode || '';
            
            let segments = [];
            if (cleanBrand) segments.push(cleanBrand);
            if (cleanName) segments.push(cleanName);
            if (typeCode) segments.push(typeCode);

            setFormData(prev => ({ ...prev, sku: segments.join('-') }));
        }
    }, [formData.brand, formData.name, formData.type, formData.category, isSkuAuto, editingId]);

    const handleInputChange = (e) => {
        const { name, value, type, checked, options } = e.target;

        let newValue = value;
        if (type === 'checkbox') {
            newValue = checked;
        } else if (type === 'select-multiple') {
            newValue = Array.from(options).filter(opt => opt.selected).map(opt => opt.value);
        }

        const updated = { ...formData, [name]: newValue };

        const oldP = parseFloat(name === 'oldPrice' ? newValue : updated.oldPrice);
        const disc = parseFloat(name === 'discount' ? newValue : updated.discount);
        const newP = parseFloat(name === 'price' ? newValue : updated.price);

        if (name === 'price') {
            // Reverse: price entered → auto-calculate discount%
            if (!isNaN(oldP) && oldP > 0 && !isNaN(newP) && newP >= 0 && newP < oldP) {
                updated.discount = Math.round((1 - newP / oldP) * 100);
            } else if (!isNaN(newP) && !isNaN(oldP) && newP >= oldP) {
                updated.discount = 0; // no discount if new price >= old price
            }
        } else if (name === 'oldPrice' || name === 'discount') {
            // Forward: oldPrice + discount% → auto-calculate price
            if (!isNaN(oldP) && oldP > 0 && !isNaN(disc) && disc > 0 && disc <= 100) {
                updated.price = parseFloat((oldP * (1 - disc / 100)).toFixed(2));
            }
        }

        if (name === 'sku') {
            setIsSkuAuto(false);
        }

        setFormData(updated);
    };

    const addSizeTag = () => {
        if (variantData.name.trim() && variantData.price) {
            const newVariant = {
                name: variantData.name.trim(),
                price: Number(variantData.price),
                oldPrice: variantData.oldPrice ? Number(variantData.oldPrice) : null,
                discount: variantData.discount ? Number(variantData.discount) : 0
            };
            
            setFormData(prev => ({
                ...prev,
                size: [...prev.size, newVariant]
            }));
            setVariantData({ name: '', price: '', oldPrice: '', discount: '' });
        }
    };

    const removeSizeTag = (indexToRemove) => {
        setFormData(prev => ({
            ...prev,
            size: prev.size.filter((_, idx) => idx !== indexToRemove)
        }));
    };

    const handleCategoryToggle = (categoryValue) => {
        setFormData(prev => {
            const currentCategories = prev.category || [];
            if (currentCategories.includes(categoryValue)) {
                return { ...prev, category: currentCategories.filter(c => c !== categoryValue) };
            } else {
                return { ...prev, category: [...currentCategories, categoryValue] };
            }
        });
    };

    const addCustomCategory = () => {
        if (!customCatInput.trim()) return;
        
        const newCats = customCatInput
            .split(',')
            .map(c => c.trim())
            .filter(c => c && !formData.category?.includes(c.toLowerCase()));
            
        if (newCats.length > 0) {
            setFormData(prev => ({ 
                ...prev, 
                category: [...(prev.category || []), ...newCats.map(c => c.toLowerCase())] 
            }));
            setCustomCatInput('');
        }
    };

    const availableCategories = [
        // Core Departments
        { value: 'jewellery', label: 'Jewellery' },
        { value: 'fashion', label: 'Fashion' },
        { value: 'giftbox', label: 'Gift Box' },
        
        // Luxury Items
        { value: 'watches', label: 'Watches' },
        { value: 'rings', label: 'Rings' },
        { value: 'necklaces', label: 'Necklaces' },
        { value: 'earrings', label: 'Earrings' },
        { value: 'bracelets', label: 'Bracelets' },
        { value: 'bags', label: 'Handbags & Bags' },
        { value: 'clothing', label: 'Clothing' },
        { value: 'shoes', label: 'Shoes' },

        // Fragrance Categories (Keep for perfumes)
        { value: 'woody', label: 'Woody' },
        { value: 'floral', label: 'Floral' },
        { value: 'arabic', label: 'Arabic' },
        { value: 'spicy', label: 'Spicy' },
        { value: 'citrus', label: 'Citrus' },
        { value: 'musk', label: 'Musk' },
        { value: 'oriental', label: 'Oriental' },
        { value: 'fresh', label: 'Fresh' },
        { value: 'fruity', label: 'Fruity' },
        { value: 'sweet', label: 'Sweet' },
        { value: 'aquatic', label: 'Aquatic' },
        { value: 'luxury', label: 'Luxury Brands' }
    ];

    const handleImageChange = (index, value) => {
        const updatedImages = [...formData.images];
        updatedImages[index] = value;
        setFormData({ ...formData, images: updatedImages });
    };

    const addImageField = () => {
        setFormData({ ...formData, images: [...formData.images, ''] });
    };

    const removeImageField = (index) => {
        const updatedImages = formData.images.filter((_, i) => i !== index);
        setFormData({ ...formData, images: updatedImages.length > 0 ? updatedImages : [''] });
    };

    const moveImage = (index, direction) => {
        const updatedImages = [...formData.images];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex >= 0 && newIndex < updatedImages.length) {
            [updatedImages[index], updatedImages[newIndex]] = [updatedImages[newIndex], updatedImages[index]];
            setFormData({ ...formData, images: updatedImages });
        }
    };

    const handleImageUpload = (index, e) => {
        try {
            const fileInput = e.target;
            const file = fileInput.files[0];
            if (file) {
                const objectUrl = URL.createObjectURL(file);
                const img = new window.Image();
                
                if (!window._activeImageRefs) {
                    window._activeImageRefs = new Set();
                }
                window._activeImageRefs.add(img);

                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Compress to JPEG with 0.7 quality to guarantee small payload size
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                        handleImageChange(index, compressedBase64);
                        
                        fileInput.value = ''; // Reset input to allow uploading same image
                        URL.revokeObjectURL(objectUrl);
                        window._activeImageRefs.delete(img);
                    } catch (loadErr) {
                        alert("Error during image load processing: " + loadErr.message);
                        fileInput.value = '';
                        URL.revokeObjectURL(objectUrl);
                        window._activeImageRefs.delete(img);
                    }
                };
                img.onerror = () => {
                    alert("Failed to load image object.");
                    fileInput.value = ''; // Reset on error too
                    URL.revokeObjectURL(objectUrl);
                    window._activeImageRefs.delete(img);
                };
                img.src = objectUrl;
            }
        } catch (err) {
            alert("Error in handleImageUpload: " + err.message);
        }
    };

    const handleAttributeChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            attributes: {
                ...(prev.attributes || {}),
                [key]: value
            }
        }));
    };

    const renderAttributeFields = () => {
        const categories = formData.category || [];
        const isFashion = categories.includes('fashion');
        const isJewellery = categories.includes('jewellery');
        const isGiftBox = categories.includes('giftbox') || categories.includes('gift-box');

        if (!isFashion && !isJewellery && !isGiftBox) return null;

        const attributes = formData.attributes || {};

        return (
            <div className="form-column-attributes animate-fade-in" style={{ marginTop: '20px', padding: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(200, 169, 81, 0.2)', borderRadius: '12px', marginBottom: '20px' }}>
                <div className="form-section-title" style={{ marginTop: 0, color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginBottom: '15px' }}>
                    <Plus size={16} /> {isRTL ? 'المواصفات والخصائص (Attributes)' : 'Category Specifications (Attributes)'}
                </div>
                
                {isFashion && (
                    <div className="form-row grid-3">
                        <div className="form-group">
                            <label>{isRTL ? 'اللون' : 'Color'}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={attributes.color || ''} 
                                onChange={(e) => handleAttributeChange('color', e.target.value)} 
                                placeholder="e.g. Nero Black"
                            />
                        </div>
                        <div className="form-group">
                            <label>{isRTL ? 'المادة' : 'Material'}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={attributes.material || ''} 
                                onChange={(e) => handleAttributeChange('material', e.target.value)} 
                                placeholder="e.g. 100% Cashmere"
                            />
                        </div>
                        <div className="form-group">
                            <label>{isRTL ? 'البلد المصنع' : 'Origin / Manufacturer'}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={attributes.origin || ''} 
                                onChange={(e) => handleAttributeChange('origin', e.target.value)} 
                                placeholder="e.g. Italy"
                            />
                        </div>
                    </div>
                )}

                {isJewellery && (
                    <div className="form-row grid-3" style={{ gap: '15px' }}>
                        <div className="form-group">
                            <label>{isRTL ? 'نوع المعدن' : 'Metal / Material'}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={attributes.material || ''} 
                                onChange={(e) => handleAttributeChange('material', e.target.value)} 
                                placeholder="e.g. 18K Yellow Gold"
                            />
                        </div>
                        <div className="form-group">
                            <label>{isRTL ? 'نوع الحجر' : 'Stone Type'}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={attributes.stone || ''} 
                                onChange={(e) => handleAttributeChange('stone', e.target.value)} 
                                placeholder="e.g. Brilliant Round Diamond"
                            />
                        </div>
                        <div className="form-group">
                            <label>{isRTL ? 'الوزن (قيراط)' : 'Carat Weight'}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={attributes.carat || ''} 
                                onChange={(e) => handleAttributeChange('carat', e.target.value)} 
                                placeholder="e.g. 0.85 ct"
                            />
                        </div>
                        <div className="form-group">
                            <label>{isRTL ? 'النقاء / العيار' : 'Clarity / Purity'}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={attributes.purity || ''} 
                                onChange={(e) => handleAttributeChange('purity', e.target.value)} 
                                placeholder="e.g. VVS1 / G Color"
                            />
                        </div>
                        <div className="form-group">
                            <label>{isRTL ? 'الشهادة' : 'Certification'}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={attributes.certification || ''} 
                                onChange={(e) => handleAttributeChange('certification', e.target.value)} 
                                placeholder="e.g. GIA Certified"
                            />
                        </div>
                    </div>
                )}

                {isGiftBox && (
                    <div className="form-row grid-2" style={{ gap: '15px' }}>
                        <div className="form-group">
                            <label>{isRTL ? 'موضوع الصندوق' : 'Theme'}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={attributes.theme || ''} 
                                onChange={(e) => handleAttributeChange('theme', e.target.value)} 
                                placeholder="e.g. Imperial Oud / Celebration"
                            />
                        </div>
                        <div className="form-group">
                            <label>{isRTL ? 'أبعاد الصندوق' : 'Dimensions'}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={attributes.dimensions || ''} 
                                onChange={(e) => handleAttributeChange('dimensions', e.target.value)} 
                                placeholder="e.g. 25cm x 20cm x 12cm"
                            />
                        </div>
                        <div className="form-group">
                            <label>{isRTL ? 'نوع التغليف' : 'Packaging Type'}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={attributes.packaging || ''} 
                                onChange={(e) => handleAttributeChange('packaging', e.target.value)} 
                                placeholder="e.g. Handcrafted Wooden Chest"
                            />
                        </div>
                        <div className="form-group">
                            <label>{isRTL ? 'محتويات الصندوق' : 'Contents'}</label>
                            <textarea 
                                className="form-control" 
                                value={attributes.contents || ''} 
                                onChange={(e) => handleAttributeChange('contents', e.target.value)} 
                                placeholder="e.g. Perfume, dates box, organic honey..."
                                rows="2"
                            ></textarea>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // If there are variants, the base price/oldPrice should be from the first variant
        let basePrice = Number(formData.price);
        let baseOldPrice = formData.oldPrice ? Number(formData.oldPrice) : null;
        let baseDiscount = formData.discount ? Number(formData.discount) : 0;

        if (formData.size.length > 0) {
            basePrice = formData.size[0].price;
            baseOldPrice = formData.size[0].oldPrice;
            if (baseOldPrice && baseOldPrice > basePrice) {
                baseDiscount = Math.round((1 - basePrice / baseOldPrice) * 100);
            } else {
                baseDiscount = 0;
            }
        }

        const filteredImages = formData.images.filter(url => url.trim() !== '');
        const productData = {
            ...formData,
            size: formData.size,
            image: filteredImages.length === 1 ? filteredImages[0] : filteredImages,
            isFeatured: formData.isFeatured,
            price: basePrice,
            oldPrice: baseOldPrice,
            discount: baseDiscount,
            stock: formData.stock !== undefined ? Number(formData.stock) : Number(formData.stock) || 0,
            sku: formData.sku?.trim() || '',
            description: formData.description?.trim() || '',
            topNotes: formData.topNotes?.trim() || '',
            middleNotes: formData.middleNotes?.trim() || '',
            baseNotes: formData.baseNotes?.trim() || '',
            shop_id: shopId !== undefined ? shopId : (formData.shop_id && formData.shop_id !== 'core' ? Number(formData.shop_id) : null),
            attributes: formData.attributes || {}
        };
        delete productData.images;

        if (editingId) {
            updateProduct(editingId, productData);
        } else {
            addProduct(productData);
        }

        setFormData(initialFormState);
        setShowForm(false);
        setEditingId(null);
    };
    const handleEdit = (product) => {
        const imageArray = Array.isArray(product.image)
            ? product.image
            : (product.image ? [product.image] : ['']);
        
        const sanitizedSizes = Array.isArray(product.size) 
            ? product.size.map(s => typeof s === 'string' ? { name: s, price: product.price, oldPrice: product.oldPrice } : s)
            : [];
            
        const shopInventory = shopId ? product.inventories?.find(inv => String(inv.shop_id) === String(shopId)) : null;
        const initialPrice = shopInventory ? shopInventory.price : product.price;
        const initialStock = shopInventory ? shopInventory.stock : (product.stock !== undefined ? product.stock : 10);
        const initialPickup = shopInventory 
            ? shopInventory.pickup_available !== false 
            : product.pickup_available !== false;

        setFormData({
            ...product,
            price: initialPrice,
            stock: initialStock,
            size: sanitizedSizes,
            images: imageArray,
            isFeatured: product.isFeatured || false,
            sku: product.sku || '',
            description: product.description || '',
            topNotes: product.topNotes || '',
            middleNotes: product.middleNotes || '',
            baseNotes: product.baseNotes || '',
            shop_id: product.shop_id || 'core',
            pickup_available: initialPickup,
            attributes: product.attributes || {}
        });
        setEditingId(product.id);
        setIsSkuAuto(false); // Set to false when editing existing product to prevent accidental changes
        setShowForm(true);
        window.scrollTo(0, 0);
    };
    const toggleReservation = async (product) => {
        const shopInventory = shopId ? product.inventories?.find(inv => String(inv.shop_id) === String(shopId)) : null;
        const currentPickup = shopInventory 
            ? shopInventory.pickup_available !== false 
            : product.pickup_available !== false;
        
        const nextPickup = !currentPickup;

        const updatedData = {
            ...product,
            price: shopInventory ? shopInventory.price : product.price,
            stock: shopInventory ? shopInventory.stock : product.stock,
            pickup_available: nextPickup
        };

        await updateProduct(product.id, updatedData);
    };
    const handleDelete = (id, productName) => {
        setConfirmModal({
            isOpen: true,
            productId: id,
            productName: productName
        });
    };

    const confirmDelete = () => {
        if (confirmModal.productId) {
            deleteProduct(confirmModal.productId);
            setConfirmModal({ isOpen: false, productId: null, productName: '' });
        }
    };

    const cancelEdit = () => {
        setFormData(initialFormState);
        setIsSkuAuto(true);
        setShowForm(false);
        setEditingId(null);
        setIsBindingCatalog(false);
        setSelectedCatalogProduct(null);
    };

    const handleCatalogSelect = (product) => {
        setSelectedCatalogProduct(product);
        setFormData({
            ...initialFormState,
            price: product.price || '',
            stock: 10
        });
    };

    const handleInventorySubmit = async (e) => {
        e.preventDefault();
        if (!selectedCatalogProduct || !shopId) return;
        
        const payload = {
            product_id: selectedCatalogProduct.id,
            shop_id: shopId,
            price: Number(formData.price),
            stock: Number(formData.stock),
            is_active: true,
            pickup_available: true
        };

        const success = await addInventory(payload);
        if (success) {
            cancelEdit();
        }
    };
    const safeProducts = Array.isArray(products) ? products : [];
    const shopFilteredProducts = safeProducts.filter(product => {
        if (shopId) {
            const isOwned = String(product.shop_id) === String(shopId);
            const isLinked = product.inventories && product.inventories.some(inv => String(inv.shop_id) === String(shopId));
            if (!isOwned && !isLinked) return false;
        }
        if (!shopId) {
            if (filterShop === 'own' && product.shop_id) return false;
            if (filterShop !== 'all' && filterShop !== 'own' && String(product.shop_id) !== String(filterShop)) return false;
        }
        return true;
    });

    const getCategoryCounts = () => {
        const counts = { all: 0, perfume: 0, fashion: 0, abaya: 0, giftbox: 0, jewellery: 0 };
        shopFilteredProducts.forEach(product => {
            counts.all++;
            const cats = Array.isArray(product.category) ? product.category.map(c => c.toLowerCase()) : [];
            
            if (cats.includes('abaya')) {
                counts.abaya++;
            } else if (cats.includes('fashion')) {
                counts.fashion++;
            }
            
            if (cats.includes('jewellery')) {
                counts.jewellery++;
            }
            
            if (cats.includes('giftbox') || cats.includes('gift-box')) {
                counts.giftbox++;
            }
            
            if (!cats.includes('fashion') && !cats.includes('jewellery') && !cats.includes('giftbox') && !cats.includes('gift-box') && !cats.includes('abaya')) {
                counts.perfume++;
            }
        });
        return counts;
    };

    const categoryCounts = getCategoryCounts();

    return (
        <div className="manager-content">
            <div className="manager-header">
                {!hideHeader && <h2>{isRTL ? 'إدارة المنتجات' : 'Product Management'}</h2>}
                {hideHeader && <div style={{ flex: 1 }}></div>}
                <div className="manager-header-actions">
                    {!showForm && (
                        <div className="header-controls-group">
                            <div className="admin-search-container">
                                <div className="admin-search-icon">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder={isRTL ? 'ابحث عن منتج...' : 'Search product...'}
                                    className="form-control admin-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select 
                                className="form-control admin-sort-select" 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="default">{isRTL ? 'الترتيب الافتراضي' : 'Default Sort'}</option>
                                <option value="newest">{isRTL ? 'مضاف حديثاً' : 'Newly Added'}</option>
                                <option value="name-asc">{isRTL ? 'الاسم (أ-ي)' : 'Name (A-Z)'}</option>
                                <option value="name-desc">{isRTL ? 'الاسم (ي-أ)' : 'Name (Z-A)'}</option>
                                <option value="price-asc">{isRTL ? 'السعر: من الأقل' : 'Price: Low to High'}</option>
                                <option value="price-desc">{isRTL ? 'السعر: من الأعلى' : 'Price: High to Low'}</option>
                            </select>
                            
                            {!shopId && (
                                <select 
                                    className="form-control admin-sort-select" 
                                    style={{ flex: 1, minWidth: '180px' }}
                                    value={filterShop} 
                                    onChange={(e) => setFilterShop(e.target.value)}
                                >
                                    <option value="all">{isRTL ? 'جميع المنتجات (نورث كلوب باريس + المتاجر)' : 'All Inventory (North Club Paris + Shops)'}</option>
                                    <option value="own">{isRTL ? 'منتجات نورث كلوب باريس فقط' : 'North Club Paris Products'}</option>
                                    {shopsData.map(shop => (
                                        <option key={shop.id} value={shop.id}>{isRTL ? `متجر: ${shop.name}` : `Shop: ${shop.name}`}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}
                    {!showForm && !isBindingCatalog && (
                        <button type="button" className="btn btn-gold" onClick={() => shopId ? setIsBindingCatalog(true) : setShowForm(true)}>
                            <Plus size={18} />
                            {shopId ? (isRTL ? 'إضافة من الكتالوج' : 'Add from Catalog') : (isRTL ? 'إضافة منتج جديد' : 'Add New Product')}
                        </button>
                    )}
                </div>
            </div>

            {isBindingCatalog && (
                <div className="admin-form animate-fade-in" style={{ backgroundColor: 'rgba(200, 169, 81, 0.05)', border: '1px solid rgba(200, 169, 81, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: 'var(--color-gold)' }}>
                            <Store size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                            {isRTL ? 'تحديد منتج من الكتالوج العالمي' : 'Select Product from Global Catalog'}
                        </h3>
                        <button onClick={cancelEdit} className="admin-action-btn" style={{ margin: 0 }}><X size={20} /></button>
                    </div>

                    {!selectedCatalogProduct ? (
                        <div>
                            <div className="admin-search-container" style={{ marginBottom: '20px' }}>
                                <div className="admin-search-icon"><Search size={18} /></div>
                                <input
                                    type="text"
                                    placeholder={isRTL ? 'ابحث عن اسم العطر أو الماركة...' : 'Search global perfumes or brands...'}
                                    className="form-control admin-search-input"
                                    value={catalogSearchTerm}
                                    onChange={(e) => setCatalogSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                                {products.filter(p => !p._dummy && (p.name.toLowerCase().includes(catalogSearchTerm.toLowerCase()) || p.brand.toLowerCase().includes(catalogSearchTerm.toLowerCase()))).slice(0, 50).map(p => {
                                    // Check if shop already owns this product
                                    const alreadyHas = p.inventories?.some(inv => inv.shop_id === shopId);
                                    return (
                                        <div 
                                            key={p.id} 
                                            style={{ 
                                                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', cursor: alreadyHas ? 'not-allowed' : 'pointer', opacity: alreadyHas ? 0.5 : 1, transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: '8px' 
                                            }}
                                            onClick={() => !alreadyHas && handleCatalogSelect(p)}
                                            onMouseOver={(e) => { if(!alreadyHas) e.currentTarget.style.borderColor = 'var(--color-gold)'; }}
                                            onMouseOut={(e) => { if(!alreadyHas) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                                        >
                                            <div style={{ height: '100px', borderRadius: '8px', overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {p.image && p.image[0] ? <img src={p.image[0]} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} alt="" /> : <ImageOff size={24} color="#333" />}
                                            </div>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px', fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                                                <div style={{ color: 'var(--color-gold)', fontSize: '0.8rem', marginBottom: '8px' }}>{p.brand}</div>
                                                {alreadyHas && <div style={{ fontSize: '0.75rem', color: '#e74c3c', background: 'rgba(231,76,60,0.1)', padding: '4px 8px', borderRadius: '4px', textAlign: 'center' }}>{isRTL ? 'مضاف مسبقاً' : 'Already in inventory'}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleInventorySubmit}>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', alignItems: 'center' }}>
                                {selectedCatalogProduct.image && selectedCatalogProduct.image[0] && (
                                    <img src={selectedCatalogProduct.image[0]} style={{ width: '80px', height: '80px', objectFit: 'contain', background: '#fff', borderRadius: '8px', padding: '5px' }} alt="" />
                                )}
                                <div>
                                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>{selectedCatalogProduct.name}</h4>
                                    <div style={{ color: 'var(--color-gold)' }}>{selectedCatalogProduct.brand} • {selectedCatalogProduct.type}</div>
                                </div>
                                <button type="button" className="btn" onClick={() => setSelectedCatalogProduct(null)} style={{ marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0, padding: '8px 15px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)' }}>
                                    {isRTL ? 'تغيير المنتج' : 'Change Product'}
                                </button>
                            </div>

                            <div className="form-row grid-2">
                                <div className="form-group">
                                    <label>{isRTL ? 'سعر البيع (ر.ق)' : 'Selling Price (QAR)'}</label>
                                    <input type="number" name="price" className="form-control" value={formData.price} onChange={handleInputChange} required min="1" step="0.5" />
                                </div>
                                <div className="form-group">
                                    <label>{isRTL ? 'الكمية المتوفرة' : 'Available Stock'}</label>
                                    <input type="number" name="stock" className="form-control" value={formData.stock} onChange={handleInputChange} required min="0" />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button type="submit" className="btn btn-gold" style={{ flex: 1 }}>
                                    <Plus size={18} />
                                    {isRTL ? 'إضافة لمخزون المتجر' : 'Add to Shop Inventory'}
                                </button>
                                <button type="button" className="btn" onClick={cancelEdit} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {showForm && (
                <div className="admin-form animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>
                            {editingId ? (isRTL ? 'تعديل المنتج' : 'Edit Product') : (isRTL ? 'إضافة منتج جديد' : 'Add New Product')}
                        </h3>
                        <button onClick={cancelEdit} className="admin-action-btn" style={{ margin: 0 }}><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {isEditingLinkedCatalog ? (
                            <div style={{ background: 'rgba(200, 169, 81, 0.05)', border: '1px solid rgba(200, 169, 81, 0.2)', padding: '15px 20px', borderRadius: '10px', marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 5px 0', color: 'var(--color-gold)' }}>
                                    {isRTL ? 'تعديل بيانات المخزون فقط' : 'Editing Inventory Stock & Price Only'}
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                                    {isRTL 
                                        ? `هذا المنتج من الكتالوج العام ("${formData.name}"). يمكنك فقط تعديل الأسعار والمخزون الخاص بمتجرك.` 
                                        : `This is a global catalog product ("${formData.name}"). You can only edit your shop's specific pricing and inventory.`}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Section 1: Basic Identity */}
                        <div className="form-row mixed-2-1">
                            <div className="form-group">
                                <label>{isRTL ? 'اسم المنتج' : 'Product Name'}</label>
                                <input type="text" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'الماركة' : 'Brand'}</label>
                                <input type="text" name="brand" className="form-control" value={formData.brand} onChange={handleInputChange} required />
                            </div>
                        </div>

                        {/* Section 1.5: Ownership (Super Admin Only) */}
                        {!shopId && (
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <div className="form-section-title" style={{ marginTop: 0, marginBottom: '10px' }}>
                                    <Store size={16} /> {isRTL ? 'تخصيص المتجر' : 'Shop Assignment / Ownership'}
                                </div>
                                <select 
                                    name="shop_id" 
                                    className="form-control" 
                                    value={formData.shop_id || 'core'} 
                                    onChange={handleInputChange}
                                    style={{ border: '1px solid var(--color-gold)', background: 'rgba(200, 169, 81, 0.05)' }}
                                >
                                    <option value="core">{isRTL ? 'نورث كلوب باريس (المخزون الرئيسي)' : 'North Club Paris (Core Inventory)'}</option>
                                    {shopsData.map(shop => (
                                        <option key={shop.id} value={shop.id}>
                                            {isRTL ? `منتج لـ: ${shop.name}` : `Assign to: ${shop.name}`}
                                        </option>
                                    ))}
                                </select>
                                <small style={{ color: '#94a3b8', display: 'block', marginTop: '6px' }}>
                                    {isRTL 
                                        ? 'حدد المتجر الذي يمتلك هذا المنتج. سيظهر في متجرهم وعلى صفحتهم الخاصة.' 
                                        : 'Select the shop that owns this product. It will appear in their dashboard and shop page.'}
                                </small>
                            </div>
                        )}

                        <div className="form-row grid-3">
                            <div className="form-group">
                                <label>{isRTL ? 'رمز المنتج (SKU)' : 'SKU'}</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text" 
                                        name="sku" 
                                        className="form-control" 
                                        value={formData.sku} 
                                        onChange={handleInputChange} 
                                        placeholder="e.g. AMB-WD-EP"
                                    />
                                    <button 
                                        type="button" 
                                        className={`text-btn-gold ${isSkuAuto ? 'active' : ''}`}
                                        onClick={() => setIsSkuAuto(!isSkuAuto)}
                                        style={{ position: 'absolute', right: isRTL ? 'auto' : '10px', left: isRTL ? '10px' : 'auto', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem' }}
                                    >
                                        {isSkuAuto ? (isRTL ? 'سحب آلي' : 'AUTO') : (isRTL ? 'يدوي' : 'MANUAL')}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'القسم الرئيسي' : 'Primary Department'}</label>
                                <select name="gender" className="form-control" value={formData.gender} onChange={handleInputChange}>
                                    <option value="men">{isRTL ? 'أزياء' : 'Fashion'}</option>
                                    <option value="women">{isRTL ? 'مجوهرات' : 'Jewellery'}</option>
                                    <option value="arabic">{isRTL ? 'صناديق الهدايا' : 'Gift Boxes'}</option>
                                    <option value="unisex">{isRTL ? 'للجنسين / عام' : 'Unisex / General'}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'النوع / التصنيف' : 'Type / Category'}</label>
                                <input 
                                    list="product-types" 
                                    name="type" 
                                    className="form-control" 
                                    value={formData.type} 
                                    onChange={handleInputChange}
                                    placeholder={isRTL ? 'مثلاً: عطر، قلادة، ساعة...' : 'e.g. Perfume, Necklace, Watch...'}
                                />
                                <datalist id="product-types">
                                    <option value="Perfume">Perfume</option>
                                    <option value="Necklace">Necklace</option>
                                    <option value="Ring">Ring</option>
                                    <option value="Watch">Watch</option>
                                    <option value="Bag">Bag</option>
                                    <option value="Gift Set">Gift Set</option>
                                    <option value="EDP (Eau de Parfum)">EDP (Eau de Parfum)</option>
                                </datalist>
                            </div>
                        </div>

                        {/* Section 2: Olfactory Notes */}
                        <div className="form-section-title">
                            <Plus size={16} /> {isRTL ? 'مكونات العطر' : 'Fragrance Notes'}
                        </div>
                        <div className="form-row grid-3">
                            <div className="form-group">
                                <label style={{ fontSize: '0.85rem' }}>{isRTL ? 'الإفتتاحية (Top)' : 'Top Notes'}</label>
                                <textarea name="topNotes" className="form-control" value={formData.topNotes} onChange={handleInputChange} rows="2"></textarea>
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.85rem' }}>{isRTL ? 'القلب (Middle)' : 'Middle Notes'}</label>
                                <textarea name="middleNotes" className="form-control" value={formData.middleNotes} onChange={handleInputChange} rows="2"></textarea>
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.85rem' }}>{isRTL ? 'القاعدة (Base)' : 'Base Notes'}</label>
                                <textarea name="baseNotes" className="form-control" value={formData.baseNotes} onChange={handleInputChange} rows="2"></textarea>
                            </div>
                        </div>
                            </>
                        )}

                        {isEditingLinkedCatalog ? (
                            <div style={{ maxWidth: '600px', margin: '0 auto 20px auto', background: 'rgba(255,255,255,0.01)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(200, 169, 81, 0.1)' }}>
                                <div className="form-section-title" style={{ marginTop: 0 }}>
                                    <Plus size={16} /> {isRTL ? 'الأسعار والمخزون' : 'Pricing & Inventory'}
                                </div>
                                <div className="form-row grid-2" style={{ gap: '15px' }}>
                                    <div className="form-group">
                                        <label>{isRTL ? 'سعر البيع (ر.ق)' : 'Selling Price (QAR)'}</label>
                                        <input type="number" name="price" className="form-control" value={formData.price} onChange={handleInputChange} required min="1" step="0.5" />
                                    </div>
                                    <div className="form-group">
                                        <label>{isRTL ? 'الكمية المتوفرة' : 'Available Stock'}</label>
                                        <input type="number" name="stock" className="form-control" value={formData.stock} onChange={handleInputChange} required min="0" />
                                    </div>
                                </div>
                                <div className="premium-marking-section" style={{ marginTop: '15px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 15px' }}>
                                    <div className="marking-label-group">
                                        <label htmlFor="pickup_available_linked">{isRTL ? 'تفعيل حجز المتجر' : 'Enable Store Reservation'}</label>
                                        <span className="marking-desc">{isRTL ? 'السماح للعملاء بحجز هذا المنتج في المتجر' : 'Allow customers to reserve this product in-store'}</span>
                                    </div>
                                    <label className="toggle-switch">
                                        <input type="checkbox" name="pickup_available" id="pickup_available_linked" checked={formData.pickup_available !== false} onChange={handleInputChange} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="form-row-dual">
                            {/* Section 3: Pricing & Inventory */}
                            <div className="form-column">
                                <div className="form-section-title">
                                    <Plus size={16} /> {isRTL ? 'الأسعار والمخزون' : 'Pricing & Inventory'}
                                </div>
                                <div className="form-row grid-2" style={{ gap: '10px' }}>
                                    <div className="form-group">
                                        <label>
                                            {isRTL ? 'السعر (ر.ق)' : 'Base Price'}
                                            {formData.size.length > 0 && <span className="label-hint"> ({isRTL ? 'محكوم بالأحجام' : 'Controlled by sizes'})</span>}
                                        </label>
                                        <input type="number" name="price" className="form-control" value={formData.price} onChange={handleInputChange} required={formData.size.length === 0} disabled={formData.size.length > 0} />
                                    </div>
                                    <div className="form-group">
                                        <label>
                                            {isRTL ? 'السعر القديم' : 'Old Price'}
                                            {formData.size.length > 0 && <span className="label-hint"> ({isRTL ? 'تعديل من الأحجام' : 'Edit from sizes'})</span>}
                                        </label>
                                        <input type="number" name="oldPrice" className="form-control" value={formData.oldPrice} onChange={handleInputChange} disabled={formData.size.length > 0} />
                                    </div>
                                    <div className="form-group">
                                        <label>
                                            {isRTL ? 'الخصم %' : 'Discount %'}
                                            {formData.size.length > 0 && <span className="label-hint"> ({isRTL ? 'آلي من الأحجام' : 'Auto from sizes'})</span>}
                                        </label>
                                        <input type="number" name="discount" className="form-control" value={formData.discount} onChange={handleInputChange} disabled={formData.size.length > 0} />
                                    </div>
                                    <div className="form-group">
                                        <label>{isRTL ? 'المخزون' : 'Stock'}</label>
                                        <input type="number" name="stock" className="form-control" value={formData.stock} onChange={handleInputChange} required />
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Variants */}
                            <div className="form-column">
                                <div className="form-section-title">
                                    <Plus size={16} /> {isRTL ? 'إدارة الأحجام والأسعار (Variants)' : 'Size & Price Variants'}
                                </div>
                                
                                <div className="variant-input-grid">
                                    <div className="form-group">
                                        <label>{isRTL ? 'الحجم' : 'Size'}</label>
                                        <input type="text" name="name" className="form-control" value={variantData.name} onChange={handleVariantInputChange} placeholder="100ml" />
                                    </div>
                                    <div className="form-group">
                                        <label>{isRTL ? 'السعر' : 'Price'}</label>
                                        <input type="number" name="price" className="form-control" value={variantData.price} onChange={handleVariantInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>{isRTL ? 'القديم' : 'Old'}</label>
                                        <input type="number" name="oldPrice" className="form-control" value={variantData.oldPrice} onChange={handleVariantInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>{isRTL ? 'خصم %' : 'Disc %'}</label>
                                        <input type="number" name="discount" className="form-control" value={variantData.discount} onChange={handleVariantInputChange} />
                                    </div>
                                    <button type="button" className="btn btn-gold add-variant-btn" onClick={addSizeTag}>
                                        <Plus size={16} />
                                    </button>
                                </div>

                                {formData.size.length > 0 && (
                                    <div className="variant-list">
                                        {formData.size.map((s, idx) => (
                                            <div key={idx} className="variant-list-item">
                                                <div className="variant-info">
                                                    <span className="variant-name">{s.name}</span>
                                                    <span className="variant-price">{s.price} QAR</span>
                                                    {s.oldPrice && <span className="variant-old-price">{s.oldPrice} QAR</span>}
                                                    {s.discount > 0 && <span className="variant-discount-badge">{s.discount}% OFF</span>}
                                                </div>
                                                <X size={14} className="remove-variant-icon" onClick={() => removeSizeTag(idx)} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        )}

                        {!isEditingLinkedCatalog && (
                            <>
                                {/* Section 4: Categorization & Description */}
                        <div className="form-section-title">
                            <Plus size={16} /> {isRTL ? 'التصنيفات والوصف' : 'Categorization & Description'}
                        </div>
                        <div className="form-group">
                            <label>{isRTL ? 'الفئات' : 'Categories'}</label>
                            <div className="category-pills" style={{ marginBottom: '10px' }}>
                                {[
                                    ...availableCategories,
                                    ...(formData.category || [])
                                        .filter(val => !availableCategories.find(ac => ac.value === val))
                                        .map(val => ({ value: val, label: val.charAt(0).toUpperCase() + val.slice(1) }))
                                ].map(cat => (
                                    <button
                                        type="button"
                                        key={cat.value}
                                        className={`category-pill ${formData.category?.includes(cat.value) ? 'active' : ''}`}
                                        onClick={() => handleCategoryToggle(cat.value)}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder={isRTL ? 'إضافة فئات مخصصة (افصل بينها بفاصلة)...' : 'Add custom categories (comma-separated)...'}
                                    value={customCatInput}
                                    onChange={(e) => setCustomCatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addCustomCategory();
                                        }
                                    }}
                                />
                                <button 
                                    type="button" 
                                    className="btn btn-gold" 
                                    onClick={addCustomCategory}
                                    style={{ height: '44px', padding: '0 20px', whiteSpace: 'nowrap' }}
                                >
                                    {isRTL ? 'إضافة' : 'ADD'}
                                </button>
                            </div>
                        </div>

                        {renderAttributeFields()}

                        <div className="form-group">
                            <label>{isRTL ? 'وصف المنتج' : 'Product Description'}</label>
                            <textarea 
                                name="description" 
                                className="form-control" 
                                value={formData.description} 
                                onChange={handleInputChange} 
                                rows="3"
                                placeholder={isRTL ? 'اكتب وصفاً مفصلاً للمنتج...' : 'Write a detailed product description...'}
                            ></textarea>
                        </div>

                        {/* Section 6: Media */}
                        <div className="form-section-title">
                            <Plus size={16} /> {isRTL ? 'صور المنتج' : 'Product Media (URLs or Upload)'}
                        </div>
                        
                        <div className="image-manage-grid">
                            {formData.images.map((url, idx) => (
                                <div key={idx} className="image-input-row">
                                    <label 
                                        className="image-preview-box"
                                        htmlFor={`file-upload-${idx}`}
                                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        {url ? <img src={url} alt="preview" /> : <Plus size={20} color="#94a3b8" />}
                                    </label>
                                    <input type="file" id={`file-upload-${idx}`} style={{ opacity: 0, position: 'absolute', zIndex: -1, width: '1px', height: '1px', overflow: 'hidden' }} accept="image/*" onChange={(e) => handleImageUpload(idx, e)} />
                                    <div className="image-url-input-container">
                                        <input 
                                            type="url" 
                                            className="form-control" 
                                            value={url} 
                                            onChange={e => handleImageChange(idx, e.target.value)} 
                                            placeholder="https://example.com/image.jpg" 
                                        />
                                        <div className="image-controls">
                                            <span className={`image-badge ${idx === 0 ? 'main' : 'sub'}`}>
                                                {idx === 0 ? (isRTL ? 'الأساسية' : 'MAIN') : (isRTL ? 'إضافية' : 'SUB')}
                                            </span>
                                            <div className="image-action-btns">
                                                {idx > 0 && (
                                                    <button type="button" className="image-action-btn" onClick={() => moveImage(idx, 'up')} title="Move Up">
                                                        ▲
                                                    </button>
                                                )}
                                                {idx < formData.images.length - 1 && (
                                                    <button type="button" className="image-action-btn" onClick={() => moveImage(idx, 'down')} title="Move Down">
                                                        ▼
                                                    </button>
                                                )}
                                                <button type="button" className="image-action-btn danger" onClick={() => removeImageField(idx)} title="Remove Image">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" className="add-image-btn" onClick={addImageField}>
                                <Plus size={20} />
                                <span>{isRTL ? 'إضافة صورة' : 'Add Image'}</span>
                            </button>
                        </div>

                        {/* Section 7: Final Options (Admin Only - not for vendors) */}
                        {!shopId && (
                            <>
                                <div className="premium-marking-section">
                                    <div className="marking-label-group">
                                        <label htmlFor="isNew">{isRTL ? 'تمييز كـ "وصل حديثاً"' : 'Mark as New Arrival'}</label>
                                        <span className="marking-desc">{isRTL ? 'سيظهر في قسم الوصل حديثاً' : 'Will appear in New Arrivals section'}</span>
                                    </div>
                                    <label className="toggle-switch">
                                        <input type="checkbox" name="isNew" id="isNew" checked={formData.isNew} onChange={handleInputChange} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="premium-marking-section">
                                    <div className="marking-label-group">
                                        <label htmlFor="isFeatured">{isRTL ? 'تمييز كـ "منتج مميز"' : 'Mark as Featured Product'}</label>
                                        <span className="marking-desc">{isRTL ? 'سيظهر في شريط الواجهة' : 'Will appear in the Featured sliding banner'}</span>
                                    </div>
                                    <label className="toggle-switch">
                                        <input type="checkbox" name="isFeatured" id="isFeatured" checked={formData.isFeatured} onChange={handleInputChange} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </>
                        )}
                        
                        <div className="premium-marking-section">
                            <div className="marking-label-group">
                                <label htmlFor="pickup_available">{isRTL ? 'تفعيل حجز المتجر' : 'Enable Store Reservation'}</label>
                                <span className="marking-desc">{isRTL ? 'السماح للعملاء بحجز هذا المنتج في المتجر' : 'Allow customers to reserve this product in-store'}</span>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" name="pickup_available" id="pickup_available" checked={formData.pickup_available !== false} onChange={handleInputChange} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <button type="submit" className="btn btn-gold" style={{ flex: '1 0 200px', height: '50px', fontSize: '1.1rem' }}>
                                {editingId ? (isRTL ? 'حفظ التغييرات' : 'Save Changes') : (isRTL ? 'إضافة المنتج النهائي' : 'Add Product')}
                            </button>
                            <button type="button" className="btn btn-slate" onClick={cancelEdit} style={{ flex: '0 0 100px', height: '50px' }}>
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {!isBindingCatalog && (
                <div className="category-tabs-container" style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    flexWrap: 'wrap', 
                    marginBottom: '15px', 
                    padding: '10px 0', 
                    borderBottom: '1px solid #1e293b' 
                }}>
                    {[
                        { id: 'all', labelEn: `All Products (${categoryCounts.all})`, labelAr: `جميع المنتجات (${categoryCounts.all})` },
                        { id: 'perfume', labelEn: `Perfume (${categoryCounts.perfume})`, labelAr: `العطور (${categoryCounts.perfume})` },
                        { id: 'fashion', labelEn: `Fashion (${categoryCounts.fashion})`, labelAr: `الأزياء (${categoryCounts.fashion})` },
                        { id: 'abaya', labelEn: `Exclusive (Abaya) (${categoryCounts.abaya})`, labelAr: `حصري (عبايات) (${categoryCounts.abaya})` },
                        { id: 'giftbox', labelEn: `Gift Box (${categoryCounts.giftbox})`, labelAr: `علب الهدايا (${categoryCounts.giftbox})` },
                        { id: 'jewellery', labelEn: `Jewellery (${categoryCounts.jewellery})`, labelAr: `مجوهرات (${categoryCounts.jewellery})` }
                    ].map(cat => (
                        <button
                            type="button"
                            key={cat.id}
                            className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat.id)}
                            style={{
                                fontSize: '0.85rem',
                                padding: '8px 18px',
                                borderRadius: '20px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isRTL ? cat.labelAr : cat.labelEn}
                        </button>
                    ))}
                </div>
            )}

            <div className="table-responsive">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{isRTL ? 'الصورة' : 'Image'}</th>
                            <th>{isRTL ? 'المنتج' : 'Product'}</th>
                            <th>{isRTL ? 'الماركة' : 'Brand'}</th>
                            <th style={{ whiteSpace: 'nowrap' }}>{isRTL ? 'السعر' : 'Price'}</th>
                            <th style={{ whiteSpace: 'nowrap' }}>{isRTL ? 'المخزون' : 'Stock'}</th>
                            <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{isRTL ? 'الحجز' : 'Reserve'}</th>
                            <th style={{ textAlign: 'center' }}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...shopFilteredProducts]
                            .map((p, index) => ({ ...p, originalIndex: index }))
                            .filter(product => {
                                // Category filter
                                if (selectedCategory !== 'all') {
                                    const cats = Array.isArray(product.category) ? product.category.map(c => c.toLowerCase()) : [];
                                    if (selectedCategory === 'perfume') {
                                        // Not fashion, jewellery, giftbox, gift-box, or abaya
                                        if (cats.includes('fashion') || cats.includes('jewellery') || cats.includes('giftbox') || cats.includes('gift-box') || cats.includes('abaya')) {
                                            return false;
                                        }
                                    } else if (selectedCategory === 'abaya') {
                                        if (!cats.includes('abaya')) return false;
                                    } else if (selectedCategory === 'fashion') {
                                        // Under fashion category but not abaya
                                        if (!cats.includes('fashion') || cats.includes('abaya')) return false;
                                    } else if (selectedCategory === 'giftbox') {
                                        if (!cats.includes('giftbox') && !cats.includes('gift-box')) return false;
                                    } else if (selectedCategory === 'jewellery') {
                                        if (!cats.includes('jewellery')) return false;
                                    }
                                }

                                return product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       product.brand.toLowerCase().includes(searchTerm.toLowerCase());
                            })
                            .sort((a, b) => {
                                if (sortBy === 'newest') return b.originalIndex - a.originalIndex;
                                if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
                                if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
                                if (sortBy === 'price-asc') return a.price - b.price;
                                if (sortBy === 'price-desc') return b.price - a.price;
                                if (sortBy === 'stock-asc') return (a.stock || 0) - (b.stock || 0);
                                if (sortBy === 'stock-desc') return (b.stock || 0) - (a.stock || 0);
                                return a.originalIndex - b.originalIndex; // default
                            })
                            .map(product => {
                                const shopInventory = shopId ? product.inventories?.find(inv => String(inv.shop_id) === String(shopId)) : null;
                                const displayPrice = shopInventory ? shopInventory.price : product.price;
                                const displayOldPrice = shopInventory ? null : product.oldPrice;
                                const displayDiscount = shopInventory ? 0 : product.discount;
                                const displayStock = shopInventory ? shopInventory.stock : (product.stock !== undefined ? product.stock : 10);

                                return (
                                    <tr key={product.id}>
                                        <td>
                                            <div style={{ width: '50px', height: '50px', position: 'relative' }}>
                                                <img 
                                                    src={Array.isArray(product.image) ? product.image[0] : product.image} 
                                                    alt={product.name} 
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                                <div className="admin-img-placeholder" style={{ display: 'none', width: '100%', height: '100%' }}>
                                                    <ImageOff size={20} />
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600', marginBottom: '2px', color: '#f8fafc' }}>{product.name}</div>
                                            <small style={{ color: '#cbd5e1', display: 'block' }}>
                                                {Array.isArray(product.size) 
                                                    ? product.size.map(s => typeof s === 'object' ? s.name : s).join(', ') 
                                                    : product.size}
                                            </small>
                                            {!shopId && (
                                                <div style={{ marginTop: '6px' }}>
                                                    {product.shop_id ? (
                                                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'var(--color-gold)', color: '#fff', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            {shopsData.find(s => String(s.id) === String(product.shop_id))?.name || 'Vendor'}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: '#334155', color: '#fff', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                             {isRTL ? 'نورث كلوب باريس' : 'North Club Paris'}
                                                         </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>{product.brand}</td>
                                        <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top', paddingTop: '16px' }}>
                                            <div className="price-display-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '100px' }}>
                                                <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '1.1rem' }}>
                                                    {displayPrice} {isRTL ? 'ر.ق' : 'QAR'}
                                                </div>
                                                {displayOldPrice && (
                                                    <div style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.85rem' }}>
                                                        {displayOldPrice} {isRTL ? 'ر.ق' : 'QAR'}
                                                    </div>
                                                )}
                                                {displayDiscount > 0 && (
                                                    <span style={{ 
                                                        backgroundColor: '#ef4444', 
                                                        color: 'white', 
                                                        padding: '4px 8px', 
                                                        borderRadius: '6px', 
                                                        fontSize: '0.75rem', 
                                                        fontWeight: 'bold', 
                                                        width: 'fit-content',
                                                        display: 'inline-block',
                                                        whiteSpace: 'nowrap',
                                                        marginTop: '2px'
                                                    }}>
                                                        {displayDiscount}% OFF
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                                            <span style={{ 
                                                fontWeight: '700', 
                                                color: displayStock > 10 ? '#22c55e' : (displayStock > 0 ? '#f59e0b' : '#ef4444'),
                                                fontSize: '1.1rem'
                                            }}>
                                                {displayStock}
                                            </span>
                                        </td>
                                        <td style={{ verticalAlign: 'top', paddingTop: '16px', textAlign: 'center' }}>
                                            {(() => {
                                                const isPickupAvailable = shopInventory 
                                                    ? shopInventory.pickup_available !== false 
                                                    : product.pickup_available !== false;
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            await toggleReservation(product);
                                                        }}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            outline: 'none',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: '4px'
                                                        }}
                                                        title={isRTL ? 'تشغيل/إيقاف حجز المتجر' : 'Toggle Shop Reservation'}
                                                    >
                                                        <div style={{
                                                            width: '38px',
                                                            height: '20px',
                                                            backgroundColor: isPickupAvailable ? '#22c55e' : '#475569',
                                                            borderRadius: '10px',
                                                            position: 'relative',
                                                            transition: 'background-color 0.2s'
                                                        }}>
                                                            <div style={{
                                                                width: '16px',
                                                                height: '16px',
                                                                backgroundColor: '#ffffff',
                                                                borderRadius: '50%',
                                                                position: 'absolute',
                                                                top: '2px',
                                                                left: isPickupAvailable ? '20px' : '2px',
                                                                transition: 'left 0.2s'
                                                            }} />
                                                        </div>
                                                    </button>
                                                );
                                            })()}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button 
                                                    type="button" 
                                                    className="admin-action-btn edit-btn" 
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(product); }} 
                                                    title={isRTL ? 'تعديل' : 'Edit'}
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="admin-action-btn delete-btn" 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(product.id, product.name); }} 
                                                    title={isRTL ? 'حذف' : 'Delete'}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        {products.length === 0 && (
                            <tr>
                                <td colSpan="7" className="text-center">{isRTL ? 'لا توجد منتجات' : 'No products found'}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmDelete}
                title={isRTL ? 'تأكيد الأرشفة' : 'ARCHIVE PRODUCT ITEM'}
                message={isRTL 
                    ? `هل أنت متأكد أنك تريد أرشفة "${confirmModal.productName}"؟ يمكنك استعادته لاحقاً من قسم الاسترداد.` 
                    : `This will move "${confirmModal.productName}" to the recovery archive. You may restore it at any time from the Recovery section.`
                }
                confirmText={isRTL ? 'أرشفة الآن' : 'ARCHIVE NOW'}
                cancelText={isRTL ? 'إلغاء' : 'CANCEL'}
                isRTL={isRTL}
                variant="danger"
                isPremium={true}
                iconType="archive"
            />
        </div>
    );
};

export default ProductManager;
