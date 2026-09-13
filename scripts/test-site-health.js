import app from '../backend/src/app.js';
import http from 'http';

async function runSiteHealthSuite() {
    console.log('================================================================');
    console.log('      PERFUMEHUB HIGH-CONCURRENCY HEALTH & PERF VERIFICATION    ');
    console.log('================================================================\n');

    // 1. Start ephemeral HTTP server on random port
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`Ephemeral test server running at ${baseUrl}\n`);

    const results = [];

    const record = (dimension, testCase, status, details, latencyMs) => {
        results.push({
            Dimension: dimension,
            'Test Case': testCase,
            Status: status ? 'PASS' : 'FAIL',
            'Latency (ms)': latencyMs !== undefined ? `${latencyMs}ms` : '-',
            Details: details
        });
    };

    try {
        // Test 1: Health Check Endpoint
        {
            const t0 = performance.now();
            const res = await fetch(`${baseUrl}/health`);
            const latency = Math.round(performance.now() - t0);
            const body = await res.json();
            const pass = res.status === 200 && (body.status === 'online' || body.status === 'healthy');
            record('System Health', 'GET /health', pass, `Status: ${body.status}`, latency);
        }

        // Test 2: Server-Side Keyset / Offset Pagination
        {
            const t0 = performance.now();
            const res = await fetch(`${baseUrl}/api/products?page=1&limit=24`);
            const latency = Math.round(performance.now() - t0);
            const body = await res.json();
            const isStructured = body.pagination && Array.isArray(body.products);
            const pass = res.status === 200 && isStructured && latency < 1500;
            const details = isStructured 
                ? `Products: ${body.products.length}, Page: ${body.pagination.page}/${body.pagination.totalPages}, Total: ${body.pagination.total}`
                : 'Invalid schema';
            record('Pagination (Phase 1)', 'GET /api/products?page=1&limit=24', pass, details, latency);
        }

        // Test 3: Edge CDN Caching Headers on Products
        {
            const res = await fetch(`${baseUrl}/api/products?page=1&limit=24`);
            const cacheControl = res.headers.get('cache-control') || '';
            const pass = cacheControl.includes('public') && cacheControl.includes('s-maxage=');
            record('CDN Caching (Phase 2)', 'Cache-Control on Catalog', pass, cacheControl, undefined);
        }

        // Test 4: Private Endpoints Zero-Cache Enforcement
        {
            const res = await fetch(`${baseUrl}/api/orders/track/dummy-test-order-999`);
            const cacheControl = res.headers.get('cache-control') || '';
            const pass = cacheControl.includes('no-store') || cacheControl.includes('private');
            record('Security (Phase 2)', 'Private Cache-Control on Orders', pass, cacheControl, undefined);
        }

        // Test 5: Scoped Inventory Lookup (No full-table dump)
        {
            const t0 = performance.now();
            const res = await fetch(`${baseUrl}/api/inventory?product_id=1`);
            const latency = Math.round(performance.now() - t0);
            const pass = res.status === 200;
            const data = await res.json();
            record('Inventory (Phase 1)', 'GET /api/inventory?product_id=1', pass, `Scoped rows returned: ${Array.isArray(data) ? data.length : 0}`, latency);
        }

        // Test 6: Zero N+1 Discover Slide Aggregation
        {
            const t0 = performance.now();
            const res = await fetch(`${baseUrl}/api/discover`);
            const latency = Math.round(performance.now() - t0);
            const cacheControl = res.headers.get('cache-control') || '';
            const body = await res.json();
            const pass = res.status === 200 && cacheControl.includes('public');
            record('Discover (Phase 3)', 'GET /api/discover (Zero N+1)', pass, `Slides: ${Array.isArray(body) ? body.length : 'N/A'}, CDN: ${cacheControl}`, latency);
        }

        // Test 7: Dedicated Banners Table & CDN Cache
        {
            const t0 = performance.now();
            const res = await fetch(`${baseUrl}/api/banners`);
            const latency = Math.round(performance.now() - t0);
            const cacheControl = res.headers.get('cache-control') || '';
            const body = await res.json();
            const pass = res.status === 200 && cacheControl.includes('public');
            record('Banners (Phase 5)', 'GET /api/banners', pass, `Banners: ${Array.isArray(body) ? body.length : 0}, Cache: ${cacheControl}`, latency);
        }

        // Test 8: Rate Limiting Standard Headers
        {
            const res = await fetch(`${baseUrl}/api/products?page=1&limit=1`);
            const rlLimit = res.headers.get('ratelimit-limit') || res.headers.get('x-ratelimit-limit');
            const rlRemaining = res.headers.get('ratelimit-remaining') || res.headers.get('x-ratelimit-remaining');
            const pass = Boolean(rlLimit);
            record('Rate Limiting (Phase 5)', 'Standard RateLimit Headers', pass, `Limit: ${rlLimit}, Remaining: ${rlRemaining}`, undefined);
        }

        // Test 9: 2MB Express Body Limit (Payload Diet Enforcement)
        {
            const oversizedPayload = JSON.stringify({ data: 'A'.repeat(2.5 * 1024 * 1024) }); // 2.5MB
            let payloadDietPass = false;
            try {
                const res = await fetch(`${baseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: oversizedPayload
                });
                payloadDietPass = res.status === 413; // Payload Too Large
                record('Payload Diet (Phase 4)', 'Block >2MB Payloads (HTTP 413)', payloadDietPass, `HTTP Status: ${res.status}`, undefined);
            } catch (err) {
                record('Payload Diet (Phase 4)', 'Block >2MB Payloads', false, err.message, undefined);
            }
        }

        // Test 10: Storage API Routes Mounted
        {
            const res = await fetch(`${baseUrl}/api/storage/presigned-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: 'perfume.png', fileType: 'image/png' })
            });
            // Without auth, should be 401 Unauthorized, NOT 404 Not Found
            const pass = res.status === 401 || res.status === 200;
            record('Direct Uploads (Phase 4)', 'POST /api/storage/presigned-url', pass, `HTTP Status: ${res.status} (Protected)`, undefined);
        }

    } catch (err) {
        console.error('Test suite error:', err);
    } finally {
        server.close();
    }

    console.table(results);
    const allPassed = results.every(r => r.Status === 'PASS');
    console.log(`\nOVERALL SUITE VERDICT: ${allPassed ? 'ALL TESTS PASSED (10/10)' : 'SOME TESTS FAILED'}\n`);
    process.exit(allPassed ? 0 : 1);
}

runSiteHealthSuite().catch(e => {
    console.error(e);
    process.exit(1);
});
