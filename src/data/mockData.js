export const mockProducts = [
    {
        id: 1,
        name: "Sauvage Eau de Parfum",
        brand: "Dior",
        type: "EDP (Eau de Parfum)",
        size: "100ml / 3.4 oz",
        price: 520,
        oldPrice: 580,
        discount: 10,
        isNew: true,
        image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Sauvage+Dior",
        category: ["woody", "spicy", "fresh"],
        gender: "men",
        topNotes: 'Citrus, Pink Pepper',
        middleNotes: 'Rose, Lavender',
        baseNotes: 'Oud, Musk',
        notes: ["bergamot", "pepper", "lavender", "ambroxan", "sandalwood", "vetiver"],
        description: 'A radically fresh composition, dictated by a name that has the ring of a manifesto.',
        vibes: ["bold", "elegant", "mysterious"],
        occasions: ["daily", "night"],
        stock: 12
    },
    {
        id: 2,
        name: "Chanel No. 5",
        brand: "Chanel",
        type: "EDP (Eau de Parfum)",
        oilConcentration: "15-22% Concentration",
        size: "100ml / 3.4 oz",
        price: 750,
        isNew: false,
        image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Chanel+No5",
        category: ["floral"],
        gender: "women",
        notes: ["rose", "jasmine", "ylang-ylang", "iris", "vanilla", "sandalwood"],
        description: "Ylang-Ylang, Rose, Jasmine, Iris, Sandalwood, Vanilla, Amber.",
        vibes: ["elegant", "romantic"],
        occasions: ["daily", "night"],
        stock: 8
    },
    {
        id: 3,
        name: "Oud Wood",
        brand: "Tom Ford",
        type: "EDP (Eau de Parfum)",
        oilConcentration: "20% High Quality Absolute",
        size: "50ml / 1.7 oz",
        price: 1050,
        isNew: true,
        image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Oud+Wood",
        category: ["arabic", "woody"],
        gender: "unisex",
        notes: ["oud", "rosewood", "cardamom", "sandalwood", "vetiver", "amber"],
        description: "Oud, Rosewood, Cardamom, Chinese Pepper, Sandalwood, Vetiver, Amber.",
        vibes: ["mysterious", "elegant"],
        occasions: ["night", "daily"],
        stock: 5
    },
    {
        id: 4,
        name: "Baccarat Rouge 540",
        brand: "Maison Francis Kurkdjian",
        type: "EDP (Eau de Parfum)",
        oilConcentration: "25% Ultra-Premium Extract",
        size: "70ml / 2.4 oz",
        price: 1250,
        oldPrice: 1400,
        discount: 11,
        isNew: true,
        image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Baccarat+Rouge",
        category: ["arabic", "floral", "spicy"],
        gender: "unisex",
        notes: ["saffron", "jasmine", "amberwood", "cedar", "fir resin"],
        description: "Saffron, Jasmine, Amberwood, Cedar, Fir Resin, Ambergris.",
        vibes: ["mysterious", "elegant", "romantic"],
        occasions: ["night", "daily"],
        stock: 3
    }
];


export const featuredProducts = mockProducts.slice(0, 4);
export const newArrivals = mockProducts.filter(p => p.isNew);
export const mensProducts = mockProducts.filter(p => p.gender === 'men');
export const womensProducts = mockProducts.filter(p => p.gender === 'women');
