const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/LENOVO/OneDrive/Documents/perfumehub/.env' });

(async () => {
    try {
        console.log('Connecting to MySQL with:', process.env.DB_NAME);
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'perfumehub_db'
        });
        
        const [rows] = await conn.query('SELECT COUNT(*) as count FROM products');
        console.log('--- PRODUCT STATS ---');
        console.log('Total Products found:', rows[0].count);
        
        if (rows[0].count > 0) {
            const [samples] = await conn.query('SELECT id, name, brand FROM products LIMIT 5');
            console.log('Sample Products:', samples);
        }
        
        const [shops] = await conn.query('SHOW TABLES');
        console.log('Database Tables:', shops.map(t => Object.values(t)[0]));

        await conn.end();
    } catch (e) {
        console.error('MySQL Error:', e.message);
    }
})();
