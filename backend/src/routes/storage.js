import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { optimizeImageBuffer, BUCKET_NAME } from '../utils/storageUtils.js';

const router = express.Router();

/**
 * POST /api/storage/presigned-url
 * Returns a temporary signed upload URL for direct browser-to-storage binary upload.
 * Eliminates large Base64 JSON payloads to Express (reducing memory footprint to < 2MB).
 */
router.post('/presigned-url', authenticateUser, async (req, res) => {
    try {
        const { fileName, fileType, folder = 'products' } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({ error: 'fileName and fileType are required' });
        }

        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
        if (!allowedMimes.includes(fileType.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, WebP, GIF, and SVG are supported.' });
        }

        const ext = fileType.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') || 'webp';
        const cleanPrefix = fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 30);
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const filePath = `${folder}/${cleanPrefix}_${uniqueId}.${ext}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUploadUrl(filePath);

        if (error) {
            console.error('[Storage] Error generating signed upload URL:', error);
            // Fallback: Generate public URL directly if signed upload is unavailable
            const { data: pubData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
            return res.json({
                success: true,
                path: filePath,
                publicUrl: pubData?.publicUrl,
                signedUrl: null
            });
        }

        const { data: pubData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        res.json({
            success: true,
            signedUrl: data.signedUrl,
            token: data.token,
            path: filePath,
            publicUrl: pubData?.publicUrl
        });
    } catch (err) {
        console.error('[Storage] Unexpected error creating presigned URL:', err);
        res.status(500).json({ error: 'Internal server error generating upload URL' });
    }
});

/**
 * POST /api/storage/upload
 * Direct multipart upload with server-side Sharp WebP optimization (80% quality, EXIF strip, breakpoints)
 */
router.post('/upload', authenticateUser, uploadMiddleware.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        const folder = req.body.folder || 'products';
        const prefix = (req.body.name || 'item').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 30);
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // 1. Generate optimized Hero WebP (1080x1080 max, 80% quality, EXIF stripped)
        const heroBuffer = await optimizeImageBuffer(req.file.buffer, { width: 1080, height: 1080, quality: 80 });
        const heroPath = `${folder}/${prefix}_${uniqueId}.webp`;

        // 2. Generate optimized Thumbnail WebP (400x400 max, 80% quality, EXIF stripped)
        const thumbBuffer = await optimizeImageBuffer(req.file.buffer, { width: 400, height: 400, quality: 80 });
        const thumbPath = `${folder}/thumbnails/${prefix}_${uniqueId}_thumb.webp`;

        // Upload both to Supabase Storage
        const [heroUpload, thumbUpload] = await Promise.all([
            supabase.storage.from(BUCKET_NAME).upload(heroPath, heroBuffer, { contentType: 'image/webp', upsert: true }),
            supabase.storage.from(BUCKET_NAME).upload(thumbPath, thumbBuffer, { contentType: 'image/webp', upsert: true })
        ]);

        if (heroUpload.error) throw heroUpload.error;

        const { data: heroUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(heroPath);
        const { data: thumbUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(thumbPath);

        res.json({
            success: true,
            url: heroUrlData?.publicUrl,
            thumbnailUrl: thumbUrlData?.publicUrl || heroUrlData?.publicUrl,
            format: 'webp',
            optimized: true
        });
    } catch (err) {
        console.error('[Storage] Upload and optimization error:', err);
        res.status(500).json({ error: 'Image processing and upload failed' });
    }
});

export default router;
