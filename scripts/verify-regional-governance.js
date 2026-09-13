import http from 'http';
import app from '../backend/src/app.js';
import { generateAccessToken } from '../backend/src/utils/tokenUtils.js';
import { supabase } from '../backend/src/config/supabaseClient.js';

async function runTests() {
    console.log('================================================================');
    console.log('       ENTERPRISE TERRITORY GOVERNANCE AUTOMATED VERIFICATION   ');
    console.log('================================================================\n');

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = 'http://localhost:' + port;

    const superAdminToken = generateAccessToken({ id: 39, role: 'super_admin' });
    const regionalAdminToken = generateAccessToken({ id: 42, role: 'regional_admin' });

    let testsPassed = 0;
    let testsFailed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log('✅ PASS:', message);
            testsPassed++;
        } else {
            console.error('❌ FAIL:', message);
            testsFailed++;
        }
    }

    // 1. Test DELETE /api/admin/discover-campaigns/clear-all (regional_admin must get 403)
    try {
        const res = await fetch(baseUrl + '/api/admin/discover-campaigns/clear-all', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + regionalAdminToken }
        });
        assert(res.status === 403, 'Regional admin cannot wipe all platform campaigns (HTTP 403)');
    } catch(e) {
        assert(false, 'Clear-all test error: ' + e.message);
    }

    // 2. Test Storefront GET /api/regions (Unauthenticated / Public access allowed to all GCC)
    try {
        const res = await fetch(baseUrl + '/api/regions');
        const data = await res.json();
        assert(res.status === 200 && Array.isArray(data) && data.length > 0, 'Storefront public GET /api/regions returns GCC regions without lockout');
    } catch(e) {
        assert(false, 'Storefront regions test error: ' + e.message);
    }

    // 3. Test GET /api/regions/my-regions for regional_admin
    try {
        const res = await fetch(baseUrl + '/api/regions/my-regions', {
            headers: { 'Authorization': 'Bearer ' + regionalAdminToken }
        });
        const data = await res.json();
        assert(res.status === 200 && Array.isArray(data) && data.some(r => r.id === 7), 'GET /api/regions/my-regions returns assigned territory (Region 7)');
    } catch(e) {
        assert(false, 'My-regions test error: ' + e.message);
    }

    // 4. Test Scoped Campaign Action on unauthorized territory shop
    try {
        const res = await fetch(baseUrl + '/api/admin/discover-campaigns', {
            method: 'POST',
            headers: { 
                'Authorization': 'Bearer ' + regionalAdminToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                placement_slot: 1,
                start_date: '2026-09-01',
                end_date: '2026-12-31',
                shop_id: '999999', // Shop not in region 7
                active: true
            })
        });
        const data = await res.json();
        assert(
            res.status === 403 && data.error === 'Access Denied: You do not have administrative authority over this geographic territory.',
            'Unauthorized shop campaign rejected with exact message: Access Denied: You do not have administrative authority over this geographic territory.'
        );
    } catch(e) {
        assert(false, 'Campaign scoping test error: ' + e.message);
    }

    // 5. Test Master Catalog MSRP Preservation
    try {
        // Query an existing product
        const { data: prod } = await supabase.from('products').select('id, price, old_price, size').limit(1).single();
        if (prod) {
            const originalPrice = prod.price;
            const originalOldPrice = prod.old_price;
            const originalSize = JSON.stringify(prod.size);

            // Find or check inventory item for this product
            const { data: inv } = await supabase.from('vendor_inventory').select('id, price').eq('product_id', prod.id).limit(1).single();
            if (inv) {
                // Update shop inventory price via PUT /api/inventory/:id
                const testVendorToken = generateAccessToken({ id: 39, role: 'super_admin' });
                const updateRes = await fetch(baseUrl + '/api/inventory/' + inv.id, {
                    method: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + testVendorToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        price: (Number(inv.price || 100) + 15),
                        stock: 50
                    })
                });

                // Verify product MSRP in products table was NOT touched
                const { data: prodAfter } = await supabase.from('products').select('id, price, old_price, size').eq('id', prod.id).single();
                assert(
                    prodAfter.price === originalPrice && prodAfter.old_price === originalOldPrice && JSON.stringify(prodAfter.size) === originalSize,
                    'Inventory PUT updates shop inventory without modifying products table master MSRP/size'
                );
            } else {
                console.log('ℹ️ Skipping inventory item check (no inventory item found for product)');
            }
        }
    } catch(e) {
        assert(false, 'Inventory master preservation error: ' + e.message);
    }

    // 6. Test Product Deletion by Regional Admin (Master Product Preserved)
    try {
        const { data: testProduct } = await supabase.from('products').select('id, name').limit(1).single();
        if (testProduct) {
            const res = await fetch(baseUrl + '/api/products/' + testProduct.id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + regionalAdminToken }
            });
            const data = await res.json();
            
            // Check that master product still exists in products table
            const { data: stillExists } = await supabase.from('products').select('id').eq('id', testProduct.id).single();
            assert(
                stillExists && stillExists.id === testProduct.id,
                'Regional Admin DELETE /api/products/:id does NOT delete master catalog product (Preserved in global DB)'
            );
            assert(
                data.action === 'regional_deactivated',
                'DELETE response confirms regional deactivation rather than global purge'
            );
        }
    } catch(e) {
        assert(false, 'Product deletion scoping test error: ' + e.message);
    }

    // 7. Test Scoped Clear-Regional Campaigns
    try {
        const res = await fetch(baseUrl + '/api/admin/discover-campaigns/clear-regional', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + regionalAdminToken }
        });
        const data = await res.json();
        assert(
            res.status === 200 && data.success === true,
            'DELETE /api/admin/discover-campaigns/clear-regional succeeds for regional admin within assigned territories'
        );
    } catch(e) {
        assert(false, 'Clear-regional campaigns error: ' + e.message);
    }

    // 8. Test Shop Status Update Boundary (Shop outside assigned territory)
    try {
        const unassignedRegionalAdminToken = generateAccessToken({ id: 59, role: 'regional_admin' });
        const res = await fetch(baseUrl + '/api/shops/d2aa735b-b9c9-4cef-a63c-846e1851c11c/status', {
            method: 'PATCH',
            headers: { 
                'Authorization': 'Bearer ' + unassignedRegionalAdminToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'ACTIVE' })
        });
        const data = await res.json();
        assert(
            res.status === 403 && data.error === 'Access Denied: You do not have administrative authority over this geographic territory.',
            'Shop status modification on unauthorized territory rejected with exact Access Denied message'
        );
    } catch(e) {
        assert(false, 'Shop status scoping test error: ' + e.message);
    }

    server.close();
    console.log('\n================================================================');
    console.log(`VERIFICATION COMPLETE: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('================================================================\n');
    process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
});
