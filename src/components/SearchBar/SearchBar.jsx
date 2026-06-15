import React, { useState, useEffect, useRef, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { ShopContext } from '../../context/ShopContext';
import './SearchBar.css';

const SearchBar = ({ isRTL }) => {
    const { t } = useTranslation();
    const { products: mockProducts } = useContext(ShopContext);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setQuery('');
                setResults([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        setIsOpen(prev => {
            if (!prev) {
                // Focus input after it appears
                setTimeout(() => inputRef.current?.focus(), 50);
            } else {
                setQuery('');
                setResults([]);
            }
            return !prev;
        });
    };

    const handleSearch = (e) => {
        const value = e.target.value;
        setQuery(value);

        if (value.trim() === '') {
            setResults([]);
            return;
        }

        const lowercaseQuery = value.trim().toLowerCase();
        const filtered = (mockProducts || []).filter(product => {
            if (!product) return false;
            
            const name = (product.name || '').toLowerCase();
            const brand = (product.brand || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            const type = (product.type || '').toLowerCase();
            const topNotes = (product.topNotes || '').toLowerCase();
            const middleNotes = (product.middleNotes || '').toLowerCase();
            const baseNotes = (product.baseNotes || '').toLowerCase();
            
            // Handle categories (can be array or string)
            const category = Array.isArray(product.category) 
                ? product.category.join(' ').toLowerCase() 
                : (product.category || '').toLowerCase();
            
            // Handle tags/notes array if present
            const notes = Array.isArray(product.notes)
                ? product.notes.join(' ').toLowerCase()
                : (product.notes || '').toLowerCase();

            return name.includes(lowercaseQuery) ||
                   brand.includes(lowercaseQuery) ||
                   description.includes(lowercaseQuery) ||
                   type.includes(lowercaseQuery) ||
                   topNotes.includes(lowercaseQuery) ||
                   middleNotes.includes(lowercaseQuery) ||
                   baseNotes.includes(lowercaseQuery) ||
                   category.includes(lowercaseQuery) ||
                   notes.includes(lowercaseQuery);
        });
        setResults(filtered.slice(0, 10));
    };

    const handleResultClick = (id) => {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        navigate(`/product/${id}`);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (results.length > 0) {
            handleResultClick(results[0].id);
        }
    };

    return (
        <div className={`search-bar-wrapper ${isOpen ? 'search-open' : ''}`} ref={wrapperRef}>
            <button
                className="search-toggle-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    handleToggle();
                }}
                aria-label="Toggle search"
            >
                {isOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            <div className={`search-bar-expand ${isOpen ? 'expanded' : ''}`}>
                <form className="search-bar-form" onSubmit={handleSubmit}>
                    <Search size={16} className="search-bar-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="search-bar-input"
                        placeholder={t('search.placeholder')}
                        value={query}
                        onChange={handleSearch}
                        dir={isRTL ? 'rtl' : 'ltr'}
                    />
                </form>
            </div>

            {isOpen && query.trim() !== '' && (
                <div className="search-dropdown">
                    {results.length > 0 ? (
                        <div className="search-dropdown-list">
                            {results.map(product => (
                                <div
                                    key={product.id}
                                    className="search-dropdown-item"
                                    onClick={() => handleResultClick(product.id)}
                                >
                                    <div className="dropdown-item-img">
                                        <img
                                            src={Array.isArray(product.image) ? product.image[0] : product.image}
                                            alt={product.name}
                                        />
                                    </div>
                                    <div className="dropdown-item-details">
                                        <h5 className="dropdown-item-name">{product.name}</h5>
                                        <span className="dropdown-item-brand">{product.brand}</span>
                                    </div>
                                    <div className="dropdown-item-price">
                                        {product.price} {t('common.currency')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="search-dropdown-empty">
                            {t('search.no_results')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
