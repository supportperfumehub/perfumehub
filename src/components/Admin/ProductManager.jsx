import React, { useState, useContext } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import { Edit, Trash2, Plus, X, ImagePlus, Search, ImageOff, Store, ChevronDown, Sparkles, Shirt, Diamond, Gift, Package, AlertTriangle, ShieldCheck, Upload, FileSpreadsheet, Download, CheckCircle, GripVertical } from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';
import api from '../../utils/api_v1_0_2';

const typeCodes = {
    'Parfum': 'P',
    'EDP (Eau de Parfum)': 'EP',
    'EDT (Eau de Toilette)': 'ET',
    'EDC (Eau de Cologne)': 'EC',
    'Eau Fraîche': 'EF'
};

const luxuryAccords = [
    { en: 'Woody', ar: 'خشبي' },
    { en: 'Amber', ar: 'عنبري' },
    { en: 'Floral', ar: 'زهري' },
    { en: 'Citrus', ar: 'حمضيات' },
    { en: 'Fresh Spicy', ar: 'توابل منعشة' },
    { en: 'Oriental', ar: 'شرقي' },
    { en: 'Gourmand', ar: 'حلو / جورماند' },
    { en: 'Aquatic', ar: 'مائي / بحري' },
    { en: 'Leathery', ar: 'جلدي' },
    { en: 'Musky', ar: 'مسكي' },
    { en: 'Fruity', ar: 'فاكهي' },
    { en: 'Smoky', ar: 'دخاني / بخور' }
];

