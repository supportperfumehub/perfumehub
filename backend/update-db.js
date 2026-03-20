import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const updateDb = async () => {
    try {
        console.log('Connecting to MySQL...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'perfumehub_db'
        });

        console.log('Adding stock column to products table...');

        // Check if stock column exists first to prevent errors on multiple runs
        const [columnsStock] = await connection.query(`SHOW COLUMNS FROM products LIKE 'stock'`);
        if (columnsStock.length === 0) {
            await connection.query('ALTER TABLE products ADD COLUMN stock INT DEFAULT 10');
            console.log('Stock column added successfully with default value 10.');
        } else {
            console.log('Stock column already exists.');
        }

        console.log('Adding checkout columns to orders table...');

        const [columnsShipping] = await connection.query(`SHOW COLUMNS FROM orders LIKE 'shippingAddress'`);
        if (columnsShipping.length === 0) {
            await connection.query('ALTER TABLE orders ADD COLUMN shippingAddress TEXT');
            console.log('shippingAddress column added to orders table.');
        }

        const [columnsPayment] = await connection.query(`SHOW COLUMNS FROM orders LIKE 'paymentMethod'`);
        if (columnsPayment.length === 0) {
            await connection.query("ALTER TABLE orders ADD COLUMN paymentMethod VARCHAR(50) DEFAULT 'Not Specified'");
            console.log('paymentMethod column added to orders table.');
        }

        const [columnsItems] = await connection.query(`SHOW COLUMNS FROM orders LIKE 'items'`);
        if (columnsItems.length === 0) {
            await connection.query('ALTER TABLE orders ADD COLUMN items JSON');
            console.log('items column added to orders table.');
        }

        console.log('Database update completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error updating database:', error);
        process.exit(1);
    }
};

updateDb();
