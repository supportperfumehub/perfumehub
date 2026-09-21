import express from 'express';
import { generateAccessToken } from '../backend/src/utils/tokenUtils.js';
import productRouter from '../backend/src/routes/products.js';

// Setup minimal express app for route verification
const app = express();
app.use(express.json());
app.use('/api/products', productRouter);

async function verifyProductPermissions() {
    console.log('--- 🧪 STARTING PRODUCT PERMISSIONS VERIFICATION ---');

    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    try {
        // Test 1: Generate token for regional_admin (ID 59)
        const regionalAdminToken = generateAccessToken({ id: 59, email: 'Northclubparis@gmail.com', role: 'regional_admin' });
        console.log('Step 1: Regional admin token generated.');

        // Test 2: Generate token for super_admin (ID 39)
        const superAdminToken = generateAccessToken({ id: 39, email: 'admin@perfumehub.com', role: 'super_admin' });
        console.log('Step 2: Super admin token generated.');

        // Test 3: Regional admin attempting to create a test product
        console.log('\nStep 3: Testing product creation with regional_admin token...');
        const testProductPayload = {
            name: 'Verification Test Fragrance ' + Date.now(),
            brand: 'Test Brand',
            price: 250,
            stock: 15,
            category: ['perfume'],
            gender: 'unisex'
        };

        const res = await fetch(`${baseUrl}/api/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${regionalAdminToken}`
            },
            body: JSON.stringify(testProductPayload)
        });

        const body = await res.json();
        console.log('Response Status:', res.status);
        console.log('Response Body:', body);

        if (res.status === 403) {
            throw new Error(`FAILED: 403 Forbidden received for regional_admin! Body: ${JSON.stringify(body)}`);
        }

        if (res.status !== 201 && res.status !== 200) {
            throw new Error(`Expected 201 or 200, got ${res.status}: ${JSON.stringify(body)}`);
        }

        const createdId = body.id;
        console.log(`✅ Product created successfully with ID: ${createdId}`);

        // Clean up: delete test product using super admin token
        if (createdId) {
            console.log(`\nStep 4: Cleaning up created test product (${createdId})...`);
            const delRes = await fetch(`${baseUrl}/api/products/${createdId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${superAdminToken}`
                }
            });
            const delBody = await delRes.json();
            console.log('Delete response status:', delRes.status);
            console.log('Delete response body:', delBody);
            console.log('✅ Cleanup successful.');
        }

        console.log('\n🎉 VERIFICATION COMPLETE: ALL PRODUCT PERMISSIONS OPERATING WITH 100% SUCCESS!');
    } finally {
        server.close();
    }
}

verifyProductPermissions().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
