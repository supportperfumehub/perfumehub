const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const newProducts = [
  // LATTAFA
  { name: "Khamrah", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 130, oldPrice: 160, discount: 18, isNew: 1, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Khamrah", category: '["arabic", "spicy", "gourmand"]', gender: "unisex", description: "A luxurious oriental gourmand fragrance with notes of cinnamon, praline, and vanilla.", sku: "LAT-KHAM-100", stock: 50 },
  { name: "Asad", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 110, oldPrice: null, discount: null, isNew: 0, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Asad", category: '["arabic", "spicy"]', gender: "men", description: "A bold, spicy and woody fragrance. An exceptional signature scent for men.", sku: "LAT-ASAD-100", stock: 45 },
  { name: "Yara", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 115, oldPrice: 140, discount: 17, isNew: 1, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Yara", category: '["arabic", "floral", "sweet"]', gender: "women", description: "A beautiful, powdery, sweet floral fragrance with tropical vibes.", sku: "LAT-YARA-100", stock: 60 },
  { name: "Fakhar Black", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 105, oldPrice: 125, discount: 16, isNew: 0, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Fakhar", category: '["arabic", "fresh", "aromatic"]', gender: "men", description: "An aromatic fougere fragrance, perfect for daily wear.", sku: "LAT-FAKH-100", stock: 40 },
  { name: "Bade'e Al Oud", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 140, oldPrice: 170, discount: 17, isNew: 1, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Badee", category: '["arabic", "woody", "oud"]', gender: "unisex", description: "Oud for Glory. A magnificent and extremely potent oud and saffron blend.", sku: "LAT-BAD-100", stock: 25 },
  { name: "Nebras", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 135, oldPrice: 155, discount: 12, isNew: 1, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Nebras", category: '["arabic", "sweet", "vanilla"]', gender: "unisex", description: "A breathtaking creamy vanilla and cacao scent.", sku: "LAT-NEB-100", stock: 35 },
  { name: "Qaa'ed", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 95, oldPrice: 115, discount: 17, isNew: 0, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Qaaed", category: '["arabic", "leather", "spicy"]', gender: "men", description: "A strong, spicy leather fragrance in a golden cylinder bottle.", sku: "LAT-QAA-100", stock: 30 },
  { name: "Ameer Al Oudh", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 100, oldPrice: 120, discount: 16, isNew: 0, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Ameer", category: '["arabic", "oud", "sweet"]', gender: "unisex", description: "Intense Oud. A warm, woody, and sweet vanilla oud fragrance.", sku: "LAT-AMR-100", stock: 40 },

  // AHMED AL MAGHRIBI
  { name: "Kaaf", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 250, oldPrice: 290, discount: 13, isNew: 1, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Kaaf", category: '["arabic", "fresh", "aquatic"]', gender: "unisex", description: "An incredibly fresh, aquatic and long-lasting scent. One of the best fresh Arabic perfumes.", sku: "AAM-KAAF-100", stock: 30 },
  { name: "Marj", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "60ml / 2.0 oz", price: 320, oldPrice: null, discount: null, isNew: 0, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Marj", category: '["arabic", "woody", "oriental"]', gender: "unisex", description: "A rich, potent blend of spices, woods and oud. For lovers of strong, majestic fragrances.", sku: "AAM-MARJ-60", stock: 15 },
  { name: "Leather", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "50ml / 1.7 oz", price: 220, oldPrice: null, discount: null, isNew: 1, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Leather", category: '["arabic", "leather"]', gender: "men", description: "Pure, high-quality leather mixed with subtle Arabic spices.", sku: "AAM-LTHR-50", stock: 20 },
  { name: "Oud Classic", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "50ml / 1.7 oz", price: 180, oldPrice: 210, discount: 14, isNew: 0, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Oud+Classic", category: '["arabic", "oud"]', gender: "unisex", description: "A staple traditional classic oud for everyday wearing.", sku: "AAM-OUDC-50", stock: 12 },
  { name: "Blue Oud", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 260, oldPrice: null, discount: null, isNew: 0, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Blue+Oud", category: '["arabic", "oud", "fresh"]', gender: "unisex", description: "A unique take combining fresh marine notes with a dark oud base.", sku: "AAM-BLU-100", stock: 22 },
  { name: "Oud And Roses", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "60ml / 2.0 oz", price: 240, oldPrice: 280, discount: 14, isNew: 1, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Oud+Roses", category: '["arabic", "floral", "oud"]', gender: "unisex", description: "A majestic signature blend of Turkish rose and premium oud.", sku: "AAM-OUDR-60", stock: 18 },
  { name: "Hirfah", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "75ml / 2.5 oz", price: 280, oldPrice: null, discount: null, isNew: 0, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Hirfah", category: '["arabic", "fruity", "sweet"]', gender: "women", description: "An intoxicating sweet fruity oriental blend, immensely powerful.", sku: "AAM-HIRF-75", stock: 10 },
  { name: "Summer Oud", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "60ml / 2.0 oz", price: 210, oldPrice: 240, discount: 12, isNew: 1, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Summer+Oud", category: '["arabic", "fresh", "oud"]', gender: "unisex", description: "A lighter, more aerated oud meant exclusively for hot summer days.", sku: "AAM-SUM-60", stock: 25 },

  // FRENCH AVENUE (Fragrance World)
  { name: "Divin Asylum", brand: "French Avenue", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 150, oldPrice: 180, discount: 16, isNew: 1, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=French+Ave+Divin", category: '["arabic", "fresh", "citrus"]', gender: "men", description: "A vibrant fresh citrus and woody fragrance. Extremely smooth and sophisticated.", sku: "FA-DIV-100", stock: 40 },
  { name: "Royal Blend", brand: "French Avenue", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 160, oldPrice: null, discount: null, isNew: 0, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=French+Ave+Royal", category: '["arabic", "gourmand", "warm"]', gender: "unisex", description: "An intoxicating blend of cognac, cinnamon, and oak. Luxurious and warm.", sku: "FA-RYL-100", stock: 35 },
  { name: "Francique 63.55", brand: "French Avenue", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 140, oldPrice: 170, discount: 17, isNew: 1, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=French+Ave+Francique", category: '["arabic", "fruity", "leather"]', gender: "unisex", description: "Elegant blend of cardamom, leather, and fig. A unique and distinguished profile.", sku: "FA-FRN-100", stock: 25 },
  { name: "Imperial Oud", brand: "French Avenue", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 155, oldPrice: null, discount: null, isNew: 0, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=French+Ave+Imperial", category: '["arabic", "oud", "spicy"]', gender: "unisex", description: "A majestic oud fragrance surrounded by spices and dark woods.", sku: "FA-IMP-100", stock: 20 },
  { name: "Liquid Brun", brand: "French Avenue", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 165, oldPrice: 190, discount: 13, isNew: 1, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=French+Ave+Liquid", category: '["arabic", "warm", "spicy"]', gender: "men", description: "A stunning warm spicy profile with exceptional longevity and projection.", sku: "FA-LIQ-100", stock: 45 }
];

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'perfumehub_db'
    });

    console.log(`Connecting to database to add ${newProducts.length} new Arabic perfumes...`);

    // Fetch existing perfumes to avoid duplicates based on "name"
    const [existingRows] = await conn.execute('SELECT name, brand FROM products');
    const existingSet = new Set(existingRows.map(r => `${r.brand}-${r.name}`.toLowerCase()));

    const query = `
      INSERT INTO products 
      (name, brand, type, size, price, oldPrice, discount, isNew, image, category, gender, description, sku, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let addedCount = 0;
    let skippedCount = 0;

    for (const p of newProducts) {
      const key = `${p.brand}-${p.name}`.toLowerCase();
      if (existingSet.has(key)) {
        console.log(`Skipped Duplicate: ${p.brand} - ${p.name}`);
        skippedCount++;
        continue;
      }

      await conn.execute(query, [
        p.name, p.brand, p.type, JSON.stringify([p.size]), p.price, p.oldPrice, p.discount, p.isNew, JSON.stringify([p.image]), p.category, p.gender, p.description, p.sku, p.stock
      ]);
      addedCount++;
      console.log(`Added: ${p.brand} - ${p.name}`);
    }

    console.log(`\nDone! Added ${addedCount} products. Skipped ${skippedCount} duplicates.`);
    conn.end();
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
       console.log('\n❌ ERROR: Your MySQL database (XAMPP) is offline!');
       console.log('Please start MySQL via XAMPP control panel and try again.');
    } else {
       console.error('Error inserting products:');
       console.error(e);
    }
  }
})();
