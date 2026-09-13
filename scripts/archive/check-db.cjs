const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'perfumehub_db'
        });
        const [rows] = await conn.query('SELECT id, name, created_at FROM products ORDER BY created_at');
        console.log('Total products in DB:', rows.length);
        rows.forEach(r => console.log(`  [${r.id}] ${r.name} (${r.created_at})`));
        conn.end();
    } catch (e) {
        console.error('DB Error:', e.message);
    }
})();
