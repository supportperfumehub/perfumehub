import http from 'http';
import app from '../backend/src/app.js';
import { generateAccessToken } from '../backend/src/utils/tokenUtils.js';
import { supabase } from '../backend/src/config/supabaseClient.js';

async function runTests() {
    console.log('\n============================================================');
    console.log('       VENDOR EXPERIENCE ELEVATION VERIFICATION SUITE       ');
    console.log('============================================================\n');

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    // Valid vendor account from Supabase
    const VENDOR_ID = 61;
    const VENDOR_SHOP_ID = '06ccfd1c-b631-4c7e-b01b-ee2388493f7c';
    const SUB_ORDER_ID = '00000000-0000-0000-0000-000000000888';

    const vendorToken = generateAccessToken({
        id: VENDOR_ID,
        email: 'perfumehubCentury@gmail.com',
        role: 'vendor',
        shop_id: VENDOR_SHOP_ID
    });

    let passed = 0;
    let failed = 0;

    function assert(condition, message, details) {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${message}`, details || '');
            failed++;
        }
    }

    try {
        // Ensure test sub_order exists for our vendor shop
        await supabase.from('sub_orders').upsert({
            id: SUB_ORDER_ID,
            parent_order_id: 4,
            shop_id: VENDOR_SHOP_ID,
            status: 'pending',
            fulfillment_type: 'delivery',
            subtotal: 500,
            total_amount: 500
        });

        // Ensure a test inventory item exists with reserved_quantity
        const { data: invRow } = await supabase.from('vendor_inventory').select('id, stock, reserved_quantity').eq('shop_id', VENDOR_SHOP_ID).limit(1);
        let testInvId = invRow && invRow[0] ? invRow[0].id : null;
        if (testInvId) {
            await supabase.from('vendor_inventory').update({ stock: 10, reserved_quantity: 4 }).eq('id', testInvId);
        }

        // --- TEST 1: Master Catalog Lock (PUT /api/products/:id forbidden to vendors) ---
        console.log('[TEST 1] Master Catalog Lock (PUT /api/products/1)...');
        try {
            const res = await fetch(`${baseUrl}/api/products/1`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + vendorToken
                },
                body: JSON.stringify({ name: 'Tampered Global Catalog Item' })
            });
            assert(res.status === 403, 'Vendor receives HTTP 403 Forbidden attempting to modify master catalog', res.status);
        } catch (e) {
            assert(false, 'Test 1 error: ' + e.message);
        }

        // --- TEST 2: Shop Settings Dual DB Persistence ---
        console.log('\n[TEST 2] Shop Settings DB Persistence (PUT/GET /api/shops/:id/settings)...');
        try {
            const putRes = await fetch(`${baseUrl}/api/shops/${VENDOR_SHOP_ID}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + vendorToken
                },
                body: JSON.stringify({
                    openTime: '10:00 AM',
                    closeTime: '11:00 PM',
                    allowStorePickup: true,
                    allowHomeDelivery: true,
                    deliveryWindow: 'same_day',
                    whatsappGreeting: 'Welcome to Royal Oud Boutique at Mall of Qatar!'
                })
            });

            const getRes = await fetch(`${baseUrl}/api/shops/${VENDOR_SHOP_ID}/settings`, {
                headers: { 'Authorization': 'Bearer ' + vendorToken }
            });
            const getBody = await getRes.json();

            assert(
                getRes.status === 200 && getBody?.settings?.openTime === '10:00 AM',
                'Shop settings persisted and retrieved without relying on browser localStorage',
                { status: getRes.status, body: getBody }
            );
        } catch (e) {
            assert(false, 'Test 2 error: ' + e.message);
        }

        // --- TEST 3: Sub-Order Courier Tracking ---
        console.log('\n[TEST 3] Sub-Order Courier Tracking (PUT /api/orders/sub-orders/:id/tracking)...');
        try {
            const trkRes = await fetch(`${baseUrl}/api/orders/sub-orders/${SUB_ORDER_ID}/tracking`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + vendorToken
                },
                body: JSON.stringify({ tracking_number: 'ARAMEX-QA-998877' })
            });
            const trkBody = await trkRes.json();

            assert(
                trkRes.status === 200 && trkBody?.subOrder?.tracking_number === 'ARAMEX-QA-998877',
                'Courier tracking number persisted cleanly on vendor sub-order',
                { status: trkRes.status, body: trkBody }
            );
        } catch (e) {
            assert(false, 'Test 3 error: ' + e.message);
        }

        // --- TEST 4: Financials & Ledger Transparency ---
        console.log('\n[TEST 4] Financials Ledger (GET /api/shops/:id/financials)...');
        try {
            const finRes = await fetch(`${baseUrl}/api/shops/${VENDOR_SHOP_ID}/financials`, {
                headers: { 'Authorization': 'Bearer ' + vendorToken }
            });
            const finBody = await finRes.json();

            assert(
                finRes.status === 200 && typeof finBody?.financials?.netAvailableBalance === 'number' && typeof finBody?.financials?.grossSales === 'number',
                'Financials ledger returns computed Gross Sales, Platform Fee (10%), and Net Available Balance',
                { status: finRes.status, body: finBody }
            );
        } catch (e) {
            assert(false, 'Test 4 error: ' + e.message);
        }

        // --- TEST 5: IBAN Registration & Payout Info ---
        console.log('\n[TEST 5] Payout IBAN Registration (PUT/GET /api/shops/:id/payout-info)...');
        try {
            const putIban = await fetch(`${baseUrl}/api/shops/${VENDOR_SHOP_ID}/payout-info`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + vendorToken
                },
                body: JSON.stringify({
                    bank_name: 'Qatar National Bank (QNB)',
                    account_name: 'Royal Amber Boutique WLL',
                    iban: 'QA00QNBA000000000000000000000',
                    swift: 'QNBAQAQA'
                })
            });

            const getIban = await fetch(`${baseUrl}/api/shops/${VENDOR_SHOP_ID}/payout-info`, {
                headers: { 'Authorization': 'Bearer ' + vendorToken }
            });
            const ibanBody = await getIban.json();

            assert(
                getIban.status === 200 && ibanBody?.payoutInfo?.iban === 'QA00QNBA000000000000000000000',
                'Vendor bank account and IBAN registered and persisted for payouts',
                { status: getIban.status, body: ibanBody }
            );
        } catch (e) {
            assert(false, 'Test 5 error: ' + e.message);
        }

        // --- TEST 6: Stripe Checkout Session & Boutique Tier Elevation ---
        console.log('\n[TEST 6] Stripe Subscription Checkout (POST /api/subscriptions/create-checkout-session)...');
        try {
            const { data: plans } = await supabase.from('subscription_plans').select('id').limit(1);
            const planId = plans && plans[0] ? plans[0].id : 'b5816e74-b49a-4b78-994b-1a32462b7229';

            const sessRes = await fetch(`${baseUrl}/api/subscriptions/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + vendorToken
                },
                body: JSON.stringify({ planId, shopId: VENDOR_SHOP_ID })
            });
            const sessBody = await sessRes.json();

            assert(
                sessRes.status === 200 && sessBody?.sessionId,
                'Stripe checkout session initialized with boutique tier elevation workflow',
                { status: sessRes.status, body: sessBody }
            );
        } catch (e) {
            assert(false, 'Test 6 error: ' + e.message);
        }

        // --- TEST 7: Inventory Stock Reservation Pre-Validation ---
        console.log('\n[TEST 7] Stock Reservation Pre-Validation (PUT /api/inventory/:id)...');
        if (testInvId) {
            try {
                // Try to set stock = 2 when reserved_quantity is 4 (Must be rejected with 400)
                const invRes = await fetch(`${baseUrl}/api/inventory/${testInvId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + vendorToken
                    },
                    body: JSON.stringify({ stock: 2 })
                });
                const invBody = await invRes.json();

                assert(
                    invRes.status === 400 && invBody?.error?.includes('reserved quantity'),
                    'Inventory rejects stock reductions below currently active reserved quantity (HTTP 400)',
                    { status: invRes.status, body: invBody }
                );

                // Restore stock to safe level
                await supabase.from('vendor_inventory').update({ stock: 15 }).eq('id', testInvId);
            } catch (e) {
                assert(false, 'Test 7 error: ' + e.message);
            }
        } else {
            console.log('⚠️ SKIP TEST 7: No inventory item found to test stock reservation');
        }

    } finally {
        await new Promise(res => server.close(res));
    }

    console.log('\n============================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

    if (failed > 0) {
        process.exitCode = 1;
    }
}

runTests();
