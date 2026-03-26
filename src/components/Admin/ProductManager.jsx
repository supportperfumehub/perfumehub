import React, { useState, useContext } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { Edit, Trash2, Plus, X, ImagePlus, Search, ImageOff } from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';

const typeCodes = {
    'Parfum': 'P',
    'EDP (Eau de Parfum)': 'EP',
    'EDT (Eau de Toilette)': 'ET',
    'EDC (Eau de Cologne)': 'EC',
    'Eau Fraîche': 'EF'
};

const ProductManager = ({ isRTL }) => {
    const { products, addProduct, updateProduct, deleteProduct } = useContext(ShopContext);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('default');
    const [isSkuAuto, setIsSkuAuto] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ 
        isOpen: false, 
        productId: null, 
        productName: '' 
    });

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
        stock: 10,
        sku: '',
        description: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [variantData, setVariantData] = useState({ name: '', price: '', oldPrice: '', discount: '' });
    const [customCatInput, setCustomCatInput] = useState('');

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
            
            // Get code from mapping or use first 2 chars of custom type
            let typeCode = typeCodes[formData.type];
            if (!typeCode && formData.type) {
                typeCode = formatSegment(formData.type, 2);
            }
            typeCode = typeCode || '';
            
            let segments = [];
            if (cleanBrand) segments.push(cleanBrand);
            if (cleanName) segments.push(cleanName);
            if (typeCode) segments.push(typeCode);

            setFormData(prev => ({ ...prev, sku: segments.join('-') }));
        }
    }, [formData.brand, formData.name, formData.type, isSkuAuto, editingId]);

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
        // Core Categories
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

        // Popular Perfume Notes
        { value: 'vanilla', label: 'Vanilla' },
        { value: 'oud', label: 'Oud' },
        { value: 'rose', label: 'Rose' },
        { value: 'jasmine', label: 'Jasmine' },
        { value: 'amber', label: 'Amber' },
        { value: 'patchouli', label: 'Patchouli' },
        { value: 'sandalwood', label: 'Sandalwood' },
        { value: 'bergamot', label: 'Bergamot' },
        { value: 'leather', label: 'Leather' },
        { value: 'vetiver', label: 'Vetiver' },
        { value: 'lavender', label: 'Lavender' },
        { value: 'neroli', label: 'Neroli' },
        { value: 'cedar', label: 'Cedar' },

        // Special Categories
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
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleImageChange(index, reader.result);
            };
            reader.readAsDataURL(file);
        }
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
            price: basePrice,
            oldPrice: baseOldPrice,
            discount: baseDiscount,
            stock: formData.stock !== undefined ? Number(formData.stock) : Number(formData.stock) || 0,
            sku: formData.sku?.trim() || '',
            description: formData.description?.trim() || '',
            topNotes: formData.topNotes?.trim() || '',
            middleNotes: formData.middleNotes?.trim() || '',
            baseNotes: formData.baseNotes?.trim() || ''
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
        setFormData({
            ...product,
            size: sanitizedSizes,
            images: imageArray,
            sku: product.sku || '',
            description: product.description || '',
            topNotes: product.topNotes || '',
            middleNotes: product.middleNotes || '',
            baseNotes: product.baseNotes || ''
        });
        setEditingId(product.id);
        setIsSkuAuto(false); // Set to false when editing existing product to prevent accidental changes
        setShowForm(true);
        window.scrollTo(0, 0);
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
    };

    return (
        <div className="manager-content">
            <div className="manager-header">
                <h2>{isRTL ? 'إدارة المنتجات' : 'Product Management'}</h2>
                <div className="manager-header-actions">
                    {!showForm && (
                        <div>
                            <div className="admin-search-container">
                                <input
                                    type="text"
                                    placeholder={isRTL ? 'ابحث عن منتج أو ماركة...' : 'Search product or brand...'}
                                    className="form-control admin-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <div className="admin-search-icon">
                                    <Search size={18} />
                                </div>
                            </div>
                            <select 
                                className="form-control" 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                                style={{ height: '44px', minWidth: '150px' }}
                            >
                                <option value="default">{isRTL ? 'الترتيب الافتراضي' : 'Default Sort'}</option>
                                <option value="newest">{isRTL ? 'مضاف حديثاً' : 'Newly Added (Newest First)'}</option>
                                <option value="name-asc">{isRTL ? 'الاسم (أ-ي)' : 'Name (A-Z)'}</option>
                                <option value="name-desc">{isRTL ? 'الاسم (ي-أ)' : 'Name (Z-A)'}</option>
                                <option value="price-asc">{isRTL ? 'السعر (من الأقل للأعلى)' : 'Price (Low to High)'}</option>
                                <option value="price-desc">{isRTL ? 'السعر (من الأعلى للأقل)' : 'Price (High to Low)'}</option>
                                <option value="stock-asc">{isRTL ? 'المخزون (من الأقل للأعلى)' : 'Stock (Low to High)'}</option>
                                <option value="stock-desc">{isRTL ? 'المخزون (من الأعلى للأقل)' : 'Stock (High to Low)'}</option>
                            </select>
                        </div>
                    )}
                    {!showForm && (
                        <button className="btn btn-gold" onClick={() => setShowForm(true)} style={{ height: '44px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                            <Plus size={18} style={{ margin: isRTL ? '0 0 0 8px' : '0 8px 0 0' }} />
                            {isRTL ? 'إضافة منتج جديد' : 'Add New Product'}
                        </button>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="admin-form animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>
                            {editingId ? (isRTL ? 'تعديل المنتج' : 'Edit Product') : (isRTL ? 'إضافة منتج جديد' : 'Add New Product')}
                        </h3>
                        <button onClick={cancelEdit} className="admin-action-btn" style={{ margin: 0 }}><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSubmit}>
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
                                <label>{isRTL ? 'التصنيف' : 'Gender'}</label>
                                <select name="gender" className="form-control" value={formData.gender} onChange={handleInputChange}>
                                    <option value="men">{isRTL ? 'رجالي' : 'Men'}</option>
                                    <option value="women">{isRTL ? 'نسائي' : 'Women'}</option>
                                    <option value="unisex">{isRTL ? 'للجنسين' : 'Unisex'}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'نوع العطر' : 'Fragrance Type'}</label>
                                <input 
                                    list="fragrance-types" 
                                    name="type" 
                                    className="form-control" 
                                    value={formData.type} 
                                    onChange={handleInputChange}
                                    placeholder={isRTL ? 'اختر أو اكتب...' : 'Select or type...'}
                                />
                                <datalist id="fragrance-types">
                                    <option value="Parfum">Parfum</option>
                                    <option value="EDP (Eau de Parfum)">EDP (Eau de Parfum)</option>
                                    <option value="EDT (Eau de Toilette)">EDT (Eau de Toilette)</option>
                                    <option value="EDC (Eau de Cologne)">EDC (Eau de Cologne)</option>
                                    <option value="Eau Fraîche">Eau Fraîche</option>
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

                        {/* Dual Column Section: Pricing & Variants */}
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
                                
                                <div className="variant-input-group" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '12px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>{isRTL ? 'الحجم' : 'Size'}</label>
                                        <input type="text" name="name" className="form-control" value={variantData.name} onChange={handleVariantInputChange} placeholder="100ml" />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>{isRTL ? 'السعر' : 'Price'}</label>
                                        <input type="number" name="price" className="form-control" value={variantData.price} onChange={handleVariantInputChange} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>{isRTL ? 'القديم' : 'Old'}</label>
                                        <input type="number" name="oldPrice" className="form-control" value={variantData.oldPrice} onChange={handleVariantInputChange} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>{isRTL ? 'خصم %' : 'Disc %'}</label>
                                        <input type="number" name="discount" className="form-control" value={variantData.discount} onChange={handleVariantInputChange} />
                                    </div>
                                    <button type="button" className="btn btn-gold" onClick={addSizeTag} style={{ height: '38px', padding: '0 10px' }}>
                                        <Plus size={16} />
                                    </button>
                                </div>

                                {formData.size.length > 0 && (
                                    <div className="category-pills" style={{ marginBottom: '10px', padding: '8px', background: '#fff', borderRadius: '8px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {formData.size.map((s, idx) => (
                                            <div key={idx} className="variant-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f9f9f9', borderRadius: '6px', fontSize: '0.85rem' }}>
                                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 700, minWidth: '50px' }}>{s.name}</span>
                                                    <span style={{ color: 'var(--color-gold)' }}>{s.price} QAR</span>
                                                    {s.oldPrice && <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '0.75rem' }}>{s.oldPrice} QAR</span>}
                                                    {s.discount > 0 && <span style={{ background: '#d32f2f', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>{s.discount}% OFF</span>}
                                                </div>
                                                <X size={14} onClick={() => removeSizeTag(idx)} style={{ cursor: 'pointer', color: '#cc0000' }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

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
                                <div key={idx} className="image-input-card">
                                    <div 
                                        style={{ width: '50px', height: '50px', borderRadius: '6px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
                                        onClick={() => document.getElementById(`file-upload-${idx}`).click()}
                                    >
                                        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Plus size={20} color="#999" />}
                                        <input type="file" id={`file-upload-${idx}`} hidden accept="image/*" onChange={(e) => handleImageUpload(idx, e)} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input 
                                            type="url" 
                                            className="form-control" 
                                            value={url} 
                                            onChange={e => handleImageChange(idx, e.target.value)} 
                                            placeholder="Image URL" 
                                            style={{ marginBottom: '4px', padding: '6px 10px', fontSize: '0.85rem' }} 
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#888' }}>{idx === 0 ? (isRTL ? 'الأساسية' : 'MAIN') : (isRTL ? 'إضافية' : 'SUB')}</span>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                {idx > 0 && <button type="button" onClick={() => moveImage(idx, 'up')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}>▲</button>}
                                                {idx < formData.images.length - 1 && <button type="button" onClick={() => moveImage(idx, 'down')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}>▼</button>}
                                                <X size={14} color="#e74c3c" onClick={() => removeImageField(idx)} style={{ cursor: 'pointer' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button 
                                type="button" 
                                className="image-input-card" 
                                onClick={addImageField}
                                style={{ justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', background: 'transparent' }}
                            >
                                <Plus size={24} color="var(--color-gold)" />
                                <span style={{ fontWeight: 600, color: 'var(--color-gold)' }}>{isRTL ? 'إضافة صورة' : 'Add Image'}</span>
                            </button>
                        </div>

                        {/* Section 7: Final Options */}
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

                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <button type="submit" className="btn btn-gold" style={{ flex: '1 0 200px', height: '50px', fontSize: '1.1rem' }}>
                                {editingId ? (isRTL ? 'حفظ التغييرات' : 'Save Changes') : (isRTL ? 'إضافة المنتج النهائي' : 'Add Product')}
                            </button>
                            <button type="button" className="btn btn-outline" onClick={cancelEdit} style={{ flex: '0 0 100px', height: '50px' }}>
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="table-responsive">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{isRTL ? 'الصورة' : 'Image'}</th>
                            <th>{isRTL ? 'المنتج' : 'Product'}</th>
                            <th>{isRTL ? 'الماركة' : 'Brand'}</th>
                            <th>{isRTL ? 'السعر' : 'Price'}</th>
                            <th>{isRTL ? 'المخزون' : 'Stock'}</th>
                            <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...products]
                            .map((p, index) => ({ ...p, originalIndex: index }))
                            .filter(product =>
                                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                product.brand.toLowerCase().includes(searchTerm.toLowerCase())
                            )
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
                            .map(product => (
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
                                        <div style={{ fontWeight: '600', marginBottom: '2px' }}>{product.name}</div>
                                        <small style={{ color: '#888', display: 'block' }}>
                                            {Array.isArray(product.size) 
                                                ? product.size.map(s => typeof s === 'object' ? s.name : s).join(', ') 
                                                : product.size}
                                        </small>
                                    </td>
                                    <td>{product.brand}</td>
                                    <td>
                                        <div className="price-display-wrapper">
                                            <div style={{ fontWeight: '600' }}>
                                                {product.price} {isRTL ? 'ر.ق' : 'QAR'}
                                            </div>
                                            {product.oldPrice ? (
                                                <div style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.85em' }}>
                                                    {product.oldPrice} {isRTL ? 'ر.ق' : 'QAR'}
                                                </div>
                                            ) : (
                                                <div style={{ height: '1.2em' }}></div> /* Spacer for alignment */
                                            )}
                                            {product.discount > 0 ? (
                                                <span style={{ backgroundColor: '#d32f2f', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7em', fontWeight: 'bold', width: 'fit-content' }}>
                                                    {product.discount}% OFF
                                                </span>
                                            ) : (
                                                <div style={{ height: '1.4em' }}></div> /* Spacer for alignment */
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 'bold', color: product.stock > 0 ? 'green' : 'red' }}>
                                            {product.stock !== undefined ? product.stock : 10}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="admin-action-btn edit-btn" onClick={() => handleEdit(product)} title={isRTL ? 'تعديل' : 'Edit'}>
                                            <Edit size={18} />
                                        </button>
                                        <button className="admin-action-btn delete-btn" onClick={() => handleDelete(product.id, product.name)} title={isRTL ? 'حذف' : 'Delete'}>
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        {products.length === 0 && (
                            <tr>
                                <td colSpan="5" className="text-center">{isRTL ? 'لا توجد منتجات' : 'No products found'}</td>
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
