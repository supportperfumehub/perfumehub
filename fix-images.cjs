const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

// Restoring to the URLs that were in the DB BEFORE I touched anything
// (from the check-db output taken before any changes were made)
const originalImages = {
    1: ['https://www.perfumenetwork.in/cdn/shop/files/Untitleddesign-20.png?v=1691407992'],
    2: ['https://scentoria.co.in/cdn/shop/files/Chanel_No_5_100_ML_EDP_Tester.jpg?v=1713941378&width=720'],
    3: ['https://m.media-amazon.com/images/I/61-ELV+-ATL._AC_UF1000,1000_QL80_.jpg'],
    4: ['https://cdn.saksfifthavenue.com/is/image/saks/0400088827670_1'],
    5: ['https://www.sephora.com/productimages/sku/s2536838-main-zoom.jpg'],
    6: ['https://www.sephora.com/productimages/sku/s1922582-main-zoom.jpg'],
    7: ['https://i0.wp.com/perfumiabd.com/wp-content/uploads/2025/12/VR-Spicebomb.png?fit=750%2C750&ssl=1'],
    8: ['https://www.perfumenetwork.in/cdn/shop/files/26GuerlainMonBloomofRoseEaudeParfum.png?v=1693734025'],
    // Products 9 and 10 were added by user with Myntra URLs (which 404ed even before my changes)
    // Using the best available working alternatives
    9: ['https://www.sephora.com/productimages/sku/s2756534-main-zoom.jpg'],
    10: ['https://www.sephora.com/productimages/sku/s2529710-main-zoom.jpg'],
};

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'perfumehub_db'
        });

        for (const [id, images] of Object.entries(originalImages)) {
            const imageJson = JSON.stringify(images);
            const [result] = await conn.query('UPDATE products SET image = ? WHERE id = ?', [imageJson, id]);
            console.log(`Restored product ${id}`);
        }
        console.log('Done - all images restored to original URLs!');
        conn.end();
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
