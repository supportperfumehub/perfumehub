import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../backend/src/config/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const BASE_URL = 'https://perfumehubqa.com';

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
        return new Date(dateStr).toISOString().split('T')[0];
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

async function generateSitemapAndFeeds() {
    console.log('----------------------------------------------------');
    console.log('🚀 PerfumeHub Qatar: Generating Sitemap & Merchant Feed');
    console.log('----------------------------------------------------');

    // 1. Fetch active products from Supabase
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, brand, price, old_price, stock, image, description, category, gender, created_at, updated_at')
        .order('id', { ascending: false });

    if (error) {
        console.error('❌ Error fetching products from Supabase:', error.message);
        process.exit(1);
    }

    console.log(`📦 Found ${products?.length || 0} products in database.`);

    const today = new Date().toISOString().split('T')[0];

    // 2. Define Core Static & Category Routes
    const staticRoutes = [
        { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily', hreflang: true },
        { loc: `${BASE_URL}/shop`, priority: '0.95', changefreq: 'daily', hreflang: true },
        { loc: `${BASE_URL}/brands`, priority: '0.85', changefreq: 'weekly', hreflang: true },
        { loc: `${BASE_URL}/scent-genie`, priority: '0.85', changefreq: 'weekly', hreflang: true },
        { loc: `${BASE_URL}/category/gift-box`, priority: '0.80', changefreq: 'weekly', hreflang: false },
        { loc: `${BASE_URL}/category/fashion`, priority: '0.75', changefreq: 'weekly', hreflang: false },
        { loc: `${BASE_URL}/category/jewellery`, priority: '0.75', changefreq: 'weekly', hreflang: false },
        { loc: `${BASE_URL}/about`, priority: '0.70', changefreq: 'monthly', hreflang: false },
        { loc: `${BASE_URL}/contact`, priority: '0.70', changefreq: 'monthly', hreflang: false },
        { loc: `${BASE_URL}/faq`, priority: '0.70', changefreq: 'monthly', hreflang: false },
        { loc: `${BASE_URL}/shipping-policy`, priority: '0.50', changefreq: 'monthly', hreflang: false },
        { loc: `${BASE_URL}/refund-policy`, priority: '0.50', changefreq: 'monthly', hreflang: false },
        { loc: `${BASE_URL}/terms-conditions`, priority: '0.50', changefreq: 'monthly', hreflang: false },
        { loc: `${BASE_URL}/privacy-policy`, priority: '0.50', changefreq: 'monthly', hreflang: false }
    ];

    // 3. Build XML Sitemap
    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemapXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    sitemapXml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n`;
    sitemapXml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    for (const route of staticRoutes) {
        sitemapXml += `  <url>\n`;
        sitemapXml += `    <loc>${route.loc}</loc>\n`;
        if (route.hreflang) {
            sitemapXml += `    <xhtml:link rel="alternate" hreflang="en-QA" href="${route.loc}" />\n`;
            sitemapXml += `    <xhtml:link rel="alternate" hreflang="ar-QA" href="${route.loc}" />\n`;
            sitemapXml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${route.loc}" />\n`;
        }
        sitemapXml += `    <lastmod>${today}</lastmod>\n`;
        sitemapXml += `    <changefreq>${route.changefreq}</changefreq>\n`;
        sitemapXml += `    <priority>${route.priority}</priority>\n`;
        sitemapXml += `  </url>\n`;
    }

    // Add individual product URLs
    for (const p of products || []) {
        const prodUrl = `${BASE_URL}/product/${p.id}`;
        const lastMod = formatDate(p.updated_at || p.created_at);
        let firstImage = '';
        if (Array.isArray(p.image) && p.image.length > 0) {
            firstImage = p.image[0];
        } else if (typeof p.image === 'string') {
            try {
                const parsed = JSON.parse(p.image);
                firstImage = Array.isArray(parsed) ? parsed[0] : parsed;
            } catch {
                firstImage = p.image;
            }
        }

        sitemapXml += `  <url>\n`;
        sitemapXml += `    <loc>${prodUrl}</loc>\n`;
        sitemapXml += `    <lastmod>${lastMod}</lastmod>\n`;
        sitemapXml += `    <changefreq>weekly</changefreq>\n`;
        sitemapXml += `    <priority>0.80</priority>\n`;

        if (firstImage && firstImage.startsWith('http')) {
            sitemapXml += `    <image:image>\n`;
            sitemapXml += `      <image:loc>${escapeXml(firstImage)}</image:loc>\n`;
            sitemapXml += `      <image:title>${escapeXml(p.name)} by ${escapeXml(p.brand || 'PerfumeHub Qatar')}</image:title>\n`;
            sitemapXml += `      <image:caption>Buy authentic ${escapeXml(p.name)} in Doha, Qatar at PerfumeHub</image:caption>\n`;
            sitemapXml += `    </image:image>\n`;
        }
        sitemapXml += `  </url>\n`;
    }

    sitemapXml += `</urlset>\n`;

    const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemapXml, 'utf-8');
    console.log(`✅ Sitemap saved to ${sitemapPath} (Total URLs: ${staticRoutes.length + (products?.length || 0)})`);

    // 4. Build Google Merchant Center RSS Feed (Google Shopping in Qatar)
    let merchantXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    merchantXml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`;
    merchantXml += `  <channel>\n`;
    merchantXml += `    <title>PerfumeHub Qatar</title>\n`;
    merchantXml += `    <link>${BASE_URL}</link>\n`;
    merchantXml += `    <description>PerfumeHub Qatar - 100% Authentic Luxury Perfumes &amp; Fragrances Store in Doha</description>\n`;

    for (const p of products || []) {
        let firstImage = '';
        if (Array.isArray(p.image) && p.image.length > 0) {
            firstImage = p.image[0];
        } else if (typeof p.image === 'string') {
            try {
                const parsed = JSON.parse(p.image);
                firstImage = Array.isArray(parsed) ? parsed[0] : parsed;
            } catch {
                firstImage = p.image;
            }
        }

        const isAvailable = (p.stock === null || p.stock === undefined || p.stock > 0);
        const priceQAR = `${Number(p.price || 0).toFixed(2)} QAR`;
        const title = `${p.name} - ${p.brand || 'PerfumeHub'}`;
        const desc = p.description 
            ? `${p.description.substring(0, 500)}... Buy original ${p.name} in Qatar with fast express delivery in Doha.`
            : `Buy authentic ${p.name} in Doha, Qatar. Fast express delivery and Cash on Delivery available at PerfumeHub.`;

        merchantXml += `    <item>\n`;
        merchantXml += `      <g:id>${p.id}</g:id>\n`;
        merchantXml += `      <g:title>${escapeXml(title)}</g:title>\n`;
        merchantXml += `      <g:description>${escapeXml(desc)}</g:description>\n`;
        merchantXml += `      <g:link>${BASE_URL}/product/${p.id}</g:link>\n`;
        if (firstImage && firstImage.startsWith('http')) {
            merchantXml += `      <g:image_link>${escapeXml(firstImage)}</g:image_link>\n`;
        } else {
            merchantXml += `      <g:image_link>${BASE_URL}/favicon.png</g:image_link>\n`;
        }
        merchantXml += `      <g:availability>${isAvailable ? 'in_stock' : 'out_of_stock'}</g:availability>\n`;
        merchantXml += `      <g:price>${priceQAR}</g:price>\n`;
        if (p.old_price && p.old_price > p.price) {
            merchantXml += `      <g:sale_price>${priceQAR}</g:sale_price>\n`;
        }
        merchantXml += `      <g:brand>${escapeXml(p.brand || 'PerfumeHub Qatar')}</g:brand>\n`;
        merchantXml += `      <g:condition>new</g:condition>\n`;
        merchantXml += `      <g:shipping>\n`;
        merchantXml += `        <g:country>QA</g:country>\n`;
        merchantXml += `        <g:service>Same-Day Express Doha &amp; Lusail</g:service>\n`;
        merchantXml += `        <g:price>0.00 QAR</g:price>\n`;
        merchantXml += `      </g:shipping>\n`;
        merchantXml += `    </item>\n`;
    }

    merchantXml += `  </channel>\n`;
    merchantXml += `</rss>\n`;

    const merchantPath = path.join(PUBLIC_DIR, 'google-merchant-feed.xml');
    fs.writeFileSync(merchantPath, merchantXml, 'utf-8');
    console.log(`✅ Google Merchant Center Feed saved to ${merchantPath}`);
    console.log('🎉 Generation completed successfully.');
}

generateSitemapAndFeeds()
    .then(() => {
        // Allow Node event loop to cleanly drain handles
        setTimeout(() => {
            process.exit(0);
        }, 50);
    })
    .catch((err) => {
        console.error('Fatal error generating sitemaps:', err);
        process.exit(1);
    });
