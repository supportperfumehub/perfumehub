const http = require('http');

const payload = JSON.stringify({
    name: 'Test Product',
    brand: 'Test Brand',
    type: 'P',
    size: [],
    price: 100,
    oldPrice: 120,
    discount: 10,
    isNew: true,
    isFeatured: false,
    image: [''],
    category: ['woody'],
    gender: 'men',
    description: 'This is a test product',
    sku: 'TES-TES-P',
    stock: 10,
    notes: [],
    vibes: [],
    occasions: [],
    reason: null,
    seasons: [],
    topNotes: null,
    middleNotes: null,
    baseNotes: null,
    shop_id: null
});

const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/products',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-user-id': 'mocked-id'
    }
}, (res) => {
    let raw = '';
    res.on('data', d => raw += d);
    res.on('end', () => console.log(res.statusCode, raw));
});
req.on('error', console.error);
req.write(payload);
req.end();
