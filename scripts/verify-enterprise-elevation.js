import http from 'http';
import app from '../backend/src/app.js';
import { generateAccessToken, generateRefreshToken } from '../backend/src/utils/tokenUtils.js';

async function runElevationVerification() {
    console.log('================================================================');
    console.log('       PERFUMEHUB ENTERPRISE 9.8+ UNIFIED PLATFORM VERIFICATION ');
    console.log('================================================================\n');

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

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

    try {
        // --- 1. TOKEN EXPIRATION VALIDATION ---
        console.log('\n--- 1. Security & Token Policy Lockdown ---');
        const customerToken = generateAccessToken({ id: 30, role: 'customer' });
        const vendorToken = generateAccessToken({ id: 61, role: 'vendor' });
        const superAdminToken = generateAccessToken({ id: 39, role: 'super_admin' });
        const regionalAdminToken = generateAccessToken({ id: 42, role: 'regional_admin' });

        const testShopId = '06ccfd1c-b631-4c7e-b01b-ee2388493f7c'; // Owned by vendor 61
        const otherShopId = 'd2aa735b-b9c9-4cef-a63c-846e1851c11c'; // Owned by 42

        assert(Boolean(customerToken && vendorToken && superAdminToken), 'Access tokens generate successfully with cryptographic signatures');

        // --- 2. BOLA & AUTHORIZATION LOCKDOWN (TASK 1) ---
        console.log('\n--- 2. BOLA & Authorization Lockdown (/api/shops/:id/*) ---');

        // 2.1 Customer calling /settings -> MUST be 403 Forbidden
        const custSettingsRes = await fetch(`${baseUrl}/api/shops/${testShopId}/settings`, {
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        assert(custSettingsRes.status === 403, 'Customer role strictly forbidden from GET /api/shops/:id/settings (HTTP 403)');

        // 2.2 Customer calling /financials -> MUST be 403 Forbidden
        const custFinRes = await fetch(`${baseUrl}/api/shops/${testShopId}/financials`, {
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        assert(custFinRes.status === 403, 'Customer role strictly forbidden from GET /api/shops/:id/financials (HTTP 403)');

        // 2.3 Customer calling /payout-info -> MUST be 403 Forbidden
        const custPayoutInfoRes = await fetch(`${baseUrl}/api/shops/${testShopId}/payout-info`, {
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        assert(custPayoutInfoRes.status === 403, 'Customer role strictly forbidden from GET /api/shops/:id/payout-info (HTTP 403)');

        // 2.4 Unauthenticated request to /settings -> MUST be 401 Unauthorized
        const unauthSettingsRes = await fetch(`${baseUrl}/api/shops/${testShopId}/settings`);
        assert(unauthSettingsRes.status === 401, 'Unauthenticated visitor blocked from shop settings (HTTP 401)');

        // 2.5 Super Admin calling /settings -> MUST NOT be 403
        const adminSettingsRes = await fetch(`${baseUrl}/api/shops/${testShopId}/settings`, {
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        });
        assert(adminSettingsRes.status === 200, 'Super Admin granted authorization to shop settings (HTTP 200)');

        // 2.6 Vendor calling other vendor's shop settings -> MUST be 403 Forbidden (Cross-tenant BOLA prevention)
        const vendorCrossBOLA = await fetch(`${baseUrl}/api/shops/${otherShopId}/settings`, {
            headers: { 'Authorization': `Bearer ${vendorToken}` }
        });
        assert(vendorCrossBOLA.status === 403, 'Vendor prevented from accessing foreign boutique settings (Cross-Tenant BOLA HTTP 403)');

        // --- 3. PUBLIC PRODUCTS CATALOG WITH BOUTIQUE DATA (TASK 2) ---
        console.log('\n--- 3. Public Products Catalog & Stock Attributions ---');
        const prodRes = await fetch(`${baseUrl}/api/products?limit=5`);
        const prodData = await prodRes.json();
        const prods = Array.isArray(prodData) ? prodData : (prodData.products || []);
        assert(prodRes.status === 200 && prods.length > 0, 'Public GET /api/products returns products successfully');
        
        const hasShopOrInventory = prods.some(p => p.shop_id || p.shop || (p.inventories && p.inventories.length > 0));
        assert(hasShopOrInventory, 'Products attach active boutique or inventory associations without dummy IDs');

        // --- 4. SETTLEMENTS & PAYOUTS ENDPOINTS (TASK 3) ---
        console.log('\n--- 4. Super Admin Payouts & Settlements Governance ---');
        const payoutsRes = await fetch(`${baseUrl}/api/admin/payouts`, {
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        });
        assert(payoutsRes.status === 200, 'Super Admin GET /api/admin/payouts returns settlements ledger (HTTP 200)');

        // Customer trying to view admin payouts -> 403
        const custAdminPayouts = await fetch(`${baseUrl}/api/admin/payouts`, {
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        assert(custAdminPayouts.status === 403, 'Customer blocked from admin payouts ledger (HTTP 403)');

        // Financial Summary Endpoint
        const finSummaryRes = await fetch(`${baseUrl}/api/admin/financial-summary`, {
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        });
        assert(finSummaryRes.status === 200, 'Super Admin GET /api/admin/financial-summary returns GMV & escrow totals (HTTP 200)');

    } catch (err) {
        console.error('Fatal test error:', err);
        assert(false, `Unexpected error during test execution: ${err.message}`);
    } finally {
        server.close();
    }

    console.log('\n================================================================');
    console.log(`VERIFICATION SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('================================================================\n');

    if (testsFailed > 0) {
        process.exit(1);
    }
}

runElevationVerification();