const ProductManager = ({ isRTL, shopId, hideHeader, activeTerritoryId, adminRegions, isVendorContext = false }) => {
    const { products, addProduct, updateProduct, deleteProduct, addInventory, deleteInventory } = useContext(ShopContext);
    const { user } = useContext(AuthContext);
    const isRegionalAdmin = user?.role === 'regional_admin';
    const isRegionalAdminTerritoryMode = isRegionalAdmin && !shopId && !isVendorContext;
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isBindingCatalog, setIsBindingCatalog] = useState(false);
    const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);
    const [showAddChoiceModal, setShowAddChoiceModal] = useState(false);
    const [showCsvModal, setShowCsvModal] = useState(false);
    const [csvParsedProducts, setCsvParsedProducts] = useState([]);
    const [csvParseErrors, setCsvParseErrors] = useState([]);
    const [isCsvImporting, setIsCsvImporting] = useState(false);
    const [csvImportProgress, setCsvImportProgress] = useState(0);
    const [csvImportSuccessCount, setCsvImportSuccessCount] = useState(null);
    const [draggedImageIdx, setDraggedImageIdx] = useState(null);
    const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
    const [globalCatalog, setGlobalCatalog] = useState([]);
    const [loadingCatalog, setLoadingCatalog] = useState(false);

    React.useEffect(() => {
        if (isBindingCatalog) {
            const fetchGlobalCatalog = async () => {
                try {
                    const response = await api.get('/products?limit=100');
                    const prods = Array.isArray(response.data) ? response.data : (response.data?.products || []);
                    setGlobalCatalog(prods);
                } catch (error) {
                    console.error("Failed to fetch global catalog:", error);
                } finally {
                    setLoadingCatalog(false);
                }
            };
            fetchGlobalCatalog();
        }
    }, [isBindingCatalog]);

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
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
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

        if (name === 'price' || name === 'oldPrice' || name === 'discount') {
            if (Array.isArray(updated.size) && updated.size.length > 0) {
                const currentP = Number(updated.price) || 0;
                const currentOldP = updated.oldPrice ? Number(updated.oldPrice) : null;
                const currentDisc = updated.discount ? Number(updated.discount) : 0;
                updated.size = updated.size.map((sz, idx) => {
                    if (idx === 0 || updated.size.length === 1) {
                        return typeof sz === 'object'
                            ? { ...sz, price: currentP, oldPrice: currentOldP, discount: currentDisc }
                            : { name: sz, price: currentP, oldPrice: currentOldP, discount: currentDisc };
                    }
                    return sz;
                });
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

    const moveImageTo = (fromIndex, toIndex) => {
        if (fromIndex === null || toIndex === null || fromIndex === toIndex) return;
        const updatedImages = [...formData.images];
        const [movedItem] = updatedImages.splice(fromIndex, 1);
        updatedImages.splice(toIndex, 0, movedItem);
        setFormData({ ...formData, images: updatedImages });
    };

    const parseCsvLine = (text) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += char;
            }
        }
        result.push(cur.trim());
        return result;
    };

    const downloadCsvTemplate = () => {
        const headers = 'name,brand,type,price,old_price,stock,gender,top_notes,middle_notes,base_notes,description,description_ar,categories\n';
        const sampleRows = [
            '"Royal Oud Imperial","North Club Paris","EDP (Eau de Parfum)",750,950,25,"unisex","Calabrian Bergamot, Pink Pepper","Cambodian Agarwood, Bulgarian Rose","Smoky Amber, Mysore Sandalwood","An exquisite blend of aged Cambodian oud and velvety damascena rose.","مزيج ساحر من العود الكمبودي المعتق والورد الدمشقي المخملي مع لمسات عنبرية فاخرة.","perfume,luxury,arabic,woody"',
            '"Velvet Amber Silk","North Club Paris","Parfum",880,1100,18,"women","Sicilian Mandarin, Neroli","Amber Resin, Jasmine Sambac","Madagascar Vanilla, White Musk","Sumptuous golden amber infused with radiant white florals.","عنبر ذهبي ساحر مع نفحات الياسمين الملكي والفانيليا الفاخرة.","perfume,luxury,oriental,sweet"'
        ].join('\n');
        
        const blob = new Blob(['\uFEFF' + headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'perfumehub_products_catalog_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCsvFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const content = evt.target.result;
                const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
                if (lines.length < 2) {
                    alert(isRTL ? 'ملف CSV فارغ أو لا يحتوي على صفوف بيانات' : 'CSV file is empty or missing data rows');
                    return;
                }
                const headerLine = lines[0];
                const headers = parseCsvLine(headerLine).map(h => h.toLowerCase().replace(/[\s_-]+/g, ''));
                
                const nameIdx = headers.indexOf('name');
                const brandIdx = headers.indexOf('brand');
                const typeIdx = headers.indexOf('type');
                const priceIdx = headers.indexOf('price');
                const oldPriceIdx = headers.indexOf('oldprice');
                const stockIdx = headers.indexOf('stock');
                const genderIdx = headers.indexOf('gender');
                const topNotesIdx = headers.indexOf('topnotes');
                const midNotesIdx = headers.indexOf('middlenotes');
                const baseNotesIdx = headers.indexOf('basenotes');
                const descIdx = headers.indexOf('description');
                const descArIdx = headers.indexOf('descriptionar');
                const catsIdx = headers.indexOf('categories');

                if (nameIdx === -1 || brandIdx === -1 || priceIdx === -1) {
                    alert(isRTL ? 'الملف يفتقر للأعمدة الإلزامية: name, brand, price' : 'CSV missing mandatory columns: name, brand, price');
                    return;
                }

                const parsed = [];
                const errors = [];

                for (let i = 1; i < lines.length; i++) {
                    const cols = parseCsvLine(lines[i]);
                    if (cols.length === 0 || cols.every(c => !c)) continue;

                    const name = cols[nameIdx] || '';
                    const brand = cols[brandIdx] || '';
                    const price = parseFloat(cols[priceIdx]);
                    const oldPrice = oldPriceIdx !== -1 && cols[oldPriceIdx] ? parseFloat(cols[oldPriceIdx]) : null;
                    const stock = stockIdx !== -1 && cols[stockIdx] ? parseInt(cols[stockIdx], 10) : 10;
                    const type = (typeIdx !== -1 && cols[typeIdx]) || 'EDP (Eau de Parfum)';
                    const gender = (genderIdx !== -1 && cols[genderIdx]) || 'unisex';
                    const topNotes = topNotesIdx !== -1 ? cols[topNotesIdx] : '';
                    const middleNotes = midNotesIdx !== -1 ? cols[midNotesIdx] : '';
                    const baseNotes = baseNotesIdx !== -1 ? cols[baseNotesIdx] : '';
                    const description = descIdx !== -1 ? cols[descIdx] : '';
                    const description_ar = descArIdx !== -1 ? cols[descArIdx] : '';
                    const rawCats = catsIdx !== -1 && cols[catsIdx] ? cols[catsIdx].split(',').map(c => c.trim().toLowerCase()).filter(Boolean) : ['perfume'];

                    const cleanBrand = brand.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 2) || 'PH';
                    const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 2) || 'PR';
                    const typeCode = typeCodes[type] || 'EP';
                    const autoSku = `${cleanBrand}-${cleanName}-${typeCode}`;

                    const rowErrors = [];
                    if (!name) rowErrors.push('Missing Name');
                    if (!brand) rowErrors.push('Missing Brand');
                    if (isNaN(price) || price <= 0) rowErrors.push('Invalid Price');

                    if (rowErrors.length > 0) {
                        errors.push({ row: i + 1, name: name || 'Unnamed', errors: rowErrors });
                    } else {
                        parsed.push({
                            name,
                            brand,
                            type,
                            price,
                            oldPrice: (!isNaN(oldPrice) && oldPrice > price) ? oldPrice : null,
                            discount: (!isNaN(oldPrice) && oldPrice > price) ? Math.round((1 - price / oldPrice) * 100) : 0,
                            stock: isNaN(stock) ? 10 : stock,
                            gender,
                            topNotes,
                            middleNotes,
                            baseNotes,
                            description,
                            sku: autoSku,
                            category: rawCats,
                            images: [''],
                            attributes: {
                                description_ar
                            }
                        });
                    }
                }

                setCsvParsedProducts(parsed);
                setCsvParseErrors(errors);
                setCsvImportSuccessCount(null);
            } catch (err) {
                console.error("CSV parse error:", err);
                alert(isRTL ? 'خطأ أثناء قراءة ملف CSV' : 'Error reading CSV file');
            }
        };
        reader.readAsText(file);
    };

    const executeCsvBatchImport = async () => {
        if (csvParsedProducts.length === 0) return;
        setIsCsvImporting(true);
        setCsvImportProgress(0);
        let successCount = 0;

        for (let i = 0; i < csvParsedProducts.length; i++) {
            const prod = csvParsedProducts[i];
            try {
                await addProduct({
                    ...prod,
                    shop_id: shopId || 'core'
                });
                successCount++;
            } catch (err) {
                console.error(`Failed to import product row ${i + 1}:`, err);
            }
            setCsvImportProgress(Math.round(((i + 1) / csvParsedProducts.length) * 100));
        }

        setIsCsvImporting(false);
        setCsvImportSuccessCount(successCount);
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

    const handleAiAutofill = async () => {
        if (!formData.name) return;
        setIsAiLoading(true);
        try {
            const response = await api.post('/products/ai-autofill', { prompt: formData.name });
            const data = response.data;
            if (data) {
                setFormData(prev => ({
                    ...prev,
                    brand: data.brand || prev.brand,
                    type: data.type || prev.type,
                    gender: data.gender || prev.gender,
                    description: data.description || prev.description,
                    topNotes: data.topNotes || prev.topNotes,
                    middleNotes: data.middleNotes || prev.middleNotes,
                    baseNotes: data.baseNotes || prev.baseNotes,
                    notes: Array.isArray(data.accords) ? data.accords : (Array.isArray(data.notes) ? data.notes : prev.notes),
                    category: Array.isArray(data.categories) ? data.categories : prev.category,
                    attributes: {
                        ...(prev.attributes || {}),
                        description_ar: data.description_ar || prev.attributes?.description_ar || '',
                        longevity: data.longevity || prev.attributes?.longevity || '',
                        sillage: data.sillage || prev.attributes?.sillage || '',
                        seasons: data.seasons || prev.attributes?.seasons || [],
                        occasions: data.occasions || prev.attributes?.occasions || []
                    }
                }));
                alert(isRTL ? '✨ تم استكمال كافة البيانات العطرية والأهرام الشمية بنجاح!' : '✨ Luxury olfactive pyramid & bilingual metadata autofilled!');
            }
        } catch (error) {
            console.error("AI Autofill failed:", error);
            alert(isRTL ? 'فشل الملء التلقائي الذكي' : 'Smart Autofill failed');
        } finally {
            setIsAiLoading(false);
        }
    };

    const processFiles = (files) => {
        Array.from(files).forEach((file) => {
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

                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                        
                        setFormData(prev => {
                            const currentImages = prev.images.filter(imgUrl => imgUrl !== '');
                            return {
                                ...prev,
                                images: [...currentImages, compressedBase64]
                            };
                        });

                        URL.revokeObjectURL(objectUrl);
                        window._activeImageRefs.delete(img);
                    } catch (loadErr) {
                        console.error("Error during image load processing:", loadErr);
                        URL.revokeObjectURL(objectUrl);
                        window._activeImageRefs.delete(img);
                    }
                };
                img.onerror = () => {
                    console.error("Failed to load image object.");
                    URL.revokeObjectURL(objectUrl);
                    window._activeImageRefs.delete(img);
                };
                img.src = objectUrl;
            }
        });
    };

    const handleImageDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        if (e.dataTransfer.files) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleBulkImageUpload = (e) => {
        if (e.target.files) {
            processFiles(e.target.files);
            e.target.value = ''; // Reset
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

    const getDepartmentPresets = () => {
        const cats = formData.category || [];
        if (cats.includes('fashion')) {
            return ['52', '54', '56', '58', '60', 'Free Size', 'S', 'M', 'L', 'XL'];
        }
        if (cats.includes('jewellery')) {
            return ['Sz 5', 'Sz 6', 'Sz 7', 'Sz 8', '40cm', '45cm', '50cm', 'One Size'];
        }
        if (cats.includes('giftbox') || cats.includes('gift-box')) {
            return ['Standard Box', 'Deluxe Box', 'VIP Royal Chest', 'Mini Set'];
        }
        return ['30ml', '50ml', '75ml', '100ml', '125ml', '200ml'];
    };

    const renderAttributeFields = () => {
        const categories = formData.category || [];
        const isFashion = categories.includes('fashion');
        const isJewellery = categories.includes('jewellery');
        const isGiftBox = categories.includes('giftbox') || categories.includes('gift-box');
        const isPerfume = !isFashion && !isJewellery && !isGiftBox;

        const attributes = formData.attributes || {};

        let deptTitle = isRTL ? 'مواصفات ومكونات العطر (Perfume Specifications)' : 'Perfume Specifications & Fragrance Profile';
        let deptIcon = <Sparkles size={18} color="#c8a951" />;
        let deptColor = '#c8a951';

        if (isFashion) {
            deptTitle = isRTL ? 'مواصفات الأزياء والعبايات (Fashion & Abaya Features)' : 'Fashion & Abaya Specifications';
            deptIcon = <Shirt size={18} color="#ec4899" />;
            deptColor = '#ec4899';
        } else if (isJewellery) {
            deptTitle = isRTL ? 'مواصفات المجوهرات والساعات (Jewellery & Watch Features)' : 'Jewellery & Watch Specifications';
            deptIcon = <Diamond size={18} color="#38bdf8" />;
            deptColor = '#38bdf8';
        } else if (isGiftBox) {
            deptTitle = isRTL ? 'مواصفات صندوق الهدايا والمحتويات (Gift Box Features)' : 'Gift Box Specifications & Contents';
            deptIcon = <Gift size={18} color="#f59e0b" />;
            deptColor = '#f59e0b';
        }

        return (
            <div 
                className="form-column-attributes animate-fade-in" 
                style={{ 
                    marginTop: '20px', 
                    padding: '20px', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: `1px solid ${deptColor}44`, 
                    borderRadius: '14px', 
                    marginBottom: '20px',
                    boxShadow: `0 4px 20px rgba(0,0,0,0.2), inset 0 0 20px ${deptColor}08`
                }}
            >
                <div className="form-section-title" style={{ marginTop: 0, color: deptColor, display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '12px', marginBottom: '18px', fontSize: '1rem', fontWeight: '700' }}>
                    {deptIcon}
                    <span>{deptTitle}</span>
                </div>
                
                {isPerfume && (
                    <>
                        <div className="form-row grid-3" style={{ gap: '15px', marginBottom: '15px' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.85rem' }}>{isRTL ? 'الإفتتاحية (Top Notes)' : 'Top Notes'}</label>
                                <textarea 
                                    name="topNotes" 
                                    className="form-control" 
                                    value={formData.topNotes || ''} 
                                    onChange={handleInputChange} 
                                    placeholder={isRTL ? 'مثال: برغموت، تفاح، كشمش أسود' : 'e.g. Bergamot, Blackcurrant, Apple'}
                                    rows="2"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.85rem' }}>{isRTL ? 'القلب (Middle Notes)' : 'Middle Notes'}</label>
                                <textarea 
                                    name="middleNotes" 
                                    className="form-control" 
                                    value={formData.middleNotes || ''} 
                                    onChange={handleInputChange} 
                                    placeholder={isRTL ? 'مثال: خشب البتولا، الباتشولي، ياسمين' : 'e.g. Birch, Patchouli, Moroccan Jasmine'}
                                    rows="2"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.85rem' }}>{isRTL ? 'القاعدة (Base Notes)' : 'Base Notes'}</label>
                                <textarea 
                                    name="baseNotes" 
                                    className="form-control" 
                                    value={formData.baseNotes || ''} 
                                    onChange={handleInputChange} 
                                    placeholder={isRTL ? 'مثال: المسك، طحلب البلوط، العنبر، الفانيليا' : 'e.g. Musk, Oakmoss, Ambergris, Vanilla'}
                                    rows="2"
                                />
                            </div>
                        </div>

                        <div className="form-row grid-3" style={{ gap: '15px' }}>
                            <div className="form-group">
                                <label>{isRTL ? 'عائلة العطر (Scent Family)' : 'Scent Family'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.scentFamily || ''} 
                                    onChange={(e) => handleAttributeChange('scentFamily', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: شرقي خشبي / عنبر زهري' : 'e.g. Oriental Woody / Amber Floral'}
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'درجة الثبات (Longevity)' : 'Longevity'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.longevity || ''} 
                                    onChange={(e) => handleAttributeChange('longevity', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: طويل جداً (8-12 ساعة)' : 'e.g. Long Lasting (8-12 hrs)'}
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'الفوحان (Sillage / Projection)' : 'Sillage / Projection'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.sillage || ''} 
                                    onChange={(e) => handleAttributeChange('sillage', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: قوي وجذاب' : 'e.g. Strong / Enormous'}
                                />
                            </div>
                        </div>

                        {/* Luxury Olfactive Accords */}
                        <div className="form-group" style={{ marginTop: '15px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                ✨ {isRTL ? 'الطبقات والسمات الشمية الفاخرة (Accords):' : 'Luxury Fragrance Accords (Click to select):'}
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                {luxuryAccords.map(accord => {
                                    const currentAccords = Array.isArray(formData.notes) 
                                        ? formData.notes 
                                        : (Array.isArray(attributes.accords) ? attributes.accords : []);
                                    const isSelected = currentAccords.includes(accord.en);
                                    return (
                                        <button
                                            type="button"
                                            key={accord.en}
                                            onClick={() => {
                                                const updated = isSelected 
                                                    ? currentAccords.filter(a => a !== accord.en)
                                                    : [...currentAccords, accord.en];
                                                setFormData(prev => ({
                                                    ...prev,
                                                    notes: updated,
                                                    attributes: {
                                                        ...(prev.attributes || {}),
                                                        accords: updated
                                                    }
                                                }));
                                            }}
                                            style={{
                                                padding: '5px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                border: isSelected ? '1px solid var(--color-gold)' : '1px solid rgba(255,255,255,0.1)',
                                                background: isSelected ? 'rgba(200, 169, 81, 0.25)' : 'rgba(255,255,255,0.02)',
                                                color: isSelected ? 'var(--color-gold)' : '#cbd5e1',
                                                fontWeight: isSelected ? '600' : '400',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {isRTL ? accord.ar : accord.en}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Bilingual Poetic Arabic Description */}
                        <div className="form-group" style={{ marginTop: '15px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🖋️ {isRTL ? 'الوصف الأدبي الفاخر بالعربية (Bilingual Luxury Description):' : 'Bilingual Luxury Arabic Description:'}
                            </label>
                            <textarea
                                name="description_ar"
                                className="form-control"
                                dir="rtl"
                                rows="2"
                                value={attributes.description_ar || ''}
                                onChange={(e) => handleAttributeChange('description_ar', e.target.value)}
                                placeholder="الوصف الشعري للعبير والأثر العطري باللغة العربية..."
                            />
                        </div>
                    </>
                )}

                {isFashion && (
                    <>
                        <div className="form-row grid-3" style={{ gap: '15px', marginBottom: '15px' }}>
                            <div className="form-group">
                                <label>{isRTL ? 'اللون' : 'Color'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.color || ''} 
                                    onChange={(e) => handleAttributeChange('color', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: أسود كلاسيكي / كحلي / بيج' : 'e.g. Nero Black / Midnight Blue / Beige'}
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'نوع القماش / المادة' : 'Fabric / Material'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.material || ''} 
                                    onChange={(e) => handleAttributeChange('material', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: كريب ياباني فاخر، حرير، كتان' : 'e.g. Royal Japanese Crepe, Pure Silk, Linen'}
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'قصة الموديل / التصميم' : 'Cut / Style'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.style || ''} 
                                    onChange={(e) => handleAttributeChange('style', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: بشت واسع، كيمونو، كلاسيك مفتوح' : 'e.g. Bisht Cut, Kimono, Open Front, Butterfly'}
                                />
                            </div>
                        </div>

                        <div className="form-row grid-3" style={{ gap: '15px' }}>
                            <div className="form-group">
                                <label>{isRTL ? 'بلد الصنع / التصميم' : 'Origin / Made In'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.origin || ''} 
                                    onChange={(e) => handleAttributeChange('origin', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: قطر / الإمارات / فرنسا / إيطاليا' : 'e.g. Qatar / UAE / Italy / France'}
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'يشمل الملحقات' : 'Includes'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.includes || ''} 
                                    onChange={(e) => handleAttributeChange('includes', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: طرحة متطابقة + حزام' : 'e.g. Matching Sheila / Scarf + Belt'}
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'تعليمات العناية والغسيل' : 'Care Instructions'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.care || ''} 
                                    onChange={(e) => handleAttributeChange('care', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: غسيل جاف فقط' : 'e.g. Dry Clean Only / Hand Wash Cold'}
                                />
                            </div>
                        </div>
                    </>
                )}

                {isJewellery && (
                    <>
                        <div className="form-row grid-3" style={{ gap: '15px', marginBottom: '15px' }}>
                            <div className="form-group">
                                <label>{isRTL ? 'نوع المعدن' : 'Metal / Material'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.material || ''} 
                                    onChange={(e) => handleAttributeChange('material', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: ذهب أصفر عيار 18 / بلاتين / فضة 925' : 'e.g. 18K Yellow Gold / Platinum / 925 Silver'}
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'نوع الحجر الكريم' : 'Stone / Gemstone'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.stone || ''} 
                                    onChange={(e) => handleAttributeChange('stone', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: ألماس طبيعي بقصة دائرية، ياقوت، زمرد' : 'e.g. Brilliant Round Diamond, Emerald, Sapphire'}
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'الوزن (قيراط أو جرام)' : 'Carat / Weight'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.carat || ''} 
                                    onChange={(e) => handleAttributeChange('carat', e.target.value)} 
                                    placeholder="e.g. 1.25 ct / 18.5g"
                                />
                            </div>
                        </div>

                        <div className="form-row grid-3" style={{ gap: '15px' }}>
                            <div className="form-group">
                                <label>{isRTL ? 'النقاء / العيار' : 'Clarity / Purity'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.purity || ''} 
                                    onChange={(e) => handleAttributeChange('purity', e.target.value)} 
                                    placeholder="e.g. VVS1 / Color F / 750"
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'شهادة التوثيق' : 'Certification'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.certification || ''} 
                                    onChange={(e) => handleAttributeChange('certification', e.target.value)} 
                                    placeholder="e.g. GIA Certified / IGI Certified"
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'حركة الساعة / الإطار' : 'Watch Movement / Dial'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.movement || ''} 
                                    onChange={(e) => handleAttributeChange('movement', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: أوتوماتيك سويسري / إطار 41 ملم' : 'e.g. Swiss Automatic / 41mm Case'}
                                />
                            </div>
                        </div>
                    </>
                )}

                {isGiftBox && (
                    <>
                        <div className="form-row grid-3" style={{ gap: '15px', marginBottom: '15px' }}>
                            <div className="form-group">
                                <label>{isRTL ? 'مناسبة الصندوق / الطابع' : 'Theme / Occasion'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.theme || ''} 
                                    onChange={(e) => handleAttributeChange('theme', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: إهداء زفاف ملكي، تهنئة العيد، VIP' : 'e.g. Royal Wedding, Eid Mubarak, VIP Prestige'}
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'أبعاد وحجم الصندوق' : 'Box Dimensions'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.dimensions || ''} 
                                    onChange={(e) => handleAttributeChange('dimensions', e.target.value)} 
                                    placeholder="e.g. 35cm x 25cm x 15cm"
                                />
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'نوع التغليف والشكل' : 'Packaging Chest Type'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={attributes.packaging || ''} 
                                    onChange={(e) => handleAttributeChange('packaging', e.target.value)} 
                                    placeholder={isRTL ? 'مثال: صندوق خشبي فاخر مبطن بالمخمل' : 'e.g. Handcrafted Wooden Chest with Velvet Lining'}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{isRTL ? 'محتويات الصندوق التفصيلية' : 'Included Contents & Gifts'}</label>
                            <textarea 
                                className="form-control" 
                                value={attributes.contents || ''} 
                                onChange={(e) => handleAttributeChange('contents', e.target.value)} 
                                placeholder={isRTL ? 'مثال: عطر 100 مل + تولة دهن عود سيوفي + مخلط ملكي + بطاقة إهداء مذهبة...' : 'e.g. Perfume 100ml + Royal Dehn Oud 12ml + Bakhoor 50g + Gold foil greeting card...'}
                                rows="3"
                            ></textarea>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const basePrice = Number(formData.price) || 0;
        const baseOldPrice = formData.oldPrice ? Number(formData.oldPrice) : null;
        let baseDiscount = formData.discount ? Number(formData.discount) : 0;
        if (baseOldPrice && baseOldPrice > basePrice) {
            baseDiscount = Math.round((1 - basePrice / baseOldPrice) * 100);
        } else {
            baseDiscount = 0;
        }

        let updatedSizes = Array.isArray(formData.size) ? [...formData.size] : [];
        if (updatedSizes.length > 0) {
            updatedSizes = updatedSizes.map((sz, idx) => {
                if (idx === 0 || updatedSizes.length === 1) {
                    return typeof sz === 'object'
                        ? { ...sz, price: basePrice, oldPrice: baseOldPrice, discount: baseDiscount }
                        : { name: sz, price: basePrice, oldPrice: baseOldPrice, discount: baseDiscount };
                }
                return sz;
            });
        }

        const activeShopId = shopId || (filterShop !== 'all' && filterShop !== 'own' ? filterShop : null);
        const filteredImages = formData.images.filter(url => url.trim() !== '');
        const productData = {
            ...formData,
            size: updatedSizes,
            image: filteredImages.length === 1 ? filteredImages[0] : filteredImages,
            isFeatured: formData.isFeatured,
            price: basePrice,
            oldPrice: baseOldPrice,
            discount: baseDiscount,
            stock: formData.stock !== undefined ? Number(formData.stock) : 0,
            sku: formData.sku?.trim() || '',
            description: formData.description?.trim() || '',
            topNotes: formData.topNotes?.trim() || '',
            middleNotes: formData.middleNotes?.trim() || '',
            baseNotes: formData.baseNotes?.trim() || '',
            shop_id: activeShopId !== null ? activeShopId : (formData.shop_id && formData.shop_id !== 'core' ? formData.shop_id : null),
            attributes: formData.attributes || {}
        };
        // Pre-submission check: Prevent reducing total stock below currently active reserved quantity
        if (editingId && activeShopId) {
            const existingProduct = products.find(p => p.id === editingId);
            const existingShopInv = existingProduct?.inventories?.find(inv => String(inv.shop_id) === String(activeShopId));
            const currentReserved = Number(existingShopInv?.reserved_quantity || 0);
            const requestedStock = formData.stock !== undefined ? Number(formData.stock) : 0;

            if (currentReserved > 0 && requestedStock < currentReserved) {
                alert(isRTL 
                    ? `لا يمكن تقليل المخزون إلى أقل من الكمية المحجوزة حالياً (${currentReserved} قطعة محجوزة للاستلام).`
                    : `Cannot reduce total stock below the active reserved quantity (${currentReserved} units currently locked for Click & Collect pickup).`
                );
                return;
            }
        }

        if (editingId) {
            await updateProduct(editingId, productData);
        } else {
            await addProduct(productData);
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
            
        const activeShopId = shopId || (filterShop !== 'all' && filterShop !== 'own' ? filterShop : null);
        const shopInventory = activeShopId ? product.inventories?.find(inv => String(inv.shop_id) === String(activeShopId)) : null;
        const initialPrice = shopInventory ? shopInventory.price : product.price;
        const initialStock = shopInventory ? shopInventory.stock : (product.stock !== undefined ? product.stock : 10);
        const initialReserved = Number(shopInventory?.reserved_quantity || 0);
        const initialPickup = shopInventory 
            ? shopInventory.pickup_available !== false 
            : product.pickup_available !== false;

        setFormData({
            ...product,
            price: initialPrice,
            stock: initialStock,
            reservedStock: initialReserved,
            size: sanitizedSizes,
            images: imageArray,
            isFeatured: product.isFeatured || false,
            sku: product.sku || '',
            description: product.description || '',
            topNotes: product.topNotes || '',
            middleNotes: product.middleNotes || '',
            baseNotes: product.baseNotes || '',
            shop_id: activeShopId || product.shop_id || 'core',
            pickup_available: initialPickup,
            attributes: product.attributes || {}
        });
        setEditingId(product.id);
        setIsSkuAuto(false); // Set to false when editing existing product to prevent accidental changes
        setShowForm(true);
        window.scrollTo(0, 0);
    };
    const toggleReservation = async (product) => {
        const activeShopId = shopId || (filterShop !== 'all' && filterShop !== 'own' ? filterShop : null);
        const shopInventory = activeShopId ? product.inventories?.find(inv => String(inv.shop_id) === String(activeShopId)) : null;
        const currentPickup = shopInventory 
            ? shopInventory.pickup_available !== false 
            : product.pickup_available !== false;
        
        const nextPickup = !currentPickup;

        const updatedData = {
            ...product,
            shop_id: activeShopId || product.shop_id || 'core',
            price: shopInventory ? shopInventory.price : product.price,
            stock: shopInventory ? shopInventory.stock : product.stock,
            pickup_available: nextPickup
        };

        await updateProduct(product.id, updatedData);
    };
    const safeProducts = Array.isArray(products) ? products : [];

    const handleDelete = (id, productName, product) => {
        const targetShopId = shopId || (isVendorContext ? user?.shop_id : null);
        const isOwner = Boolean(targetShopId && String(product?.shop_id) === String(targetShopId));
        const isLinkedItem = Boolean(targetShopId && product && product.inventories && product.inventories.some(inv => String(inv.shop_id) === String(targetShopId)));
        const targetInventory = isLinkedItem ? product.inventories.find(inv => String(inv.shop_id) === String(targetShopId)) : null;

        setConfirmModal({
            isOpen: true,
            productId: id,
            productName: productName,
            inventoryId: targetInventory?.id || null,
            isLinkedItem: !isOwner && (!!targetInventory || Boolean(targetShopId)),
            isOwner: isOwner
        });
    };

    const confirmDelete = async () => {
        const targetShopId = shopId || (isVendorContext ? user?.shop_id : null);
        try {
            if (confirmModal.isOwner) {
                // The vendor created and owns this boutique product: delete it!
                await deleteProduct(confirmModal.productId, { shop_id: targetShopId });
            } else if (confirmModal.inventoryId && targetShopId) {
                // Shared catalog item: remove from boutique shelf
                await deleteInventory(confirmModal.inventoryId);
            } else if (targetShopId && confirmModal.productId) {
                await deleteProduct(confirmModal.productId, { shop_id: targetShopId });
            } else if (confirmModal.productId) {
                await deleteProduct(confirmModal.productId);
            }
        } finally {
            setConfirmModal({ isOpen: false, productId: null, productName: '', inventoryId: null, isLinkedItem: false, isOwner: false });
        }
    };

    const cancelEdit = () => {
        setFormData(initialFormState);
        setIsSkuAuto(true);
        setShowForm(false);
        setEditingId(null);
        setIsBindingCatalog(false);
        setSelectedCatalogProduct(null);
        setShowAddChoiceModal(false);
    };

    const handleCatalogSelect = (product) => {
        setSelectedCatalogProduct(product);
        setFormData({
            ...initialFormState,
            price: product.price || '',
            stock: 10,
            shop_id: shopId || (shopsData.length > 0 ? shopsData[0].id : '')
        });
    };

    const handleInventorySubmit = async (e) => {
        e.preventDefault();
        const targetShopId = shopId || (formData.shop_id && formData.shop_id !== 'core' ? formData.shop_id : (shopsData[0]?.id || null));
        if (!selectedCatalogProduct) return;
        if (!targetShopId) {
            alert(isRTL ? 'يرجى تحديد متجر لإضافة المنتج إليه' : 'Please select a shop to add this catalog product to');
            return;
        }
        
        const payload = {
            product_id: selectedCatalogProduct.id,
            shop_id: targetShopId,
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
    const activeShopId = shopId || (filterShop !== 'all' && filterShop !== 'own' ? filterShop : null);

    const relevantShops = React.useMemo(() => {
        if (activeTerritoryId && activeTerritoryId !== 'all') {
            return shopsData.filter(s => String(s.region_id) === String(activeTerritoryId));
        }
        return shopsData;
    }, [shopsData, activeTerritoryId]);

    const shopFilteredProducts = safeProducts.filter(product => {
        if (activeShopId) {
            const isOwned = String(product.shop_id) === String(activeShopId);
            const isLinked = product.inventories && product.inventories.some(inv => String(inv.shop_id) === String(activeShopId) && (inv.is_active !== false));
            if (!isOwned && !isLinked) return false;
        } else if (!shopId && filterShop === 'own') {
            if (product.shop_id && product.shop_id !== 'core') return false;
        }
        return true;
    });

    const getCategoryCounts = () => {
        const counts = { all: 0, perfume: 0, fashion: 0, abaya: 0, giftbox: 0, jewellery: 0 };
        const fashionTags = ['fashion', 'abaya', 'clothing', 'apparel', 'accessories', 'bags', 'bag', 'shoes', 'eyewear'];
        const jewTags = ['jewellery', 'jewelry', 'watches', 'watch', 'rings', 'ring', 'necklaces', 'necklace', 'earrings', 'earring', 'bracelets', 'bracelet'];
        const giftTags = ['giftbox', 'gift-box', 'gift box', 'gifts', 'gift'];

        shopFilteredProducts.forEach(product => {
            counts.all++;
            const cats = Array.isArray(product.category) 
                ? product.category.map(c => String(c).toLowerCase()) 
                : (product.category ? [String(product.category).toLowerCase()] : []);
            
            const isAbaya = cats.includes('abaya') || (product.name && product.name.toLowerCase().includes('abaya'));
            const isFashion = cats.some(c => fashionTags.includes(c)) || product.gender === 'fashion';
            const isJewellery = cats.some(c => jewTags.includes(c));
            const isGiftbox = cats.some(c => giftTags.includes(c));

            if (isAbaya) {
                counts.abaya++;
            }
            if (isFashion && !isAbaya) {
                counts.fashion++;
            }
            if (isJewellery) {
                counts.jewellery++;
            }
            if (isGiftbox) {
                counts.giftbox++;
            }
            if (!isFashion && !isJewellery && !isGiftbox && !isAbaya) {
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button 
                                type="button" 
                                className="btn" 
                                onClick={() => {
                                    setShowCsvModal(true);
                                    setCsvParsedProducts([]);
                                    setCsvParseErrors([]);
                                    setCsvImportSuccessCount(null);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    background: 'rgba(56, 189, 248, 0.12)',
                                    border: '1px solid rgba(56, 189, 248, 0.35)',
                                    color: '#38bdf8',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                title={isRTL ? 'استيراد كتالوج المنتجات عبر ملف CSV' : 'Import bulk products via CSV template'}
                            >
                                <FileSpreadsheet size={18} />
                                <span>{isRTL ? 'استيراد CSV' : 'Batch CSV'}</span>
                            </button>

                            <div className="add-product-wrapper" style={{ position: 'relative' }}>
                                <button 
                                    type="button" 
                                    className="btn btn-gold" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowAddChoiceModal(!showAddChoiceModal);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 20px',
                                        borderRadius: '10px',
                                        fontWeight: '700',
                                        boxShadow: '0 4px 12px rgba(200, 169, 81, 0.25)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Plus size={18} />
                                    {isRTL ? 'إضافة منتج' : 'Add Product'}
                                    <ChevronDown size={16} style={{ transform: showAddChoiceModal ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                </button>

                            {showAddChoiceModal && (
                                <>
                                    {/* Backdrop to close on outside click */}
                                    <div 
                                        onClick={() => setShowAddChoiceModal(false)} 
                                        style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
                                    />
                                    
                                    {/* Dropdown Menu directly attached under the button */}
                                    <div 
                                        className="animate-scale-up add-product-dropdown"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 8px)',
                                            [isRTL ? 'left' : 'right']: 0,
                                            background: '#1e293b',
                                            border: '1px solid rgba(200, 169, 81, 0.35)',
                                            borderRadius: '14px',
                                            padding: '8px',
                                            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6), 0 0 15px rgba(200, 169, 81, 0.15)',
                                            zIndex: 1000,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            minWidth: '290px',
                                            maxWidth: 'calc(100vw - 28px)'
                                        }}
                                    >
                                        {/* Option 1: Perfumes */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddChoiceModal(false);
                                                setShowForm(true);
                                                setIsBindingCatalog(false);
                                                setEditingId(null);
                                                setFormData({
                                                    ...initialFormState,
                                                    category: ['perfume'],
                                                    type: 'EDP (Eau de Parfum)',
                                                    gender: 'unisex',
                                                    shop_id: shopId || 'core'
                                                });
                                                window.scrollTo({ top: 120, behavior: 'smooth' });
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid transparent',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                cursor: 'pointer',
                                                textAlign: isRTL ? 'right' : 'left',
                                                transition: 'all 0.15s ease',
                                                width: '100%'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(200, 169, 81, 0.12)';
                                                e.currentTarget.style.borderColor = 'rgba(200, 169, 81, 0.35)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                                e.currentTarget.style.borderColor = 'transparent';
                                            }}
                                        >
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '10px',
                                                background: 'rgba(200, 169, 81, 0.2)',
                                                border: '1px solid rgba(200, 169, 81, 0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <Sparkles size={18} color="#c8a951" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#f8fafc', marginBottom: '2px' }}>
                                                    {isRTL ? 'عطور وبخور فاخر' : 'Perfumes & Fragrances'}
                                                </div>
                                                <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                                                    {isRTL ? 'نفحات الإفتتاحية والقلب والقاعدة وتركيز العطر' : 'Olfactory pyramid notes & concentrations'}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Option 2: Fashion & Abayas */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddChoiceModal(false);
                                                setShowForm(true);
                                                setIsBindingCatalog(false);
                                                setEditingId(null);
                                                setFormData({
                                                    ...initialFormState,
                                                    category: ['fashion', 'abaya'],
                                                    type: 'Abaya',
                                                    gender: 'women',
                                                    shop_id: shopId || 'core'
                                                });
                                                window.scrollTo({ top: 120, behavior: 'smooth' });
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid transparent',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                cursor: 'pointer',
                                                textAlign: isRTL ? 'right' : 'left',
                                                transition: 'all 0.15s ease',
                                                width: '100%'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(236, 72, 153, 0.12)';
                                                e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.35)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                                e.currentTarget.style.borderColor = 'transparent';
                                            }}
                                        >
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '10px',
                                                background: 'rgba(236, 72, 153, 0.2)',
                                                border: '1px solid rgba(236, 72, 153, 0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <Shirt size={18} color="#ec4899" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#f8fafc', marginBottom: '2px' }}>
                                                    {isRTL ? 'أزياء وعبايات حصرية' : 'Fashion & Exclusive Abayas'}
                                                </div>
                                                <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                                                    {isRTL ? 'مقاسات (52-60)، القماش، القصة، والألوان' : 'Abaya cuts (52-60), fabrics, color & styling'}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Option 3: Jewellery & Watches */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddChoiceModal(false);
                                                setShowForm(true);
                                                setIsBindingCatalog(false);
                                                setEditingId(null);
                                                setFormData({
                                                    ...initialFormState,
                                                    category: ['jewellery'],
                                                    type: 'Jewellery',
                                                    gender: 'unisex',
                                                    shop_id: shopId || 'core'
                                                });
                                                window.scrollTo({ top: 120, behavior: 'smooth' });
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid transparent',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                cursor: 'pointer',
                                                textAlign: isRTL ? 'right' : 'left',
                                                transition: 'all 0.15s ease',
                                                width: '100%'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                                                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.35)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                                e.currentTarget.style.borderColor = 'transparent';
                                            }}
                                        >
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '10px',
                                                background: 'rgba(56, 189, 248, 0.2)',
                                                border: '1px solid rgba(56, 189, 248, 0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <Diamond size={18} color="#38bdf8" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#f8fafc', marginBottom: '2px' }}>
                                                    {isRTL ? 'مجوهرات وساعات راقية' : 'Jewellery & Luxury Watches'}
                                                </div>
                                                <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                                                    {isRTL ? 'المعادن الثمينة، الألماس، القيراط والشهادات' : 'Precious metals, carats, gemstones & watch specs'}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Option 4: Luxury Gift Box */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddChoiceModal(false);
                                                setShowForm(true);
                                                setIsBindingCatalog(false);
                                                setEditingId(null);
                                                setFormData({
                                                    ...initialFormState,
                                                    category: ['giftbox'],
                                                    type: 'Gift Set',
                                                    gender: 'unisex',
                                                    shop_id: shopId || 'core'
                                                });
                                                window.scrollTo({ top: 120, behavior: 'smooth' });
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid transparent',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                cursor: 'pointer',
                                                textAlign: isRTL ? 'right' : 'left',
                                                transition: 'all 0.15s ease',
                                                width: '100%'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)';
                                                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                                e.currentTarget.style.borderColor = 'transparent';
                                            }}
                                        >
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '10px',
                                                background: 'rgba(245, 158, 11, 0.2)',
                                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <Gift size={18} color="#f59e0b" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#f8fafc', marginBottom: '2px' }}>
                                                    {isRTL ? 'صناديق وباقات الهدايا' : 'Luxury Gift Boxes & Sets'}
                                                </div>
                                                <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                                                    {isRTL ? 'تغليف ملكي فاخر، أبعاد الصندوق ومحتويات الباقة' : 'Curated gift sets, chest types & contents'}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Option 5: Global Master Catalog */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddChoiceModal(false);
                                                setIsBindingCatalog(true);
                                                setShowForm(false);
                                                setSelectedCatalogProduct(null);
                                                window.scrollTo({ top: 120, behavior: 'smooth' });
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid transparent',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                cursor: 'pointer',
                                                textAlign: isRTL ? 'right' : 'left',
                                                transition: 'all 0.15s ease',
                                                width: '100%',
                                                borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)';
                                                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.35)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                                e.currentTarget.style.borderColor = 'transparent';
                                            }}
                                        >
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '10px',
                                                background: 'rgba(168, 85, 247, 0.2)',
                                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <Store size={18} color="#a855f7" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#f8fafc', marginBottom: '2px' }}>
                                                    {isRTL ? 'من الكتالوج العالمي' : 'Pick from Global Catalog'}
                                                </div>
                                                <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                                                    {isRTL ? 'تحديد منتج مسجل وتعيين السعر والمخزون' : 'Select from master catalog & set shop pricing'}
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isBindingCatalog && (
                <div className="admin-form animate-fade-in" style={{ backgroundColor: 'rgba(200, 169, 81, 0.05)', border: '1px solid rgba(200, 169, 81, 0.2)', padding: '24px', borderRadius: '16px', marginBottom: '30px' }}>
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

                            {loadingCatalog ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#c8a951' }}>
                                    {isRTL ? 'جاري تحميل الكتالوج العالمي...' : 'Loading Global Catalog...'}
                                </div>
                            ) : (
                                <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                                    {globalCatalog.filter(p => !p._dummy && (p.name.toLowerCase().includes(catalogSearchTerm.toLowerCase()) || p.brand.toLowerCase().includes(catalogSearchTerm.toLowerCase()))).slice(0, 50).map(p => {
                                        // Check if shop already owns or has linked this product
                                        const alreadyHas = shopFilteredProducts.some(ownedProd => String(ownedProd.id) === String(p.id));
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
                            )}
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
                                <button type="button" className="btn" onClick={() => setSelectedCatalogProduct(null)} style={{ marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0, padding: '8px 15px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.15)' }}>
                                    {isRTL ? 'تغيير المنتج' : 'Change Product'}
                                </button>
                            </div>

                            {!shopId && (
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>{isRTL ? 'إضافة إلى متجر' : 'Assign to Shop'}</label>
                                    <select 
                                        name="shop_id" 
                                        className="form-control" 
                                        value={formData.shop_id || ''} 
                                        onChange={handleInputChange}
                                        required
                                        style={{ border: '1px solid var(--color-gold)', background: 'rgba(200, 169, 81, 0.05)' }}
                                    >
                                        <option value="">{isRTL ? '-- اختر المتجر --' : '-- Select Shop --'}</option>
                                        {shopsData.map(shop => (
                                            <option key={shop.id} value={shop.id}>
                                                {shop.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

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
                            
                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button type="submit" className="btn btn-gold" style={{ flex: 1, padding: '10px 24px' }}>
                                    <Plus size={18} />
                                    {isRTL ? 'إضافة لمخزون المتجر' : 'Add to Shop Inventory'}
                                </button>
                                <button type="button" className="btn" onClick={cancelEdit} style={{ background: 'rgba(255,255,255,0.1)', color: '#f8fafc', padding: '10px 24px', border: '1px solid rgba(255,255,255,0.1)' }}>
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
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{isRTL ? 'اسم المنتج' : 'Product Name'}</span>
                                    <button 
                                        type="button" 
                                        className="text-btn-gold" 
                                        style={{ fontSize: '0.85rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--color-gold)', background: 'rgba(200, 169, 81, 0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-gold)' }}
                                        onClick={handleAiAutofill}
                                        disabled={isAiLoading || !formData.name}
                                    >
                                        {isAiLoading ? (isRTL ? 'جاري التحليل...' : 'Analyzing...') : (isRTL ? '🪄 ملء تلقائي ذكي' : '🪄 Smart Autofill')}
                                    </button>
                                </label>
                                <input type="text" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required placeholder={isRTL ? 'مثال: Creed Aventus 100ml' : 'e.g. Creed Aventus 100ml'} />
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
                                <select 
                                    name="department" 
                                    className="form-control" 
                                    value={
                                        formData.category?.includes('fashion') 
                                            ? 'fashion' 
                                            : (formData.category?.includes('jewellery') 
                                                ? 'jewellery' 
                                                : (formData.category?.includes('giftbox') || formData.category?.includes('gift-box') 
                                                    ? 'giftbox' 
                                                    : 'perfume'))
                                    } 
                                    onChange={(e) => {
                                        const newDept = e.target.value;
                                        setFormData(prev => {
                                            const oldCats = Array.isArray(prev.category) ? prev.category : [];
                                            let cleanCats = oldCats.filter(c => !['fashion', 'jewellery', 'giftbox', 'gift-box'].includes(c.toLowerCase()));
                                            if (newDept !== 'perfume') {
                                                cleanCats.push(newDept);
                                            }
                                            return {
                                                ...prev,
                                                category: cleanCats
                                            };
                                        });
                                    }}
                                >
                                    <option value="perfume">{isRTL ? 'عطور ومستحضرات (Perfume)' : 'Perfume & Fragrances'}</option>
                                    <option value="fashion">{isRTL ? 'أزياء وعبايات وحقائب (Fashion)' : 'Fashion & Abayas & Bags'}</option>
                                    <option value="jewellery">{isRTL ? 'مجوهرات وساعات (Jewellery)' : 'Jewellery & Watches'}</option>
                                    <option value="giftbox">{isRTL ? 'صناديق الهدايا (Gift Boxes)' : 'Gift Boxes'}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{isRTL ? 'الفئة المستهدفة' : 'Target Audience / Gender'}</label>
                                <select name="gender" className="form-control" value={formData.gender || 'unisex'} onChange={handleInputChange}>
                                    <option value="unisex">{isRTL ? 'للجنسين / عام' : 'Unisex / General'}</option>
                                    <option value="women">{isRTL ? 'نسائي' : 'Women'}</option>
                                    <option value="men">{isRTL ? 'رجالي' : 'Men'}</option>
                                    <option value="arabic">{isRTL ? 'شرقي / عربي' : 'Oriental / Arabic'}</option>
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
                                    placeholder={isRTL ? 'مثلاً: عطر، حقيبة، عباية، قلادة...' : 'e.g. Perfume, Bag, Abaya, Necklace...'}
                                />
                                <datalist id="product-types">
                                    <option value="Perfume">Perfume</option>
                                    <option value="Abaya">Abaya</option>
                                    <option value="Bag">Bag</option>
                                    <option value="Crossbody Bag">Crossbody Bag</option>
                                    <option value="Dress">Dress</option>
                                    <option value="Necklace">Necklace</option>
                                    <option value="Ring">Ring</option>
                                    <option value="Watch">Watch</option>
                                    <option value="Gift Set">Gift Set</option>
                                    <option value="EDP (Eau de Parfum)">EDP (Eau de Parfum)</option>
                                </datalist>
                            </div>
                        </div>

                        {/* Quick Department Subcategory Tags (Directly visible) */}
                        <div className="form-group" style={{ marginTop: '10px', marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🏷️ {isRTL ? 'التصنيفات والوسوم المباشرة:' : 'Department Category Tags (Click to select):'}
                            </label>
                            <div className="category-pills" style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {formData.category?.includes('fashion') ? (
                                    [
                                        { value: 'abaya', label: isRTL ? 'عبايات حصرية' : 'Exclusive Abaya' },
                                        { value: 'clothing', label: isRTL ? 'ملابس' : 'Clothing / Apparel' },
                                        { value: 'bags', label: isRTL ? 'حقائب' : 'Handbags & Bags' },
                                        { value: 'accessories', label: isRTL ? 'إكسسوارات' : 'Accessories' },
                                        { value: 'eyewear', label: isRTL ? 'نظارات' : 'Eyewear' },
                                        { value: 'shoes', label: isRTL ? 'أحذية' : 'Shoes' }
                                    ].map(cat => (
                                        <button
                                            type="button"
                                            key={cat.value}
                                            className={`category-pill ${formData.category?.includes(cat.value) ? 'active' : ''}`}
                                            onClick={() => handleCategoryToggle(cat.value)}
                                        >
                                            {cat.label}
                                        </button>
                                    ))
                                ) : formData.category?.includes('jewellery') ? (
                                    [
                                        { value: 'watches', label: isRTL ? 'ساعات' : 'Watches' },
                                        { value: 'rings', label: isRTL ? 'خواتم' : 'Rings' },
                                        { value: 'necklaces', label: isRTL ? 'قلائد' : 'Necklaces' },
                                        { value: 'earrings', label: isRTL ? 'أقراط' : 'Earrings' },
                                        { value: 'bracelets', label: isRTL ? 'أساور' : 'Bracelets' }
                                    ].map(cat => (
                                        <button
                                            type="button"
                                            key={cat.value}
                                            className={`category-pill ${formData.category?.includes(cat.value) ? 'active' : ''}`}
                                            onClick={() => handleCategoryToggle(cat.value)}
                                        >
                                            {cat.label}
                                        </button>
                                    ))
                                ) : (
                                    [
                                        { value: 'arabic', label: isRTL ? 'شرقي' : 'Arabic' },
                                        { value: 'woody', label: isRTL ? 'خشبي' : 'Woody' },
                                        { value: 'floral', label: isRTL ? 'زهري' : 'Floral' },
                                        { value: 'spicy', label: isRTL ? 'حار / توابل' : 'Spicy' },
                                        { value: 'citrus', label: isRTL ? 'حمضيات' : 'Citrus' },
                                        { value: 'musk', label: isRTL ? 'مسك' : 'Musk' },
                                        { value: 'fresh', label: isRTL ? 'منعش' : 'Fresh' },
                                        { value: 'sweet', label: isRTL ? 'حلو' : 'Sweet' },
                                        { value: 'luxury', label: isRTL ? 'فاخر' : 'Luxury' }
                                    ].map(cat => (
                                        <button
                                            type="button"
                                            key={cat.value}
                                            className={`category-pill ${formData.category?.includes(cat.value) ? 'active' : ''}`}
                                            onClick={() => handleCategoryToggle(cat.value)}
                                        >
                                            {cat.label}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Section 2: Department Category Specifications & Features */}
                        {renderAttributeFields()}
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
                                        <input type="number" name="stock" className="form-control" value={formData.stock} onChange={handleInputChange} required min={Number(formData.reservedStock || 0)} />
                                        {Number(formData.reservedStock || 0) > 0 && (
                                            <small style={{ color: '#f59e0b', display: 'block', marginTop: '4px', fontSize: '0.75rem' }}>
                                                🔒 {isRTL 
                                                    ? `محجوز حالياً: ${formData.reservedStock} قطعة. الحد الأدنى للمخزون هو ${formData.reservedStock}.` 
                                                    : `Active Reserved: ${formData.reservedStock} units. Minimum stock allowed: ${formData.reservedStock}.`}
                                            </small>
                                        )}
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
                                            {isRTL ? 'السعر (ر.ق)' : 'Selling Price (QAR)'}
                                        </label>
                                        <input type="number" name="price" className="form-control" value={formData.price} onChange={handleInputChange} required min="1" step="0.5" />
                                    </div>
                                    <div className="form-group">
                                        <label>
                                            {isRTL ? 'السعر القديم (ر.ق)' : 'Old Price (QAR)'}
                                        </label>
                                        <input type="number" name="oldPrice" className="form-control" value={formData.oldPrice || ''} onChange={handleInputChange} min="0" step="0.5" />
                                    </div>
                                    <div className="form-group">
                                        <label>
                                            {isRTL ? 'الخصم %' : 'Discount %'}
                                        </label>
                                        <input type="number" name="discount" className="form-control" value={formData.discount || ''} onChange={handleInputChange} min="0" max="100" />
                                    </div>
                                    <div className="form-group">
                                        <label>{isRTL ? 'المخزون' : 'Stock'}</label>
                                        <input type="number" name="stock" className="form-control" value={formData.stock} onChange={handleInputChange} required min={Number(formData.reservedStock || 0)} />
                                        {Number(formData.reservedStock || 0) > 0 && (
                                            <small style={{ color: '#f59e0b', display: 'block', marginTop: '4px', fontSize: '0.75rem' }}>
                                                🔒 {isRTL 
                                                    ? `محجوز حالياً: ${formData.reservedStock} قطعة. الحد الأدنى للمخزون هو ${formData.reservedStock}.` 
                                                    : `Active Reserved: ${formData.reservedStock} units. Minimum stock allowed: ${formData.reservedStock}.`}
                                            </small>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Variants */}
                            <div className="form-column">
                                <div className="form-section-title">
                                    <Plus size={16} /> {isRTL ? 'إدارة الأحجام والأسعار (Variants)' : 'Size & Price Variants'}
                                </div>
                                
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                                        {isRTL ? 'إضافة سريعة لمقاس / خيار:' : 'Quick Add Size / Option:'}
                                    </span>
                                    {getDepartmentPresets().map(preset => (
                                        <button
                                            type="button"
                                            key={preset}
                                            className="category-pill"
                                            style={{ padding: '4px 10px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                                            onClick={() => {
                                                const existingPrice = formData.price || '';
                                                const existingOldPrice = formData.oldPrice || '';
                                                if (formData.size.some(s => s.name === preset)) return;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    size: [...prev.size, { name: preset, price: existingPrice, oldPrice: existingOldPrice }]
                                                }));
                                            }}
                                        >
                                            + {preset}
                                        </button>
                                    ))}
                                </div>

                                <div className="variant-input-grid">
                                    <div className="form-group">
                                        <label>{isRTL ? 'المقاس / الخيار' : 'Size / Variant'}</label>
                                        <input 
                                            type="text" 
                                            name="name" 
                                            className="form-control" 
                                            value={variantData.name} 
                                            onChange={handleVariantInputChange} 
                                            placeholder={
                                                formData.category?.includes('fashion') ? '56' :
                                                formData.category?.includes('jewellery') ? 'Sz 7 / 45cm' :
                                                (formData.category?.includes('giftbox') || formData.category?.includes('gift-box')) ? 'Deluxe Chest' : '100ml'
                                            } 
                                        />
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
                                {/* Advanced Settings Toggle */}
                                <div 
                                    style={{ 
                                        margin: '25px 0', 
                                        borderTop: '1px solid rgba(255,255,255,0.05)', 
                                        borderBottom: '1px solid rgba(255,255,255,0.05)', 
                                        padding: '15px 0' 
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        style={{ 
                                            width: '100%', 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            padding: '12px 20px', 
                                            fontSize: '0.95rem',
                                            background: 'rgba(255, 255, 255, 0.01)',
                                            borderColor: 'rgba(200, 169, 81, 0.3)',
                                            cursor: 'pointer',
                                            borderRadius: '8px'
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            ⚙️ {isRTL ? 'المواصفات والخيارات المتقدمة (الفئات، المكونات، السمات)' : 'Advanced Specifications & Options (Categories, Notes, Attributes)'}
                                        </span>
                                        <span style={{ color: 'var(--color-gold)' }}>{showAdvanced ? '▲' : '▼'}</span>
                                    </button>
                                </div>

                                {showAdvanced && (
                                    <>
                                        {/* Section 4: Categorization */}
                                        <div className="form-section-title">
                                            <Plus size={16} /> {isRTL ? 'التصنيفات والسمات' : 'Categorization & Attributes'}
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
                                    </>
                                )}

                                <div className="form-group" style={{ marginTop: '20px' }}>
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
                        
                        {/* Drag and Drop zone */}
                        <div 
                            className="image-dropzone"
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); }}
                            onDrop={handleImageDrop}
                            onClick={() => document.getElementById('bulk-file-upload').click()}
                            style={{
                                border: '2px dashed var(--color-gold)',
                                borderRadius: '12px',
                                padding: '30px',
                                textAlign: 'center',
                                background: 'rgba(200, 169, 81, 0.02)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                marginBottom: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            <Plus size={36} color="var(--color-gold)" />
                            <span style={{ fontWeight: '600' }}>
                                {isRTL ? 'اسحب وأفلت الصور هنا، أو انقر للتصفح' : 'Drag & drop images here, or click to browse'}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                {isRTL ? 'يدعم صيغ JPG, PNG, WEBP (حجم أقصى 800x800 مضغوط تلقائياً)' : 'Supports JPG, PNG, WEBP (auto-compressed to 800x800)'}
                            </span>
                            <input 
                                type="file" 
                                id="bulk-file-upload" 
                                multiple 
                                accept="image/*" 
                                style={{ display: 'none' }} 
                                onChange={handleBulkImageUpload} 
                            />
                        </div>

                        <div className="image-manage-grid">
                            {formData.images.map((url, idx) => (
                                <div 
                                    key={idx} 
                                    className="image-input-row"
                                    draggable
                                    onDragStart={(e) => {
                                        setDraggedImageIdx(idx);
                                        e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (draggedImageIdx !== null && draggedImageIdx !== idx) {
                                            moveImageTo(draggedImageIdx, idx);
                                            setDraggedImageIdx(null);
                                        }
                                    }}
                                    style={{
                                        opacity: draggedImageIdx === idx ? 0.4 : 1,
                                        cursor: 'grab',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div 
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'grab', padding: '0 4px' }}
                                        title={isRTL ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
                                    >
                                        <GripVertical size={16} />
                                    </div>
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
                        {showAdvanced && (
                            <>
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
                            <th style={{ minWidth: '55px', width: '55px' }}>{isRTL ? 'الصورة' : 'Image'}</th>
                            <th style={{ minWidth: '150px' }}>{isRTL ? 'المنتج' : 'Product'}</th>
                            <th style={{ minWidth: '100px' }}>{isRTL ? 'الماركة' : 'Brand'}</th>
                            <th style={{ whiteSpace: 'nowrap', minWidth: '130px' }}>
                                {isRegionalAdminTerritoryMode ? (isRTL ? 'السعر الإقليمي / MSRP' : 'Regional Price / MSRP') : (isRTL ? 'السعر' : 'Price')}
                            </th>
                            <th style={{ whiteSpace: 'nowrap', minWidth: '130px' }}>
                                {isRegionalAdminTerritoryMode ? (isRTL ? 'مخزون الإقليم' : 'Territory Stock') : (isRTL ? 'المخزون (المتوفر / المحجوز / المتاح)' : 'Stock (On-Hand / Reserved / Available)')}
                            </th>
                            <th style={{ whiteSpace: 'nowrap', textAlign: 'center', minWidth: '75px' }}>{isRTL ? 'الحجز' : 'Reserve'}</th>
                            <th style={{ textAlign: 'center', minWidth: '85px' }}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...shopFilteredProducts]
                            .map((p, index) => ({ ...p, originalIndex: index }))
                            .filter(product => {
                                // Category filter
                                if (selectedCategory !== 'all') {
                                    const cats = Array.isArray(product.category) 
                                        ? product.category.map(c => String(c).toLowerCase()) 
                                        : (product.category ? [String(product.category).toLowerCase()] : []);
                                    const fashionTags = ['fashion', 'abaya', 'clothing', 'apparel', 'accessories', 'bags', 'bag', 'shoes', 'eyewear'];
                                    const jewTags = ['jewellery', 'jewelry', 'watches', 'watch', 'rings', 'ring', 'necklaces', 'necklace', 'earrings', 'earring', 'bracelets', 'bracelet'];
                                    const giftTags = ['giftbox', 'gift-box', 'gift box', 'gifts', 'gift'];

                                    const isAbaya = cats.includes('abaya') || (product.name && product.name.toLowerCase().includes('abaya'));
                                    const isFashion = cats.some(c => fashionTags.includes(c)) || product.gender === 'fashion';
                                    const isJewellery = cats.some(c => jewTags.includes(c));
                                    const isGiftbox = cats.some(c => giftTags.includes(c));

                                    if (selectedCategory === 'perfume') {
                                        if (isFashion || isJewellery || isGiftbox || isAbaya) return false;
                                    } else if (selectedCategory === 'abaya') {
                                        if (!isAbaya) return false;
                                    } else if (selectedCategory === 'fashion') {
                                        if (!isFashion || isAbaya) return false;
                                    } else if (selectedCategory === 'giftbox') {
                                        if (!isGiftbox) return false;
                                    } else if (selectedCategory === 'jewellery') {
                                        if (!isJewellery) return false;
                                    }
                                }

                                return (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       (product.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       String(product.id) === searchTerm.trim();
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
                                const shopInventory = activeShopId ? product.inventories?.find(inv => String(inv.shop_id) === String(activeShopId)) : null;

                                // Territory-scoped inventory calculations
                                const territoryInvs = (product.inventories || []).filter(inv => 
                                    relevantShops.some(s => String(s.id) === String(inv.shop_id)) && inv.is_active !== false
                                );

                                const regionalPrice = territoryInvs.length > 0 ? territoryInvs[0].price : (shopInventory ? shopInventory.price : product.price);
                                const masterMsrp = product.price;
                                const territoryStock = territoryInvs.length > 0 
                                    ? territoryInvs.reduce((sum, inv) => sum + (Number(inv.stock) || 0), 0)
                                    : (shopInventory ? shopInventory.stock : (product.stock !== undefined ? product.stock : 10));

                                const displayPrice = shopInventory ? shopInventory.price : product.price;
                                const displayOldPrice = shopInventory ? null : product.oldPrice;
                                const displayDiscount = shopInventory ? 0 : product.discount;
                                const displayStock = isRegionalAdminTerritoryMode ? territoryStock : (shopInventory ? shopInventory.stock : (product.stock !== undefined ? product.stock : 10));

                                // Price anomaly benchmark comparison for regional governance
                                let priceAnomaly = null;
                                if (isRegionalAdminTerritoryMode && masterMsrp > 0 && regionalPrice > 0) {
                                    const diffPct = Math.round(((regionalPrice - masterMsrp) / masterMsrp) * 100);
                                    if (diffPct > 20) {
                                        priceAnomaly = { type: 'high', label: `+${diffPct}% vs MSRP`, color: '#f59e0b' };
                                    } else if (diffPct < -25) {
                                        priceAnomaly = { type: 'low', label: `${diffPct}% vs MSRP`, color: '#ef4444' };
                                    }
                                }
                                const isLowStockInTerritory = isRegionalAdminTerritoryMode && territoryStock < 5;

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
                                            <div className="price-display-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '1.05rem' }}>
                                                        {isRegionalAdmin ? regionalPrice : displayPrice} {isRTL ? 'ر.ق' : 'QAR'}
                                                    </span>
                                                    {isRegionalAdmin ? (
                                                        <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(200, 169, 81, 0.2)', color: '#c8a951', fontWeight: '700' }}>
                                                            {isRTL ? 'إقليمي' : 'Regional'}
                                                        </span>
                                                    ) : (!shopId && (
                                                        <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(200, 169, 81, 0.2)', color: '#c8a951', fontWeight: '700' }}>
                                                            MSRP
                                                        </span>
                                                    ))}
                                                </div>
                                                {isRegionalAdmin && (
                                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                        MSRP: <span style={{ color: '#cbd5e1', fontWeight: '600' }}>{masterMsrp} QAR</span>
                                                    </div>
                                                )}
                                                {!isRegionalAdmin && !shopId && (
                                                    (() => {
                                                        const bPrices = (product.inventories || [])
                                                            .filter(inv => inv.is_active !== false && Number(inv.price) > 0)
                                                            .map(inv => Number(inv.price));
                                                        if (bPrices.length === 0) {
                                                            return (
                                                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                                    {isRTL ? 'لا توجد عروض متاجر' : 'No boutique listings'}
                                                                </span>
                                                            );
                                                        }
                                                        const minP = Math.min(...bPrices);
                                                        const maxP = Math.max(...bPrices);
                                                        return (
                                                            <div style={{ fontSize: '0.73rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(56, 189, 248, 0.08)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                                                                <Store size={11} />
                                                                <span>
                                                                    {isRTL ? 'المتاجر: ' : 'Boutiques: '}
                                                                    <strong>{minP === maxP ? `${minP} QAR` : `${minP} - ${maxP} QAR`}</strong>
                                                                    <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}> ({bPrices.length})</span>
                                                                </span>
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                                {!isRegionalAdmin && displayOldPrice && (
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
                                                {priceAnomaly && (
                                                    <span style={{ 
                                                        fontSize: '0.7rem', 
                                                        fontWeight: '700', 
                                                        color: priceAnomaly.color, 
                                                        background: 'rgba(0,0,0,0.4)', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px', 
                                                        border: `1px solid ${priceAnomaly.color}`,
                                                        width: 'fit-content'
                                                    }}>
                                                        ⚠️ {priceAnomaly.label}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                                            {(() => {
                                                const totalOnHand = isRegionalAdminTerritoryMode ? territoryStock : (shopInventory ? Number(shopInventory.stock || 0) : (product.stock !== undefined ? Number(product.stock) : 10));
                                                const reservedCount = shopInventory ? Number(shopInventory.reserved_quantity || 0) : 0;
                                                const availableToSell = Math.max(0, totalOnHand - reservedCount);

                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '130px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isRTL ? 'في المتجر:' : 'On-Hand:'}</span>
                                                            <strong style={{ color: totalOnHand > 0 ? '#f8fafc' : '#ef4444', fontSize: '0.92rem' }}>{totalOnHand}</strong>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                            <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>{isRTL ? 'محجوز:' : 'Reserved:'}</span>
                                                            <span style={{ 
                                                                fontSize: '0.75rem', 
                                                                fontWeight: '700', 
                                                                color: reservedCount > 0 ? '#f59e0b' : '#64748b',
                                                                background: reservedCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                                                padding: '1px 5px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                🔒 {reservedCount}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '2px' }}>
                                                            <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '600' }}>{isRTL ? 'متاح للبيع:' : 'Available:'}</span>
                                                            <strong style={{ color: availableToSell > 5 ? '#22c55e' : (availableToSell > 0 ? '#f59e0b' : '#ef4444'), fontSize: '0.92rem' }}>
                                                                {availableToSell}
                                                            </strong>
                                                        </div>
                                                        {isLowStockInTerritory && (
                                                            <span style={{ 
                                                                fontSize: '0.68rem', 
                                                                fontWeight: '700', 
                                                                color: '#ef4444', 
                                                                background: 'rgba(239, 68, 68, 0.15)', 
                                                                padding: '2px 5px', 
                                                                borderRadius: '4px', 
                                                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                                                width: 'fit-content',
                                                                whiteSpace: 'nowrap',
                                                                marginTop: '2px'
                                                            }}>
                                                                ⚠️ {isRTL ? 'مخزون منخفض' : 'Low Stock'}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
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
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(product.id, product.name, product); }} 
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

            {/* Batch CSV Catalog Import Modal */}
            {showCsvModal && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(6px)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={() => !isCsvImporting && setShowCsvModal(false)}
                >
                    <div 
                        className="animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#0f172a',
                            border: '1px solid rgba(200, 169, 81, 0.35)',
                            borderRadius: '16px',
                            maxWidth: '780px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(200, 169, 81, 0.15)',
                            padding: '28px',
                            color: '#f8fafc'
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileSpreadsheet size={22} color="#38bdf8" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>
                                        {isRTL ? 'استيراد كتالوج المنتجات دفعة واحدة (CSV)' : 'Batch Product Catalog CSV Import'}
                                    </h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        {isRTL ? 'تحميل نموذج وتعبئة المنتجات وإدراجها بضغطة واحدة' : 'Download template, fill in products, and import in bulk'}
                                    </p>
                                </div>
                            </div>
                            {!isCsvImporting && (
                                <button 
                                    onClick={() => setShowCsvModal(false)}
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
                                >
                                    <X size={22} />
                                </button>
                            )}
                        </div>

                        {/* Step 1: Download Template */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#f8fafc' }}>
                                    1. {isRTL ? 'تحميل نموذج الكتالوج القياسي' : 'Download Master CSV Template'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                                    {isRTL ? 'يتضمن أعمدة: الاسم، الماركة، السعر، المخزون، النوتات، والوصف الثنائي' : 'Includes Name, Brand, MSRP Price, Stock, Olfactive Notes & Bilingual Descriptions'}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn"
                                onClick={downloadCsvTemplate}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(200, 169, 81, 0.15)',
                                    border: '1px solid rgba(200, 169, 81, 0.4)',
                                    color: 'var(--color-gold)',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                <Download size={16} />
                                <span>{isRTL ? 'تحميل القالب (.CSV)' : 'Download Template (.CSV)'}</span>
                            </button>
                        </div>

                        {/* Step 2: Upload CSV */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '0.95rem' }}>
                                2. {isRTL ? 'رفع ملف CSV المعبأ' : 'Upload Completed CSV File'}
                            </label>
                            <label 
                                style={{
                                    border: '2px dashed rgba(56, 189, 248, 0.4)',
                                    borderRadius: '12px',
                                    padding: '24px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: isCsvImporting ? 'not-allowed' : 'pointer',
                                    background: 'rgba(56, 189, 248, 0.03)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Upload size={32} color="#38bdf8" />
                                <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                                    {isRTL ? 'انقر لاختيار ملف CSV أو قم بسحبه إلى هنا' : 'Click to select or drag and drop a .csv file here'}
                                </span>
                                <input 
                                    type="file" 
                                    accept=".csv,text/csv" 
                                    style={{ display: 'none' }} 
                                    onChange={handleCsvFileUpload}
                                    disabled={isCsvImporting}
                                />
                            </label>
                        </div>

                        {/* Errors summary */}
                        {csvParseErrors.length > 0 && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
                                <div style={{ color: '#ef4444', fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px' }}>
                                    ⚠️ {isRTL ? `تم العثور على أخطاء في ${csvParseErrors.length} صفوف:` : `Validation errors found in ${csvParseErrors.length} rows:`}
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.78rem', color: '#fca5a5' }}>
                                    {csvParseErrors.slice(0, 5).map((err, idx) => (
                                        <li key={idx}>
                                            {isRTL ? `صف ${err.row} (${err.name}): ${err.errors.join('، ')}` : `Row ${err.row} (${err.name}): ${err.errors.join(', ')}`}
                                        </li>
                                    ))}
                                    {csvParseErrors.length > 5 && (
                                        <li>{isRTL ? `... و ${csvParseErrors.length - 5} صفوف أخرى` : `... and ${csvParseErrors.length - 5} more rows`}</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Parsed Preview Table */}
                        {csvParsedProducts.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#22c55e' }}>
                                        ✓ {isRTL ? `${csvParsedProducts.length} منتج جاهز للاستيراد:` : `${csvParsedProducts.length} valid products ready for import:`}
                                    </span>
                                </div>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                                    <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left' }}>
                                        <thead style={{ background: '#1e293b', position: 'sticky', top: 0 }}>
                                            <tr>
                                                <th style={{ padding: '8px 10px', color: '#94a3b8' }}>#</th>
                                                <th style={{ padding: '8px 10px', color: '#94a3b8' }}>{isRTL ? 'الاسم' : 'Name'}</th>
                                                <th style={{ padding: '8px 10px', color: '#94a3b8' }}>{isRTL ? 'الماركة' : 'Brand'}</th>
                                                <th style={{ padding: '8px 10px', color: '#94a3b8' }}>SKU</th>
                                                <th style={{ padding: '8px 10px', color: '#94a3b8' }}>{isRTL ? 'السعر' : 'Price'}</th>
                                                <th style={{ padding: '8px 10px', color: '#94a3b8' }}>{isRTL ? 'المخزون' : 'Stock'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {csvParsedProducts.map((p, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{idx + 1}</td>
                                                    <td style={{ padding: '6px 10px', color: '#f8fafc', fontWeight: '600' }}>{p.name}</td>
                                                    <td style={{ padding: '6px 10px', color: '#c8a951' }}>{p.brand}</td>
                                                    <td style={{ padding: '6px 10px', color: '#94a3b8', fontFamily: 'monospace' }}>{p.sku}</td>
                                                    <td style={{ padding: '6px 10px', color: '#38bdf8' }}>{p.price} QAR</td>
                                                    <td style={{ padding: '6px 10px', color: '#cbd5e1' }}>{p.stock}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Progress bar */}
                        {isCsvImporting && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                                    <span style={{ color: '#38bdf8' }}>{isRTL ? 'جاري الاستيراد والتسجيل بالقاعدة...' : 'Importing products to master database...'}</span>
                                    <span>{csvImportProgress}%</span>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${csvImportProgress}%`, height: '100%', background: '#38bdf8', transition: 'width 0.2s ease' }}></div>
                                </div>
                            </div>
                        )}

                        {/* Success Notice */}
                        {csvImportSuccessCount !== null && (
                            <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <CheckCircle size={24} color="#22c55e" />
                                <div>
                                    <div style={{ color: '#22c55e', fontWeight: '700', fontSize: '0.92rem' }}>
                                        {isRTL ? `تم استيراد ${csvImportSuccessCount} منتج بنجاح إلى الكتالوج الرئيسي!` : `Successfully imported ${csvImportSuccessCount} products into master catalog!`}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#86efac', marginTop: '2px' }}>
                                        {isRTL ? 'تم تحديث الكتالوج وتوليد رموز SKU بنجاح' : 'Products and SKUs are now live in the global catalog'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setShowCsvModal(false)}
                                disabled={isCsvImporting}
                                style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                {isRTL ? 'إغلاق' : 'Close'}
                            </button>
                            {csvParsedProducts.length > 0 && csvImportSuccessCount === null && (
                                <button
                                    type="button"
                                    className="btn btn-gold"
                                    onClick={executeCsvBatchImport}
                                    disabled={isCsvImporting}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 24px',
                                        borderRadius: '8px',
                                        fontWeight: '700',
                                        cursor: isCsvImporting ? 'wait' : 'pointer'
                                    }}
                                >
                                    <Plus size={18} />
                                    <span>
                                        {isCsvImporting 
                                            ? (isRTL ? 'جاري الاستيراد...' : 'Importing...') 
                                            : (isRTL ? `بدء استيراد ${csvParsedProducts.length} منتج` : `Execute Import (${csvParsedProducts.length} Products)`)}
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false, productId: null, productName: '', inventoryId: null, isLinkedItem: false, isOwner: false })}
                onConfirm={confirmDelete}
                title={isRegionalAdminTerritoryMode 
                    ? (isRTL ? 'إلغاء تفعيل المنتج بالإقليم' : 'DEACTIVATE REGIONAL INVENTORY')
                    : (confirmModal.isOwner
                        ? (isRTL ? 'حذف منتج المتجر' : 'DELETE BOUTIQUE PRODUCT')
                        : (confirmModal.isLinkedItem || shopId || isVendorContext
                            ? (isRTL ? 'إزالة من المخزون' : 'REMOVE FROM INVENTORY') 
                            : (isRTL ? 'حذف المنتج' : 'DELETE PRODUCT')))}
                message={
                    isRegionalAdminTerritoryMode ? (
                        <span>
                            {isRTL 
                                ? 'هل أنت متأكد من إلغاء تفعيل وفك ارتباط ' 
                                : 'Are you sure you want to deactivate and unbind '}
                            <strong style={{ color: '#c8a951', background: 'rgba(200, 169, 81, 0.12)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(200, 169, 81, 0.3)', display: 'inline-block', margin: '0 4px' }}>
                                {confirmModal.productName}
                            </strong>
                            {isRTL 
                                ? ' في كافة متاجر إقليمك الموكل؟ سيتم الحفاظ على الكتالوج الرئيسي ومتاجر الدول الأخرى دون تغيير.' 
                                : ' across all boutiques in your assigned territory? The global master catalog and other GCC territories will remain preserved.'}
                        </span>
                    ) : (confirmModal.isOwner ? (
                        <span>
                            {isRTL ? 'هل أنت متأكد من حذف المنتج الخاص بمتجرك ' : 'Are you sure you want to delete your boutique product '}
                            <strong style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-block', margin: '0 4px' }}>
                                {confirmModal.productName}
                            </strong>
                            {isRTL ? '؟ سيتم حذفه من متجرك مع الحفاظ على نسخه للمتاجر الأخرى إن وجدت.' : '? It will be removed from your boutique while preserving copies used by other vendors.'}
                        </span>
                    ) : ((confirmModal.isLinkedItem || shopId || isVendorContext) ? (
                        <span>
                            {isRTL ? 'هل أنت متأكد من إزالة ' : 'Are you sure you want to remove '}
                            <strong style={{ color: '#c8a951', background: 'rgba(200, 169, 81, 0.12)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(200, 169, 81, 0.3)', display: 'inline-block', margin: '0 4px' }}>
                                {confirmModal.productName}
                            </strong>
                            {isRTL ? 'من مخزون هذا المتجر؟' : 'from this shop inventory?'}
                        </span>
                    ) : (
                        <span>
                            {isRTL ? 'هل أنت متأكد من حذف المنتج ' : 'Are you sure you want to delete '}
                            <strong style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-block', margin: '0 4px' }}>
                                {confirmModal.productName}
                            </strong>
                            {isRTL ? '؟ سيتم إزالته من كافة المتاجر وقواعد البيانات.' : '? This will permanently delete it across the entire platform.'}
                        </span>
                    )))
                }
                confirmText={isRegionalAdminTerritoryMode 
                    ? (isRTL ? 'إلغاء التفعيل بالإقليم' : 'DEACTIVATE IN REGION')
                    : (confirmModal.isOwner
                        ? (isRTL ? 'حذف' : 'DELETE')
                        : ((confirmModal.isLinkedItem || shopId || isVendorContext) 
                            ? (isRTL ? 'إزالة' : 'REMOVE') 
                            : (isRTL ? 'حذف' : 'DELETE')))}
                cancelText={isRTL ? 'إلغاء' : 'CANCEL'}
                isRTL={isRTL}
                variant="danger"
                iconType="trash"
            />
        </div>
    );
};

export default ProductManager;
