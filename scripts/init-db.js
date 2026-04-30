import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const initDb = async () => {
  try {
    console.log('Connecting to MySQL...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    const dbName = process.env.DB_NAME || 'perfumehub_db';

    console.log(`Creating database ${dbName} if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);

    console.log(`Switching to database ${dbName}...`);
    await connection.query(`USE \`${dbName}\``);

    // console.log('Dropping products table if exists...');
    // await connection.query('DROP TABLE IF EXISTS products');

    console.log('Creating products table if not exists...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        brand VARCHAR(255),
        type VARCHAR(100),
        size JSON,
        price DECIMAL(10, 2) NOT NULL,
        oldPrice DECIMAL(10, 2),
        discount INT DEFAULT 0,
        isNew BOOLEAN DEFAULT FALSE,
        image JSON,
        category JSON,
        gender VARCHAR(50),
        description TEXT,
        sku VARCHAR(100),
        stock INT DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating coupons table if not exists...');
    // await connection.query('DROP TABLE IF EXISTS coupons');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_percentage INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating shipping_rules table if not exists...');
    // await connection.query('DROP TABLE IF EXISTS shipping_rules');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shipping_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        area VARCHAR(100) NOT NULL,
        charge DECIMAL(10, 2) NOT NULL,
        free_threshold DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Inserting initial mock data...');
    const initialProducts = [
      ['Sauvage Eau de Parfum', 'Dior', 'EDP (Eau de Parfum)', JSON.stringify(['100ml / 3.4 oz', '50ml / 1.7 oz']), 520, 580, 10, true, JSON.stringify(['https://www.sephora.com/productimages/sku/s2036267-main-zoom.jpg']), JSON.stringify(['woody', 'luxury']), 'men', 'A radically fresh composition, dictated by a name that has the ring of a manifesto.', 'DIOR-SAU-100', 50],
      ['Chanel No. 5', 'Chanel', 'EDP (Eau de Parfum)', JSON.stringify(['100ml / 3.4 oz']), 750, null, 0, false, JSON.stringify(['https://www.sephora.com/productimages/product/p13491-main-zoom.jpg']), JSON.stringify(['floral', 'luxury']), 'women', 'A highly complex blend of aldehydes and florals.', 'CHAN-NO5-100', 30],
      ['Oud Wood', 'Tom Ford', 'EDP (Eau de Parfum)', JSON.stringify(['50ml / 1.7 oz']), 1050, null, 0, true, JSON.stringify(['https://www.sephora.com/productimages/sku/s1004126-main-zoom.jpg']), JSON.stringify(['arabic', 'luxury']), 'unisex', 'Rare. Exotic. Distinctive. A masterpiece of perfumery.', 'TF-OUD-50', 15],
      ['Baccarat Rouge 540', 'Maison Francis Kurkdjian', 'EDP (Eau de Parfum)', JSON.stringify(['70ml / 2.4 oz', '200ml / 6.8 oz']), 1250, 1400, 11, true, JSON.stringify(['https://cdn.saksfifthavenue.com/is/image/saks/0400088827670_1']), JSON.stringify(['spicy', 'luxury']), 'unisex', 'Luminous and sophisticated, it lays on the skin like an amber, floral, and woody breeze.', 'MFK-BR540-70', 25]
    ];

    for (const p of initialProducts) {
      await connection.query(
        `INSERT INTO products (name, brand, type, size, price, oldPrice, discount, isNew, image, category, gender, description, sku, stock)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p
      );
    }

    // Insert mock coupons
    await connection.query(
      `INSERT INTO coupons (code, discount_percentage, is_active) VALUES ('SAVE10', 10, true), ('WELCOME20', 20, true)`
    );

    // Insert mock shipping rules
    await connection.query(
      `INSERT INTO shipping_rules (area, charge, free_threshold) VALUES ('Inside Doha', 30, 500), ('Outside Doha', 50, 1000)`
    );

    console.log('Creating orders table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customerName VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        total DECIMAL(10, 2) NOT NULL,
        shippingAddress TEXT,
        paymentMethod VARCHAR(100),
        items JSON,
        status ENUM('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initDb();
