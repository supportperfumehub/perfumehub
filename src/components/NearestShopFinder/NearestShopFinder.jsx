import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation, Search, Store } from 'lucide-react';
import './NearestShopFinder.css';
import api from '../../utils/api_v1_0_2';

const NearestShopFinder = ({ isRTL }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [shops, setShops] = useState([]);
    const [location, setLocation] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingLocation, setLoadingLocation] = useState(false);
    
    useEffect(() => {
        const fetchShops = async () => {
            try {
                let url = '/shops?status=active';
                if (location) {
                    url = `/shops/nearest?lat=${location.lat}&lng=${location.lng}&radius=50`; // 50km radius
                }
                const response = await api.get(url);
                setShops(response.data);
            } catch (error) {
                console.error("Failed to fetch shops:", error);
            }
        };
        fetchShops();
    }, [location]);

    const detectLocation = () => {
        setLoadingLocation(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setLoadingLocation(false);
                },
                (error) => {
                    console.error("Error getting location:", error);
                    alert(isRTL ? "فشل تحديد الموقع. يرجى التأكد من تفعيل صلاحيات الموقع." : "Failed to detect location. Please allow location permissions.");
                    setLoadingLocation(false);
                }
            );
        } else {
            alert(isRTL ? "الموقع غير مدعوم في متصفحك." : "Geolocation is not supported by your browser.");
            setLoadingLocation(false);
        }
    };

    const getProcessedShops = () => {
        // If sorting by location, the backend already sorted them and attached dist_km!
        if (location) {
            return shops.map(shop => ({
                ...shop,
                distance: shop.dist_km !== undefined ? shop.dist_km : Infinity
            })).sort((a, b) => a.distance - b.distance);
        }
        
        // If searching manually by name or address
        if (searchTerm) {
            return shops.filter(shop => 
                shop.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                shop.address.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return shops; // Default: show all available if neither
    };

    const displayedShops = getProcessedShops().slice(0, 4); // Show top 4

    return (
        <section className="nearest-shop-section container reveal">
            <div className="section-header text-center">
                <h2 className="section-title">
                    <MapPin size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '10px' }} color="var(--color-gold)" />
                    {isRTL ? 'ابحث عن أقرب متجر' : 'Find Nearest Shop'}
                </h2>
                <p className="section-subtitle">
                    {isRTL 
                        ? 'اكتشف العطور الفاخرة المتاحة في المتاجر القريبة منك' 
                        : 'Discover luxury fragrances available in boutique shops near you'}
                </p>
            </div>

            <div className="shops-grid">
                {displayedShops.length > 0 ? (
                    displayedShops.map((shop) => (
                        <div key={shop.id} className="shop-card">
                            <div className="shop-image-container">
                                {(shop.images?.[0] || shop.logo_url) 
                                    ? <img src={shop.images?.[0] || shop.logo_url} alt={shop.name} /> 
                                    : <Store size={40} color="#ddd" />}
                            </div>
                            <div className="shop-content">
                                <div className="shop-info">
                                    <h3>{shop.name}</h3>
                                    <p className="shop-address"><MapPin size={14} /> {shop.address}</p>
                                </div>
                                
                                {location && shop.distance !== Infinity && (
                                    <div className="shop-distance">
                                        <strong>{shop.distance.toFixed(1)} km</strong> {isRTL ? 'بعيد عنك' : 'away'}
                                    </div>
                                )}

                                <button 
                                    className="shop-visit-btn"
                                    onClick={() => navigate(`/shop?shop_id=${shop.id}`)}
                                >
                                    {isRTL ? 'زيارة المتجر' : 'Visit Shop'}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-shops-found">
                        <Store size={48} color="#ddd" />
                        <p>{isRTL ? 'لم يتم العثور على متاجر' : 'No shops found nearby or matching criteria.'}</p>
                    </div>
                )}
            </div>

            <div className="shop-finder-controls">
                <button 
                    className={`btn btn-gold location-btn ${loadingLocation ? 'loading' : ''}`} 
                    onClick={detectLocation}
                >
                    <Navigation size={18} />
                    {loadingLocation 
                        ? (isRTL ? 'جاري التحديد...' : 'Detecting...') 
                        : (isRTL ? 'تحديد موقعي التلقائي' : 'Auto Detect Location')}
                </button>
                <div className="shop-search-divider">
                    <span>{isRTL ? 'أو' : 'OR'}</span>
                </div>
                <div className="shop-search-box">
                    <input 
                        type="text" 
                        placeholder={isRTL ? 'ابحث بالمدينة، المنطقة، أو اسم المتجر...' : 'Search by city, area, or shop name...'} 
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (e.target.value) setLocation(null);
                        }}
                    />
                    <Search className="search-icon" size={20} />
                </div>
            </div>
        </section>
    );
};

export default NearestShopFinder;
