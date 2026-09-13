import { supabase } from '../config/supabaseClient.js';
import sharp from 'sharp';

export const BUCKET_NAME = 'product-images';

/**
 * Optimizes an image buffer using Sharp:
 * - Converts to optimized WebP at 80% quality
 * - Applies specified max bounds without enlargement
 * - Automatically strips EXIF metadata (40-70% size reduction)
 */
export async function optimizeImageBuffer(buffer, { width = 1080, height = 1080, quality = 80 } = {}) {
    try {
        return await sharp(buffer)
            .rotate() // Auto-orient based on EXIF before stripping
            .resize({
                width,
                height,
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality })
            .toBuffer();
    } catch (err) {
        console.warn('[Sharp] Optimization notice (using original buffer):', err.message);
        return buffer;
    }
}

/**
 * Uploads an image string (base64 or URL) to Supabase Storage with WebP optimization.
 * Returns the public URL, or the original string if it's already a URL.
 */
export async function uploadImageToStorage(base64OrUrl, prefix = 'image', folder = 'shops') {
    if (!base64OrUrl || typeof base64OrUrl !== 'string') return null;
    
    // If it's already a web URL (http:// or https://), return as-is
    if (!base64OrUrl.startsWith('data:')) {
        return base64OrUrl;
    }

    try {
        const matches = base64OrUrl.match(/^data:([a-zA-Z0-9+/.-]+);base64,(.+)$/);
        if (!matches) return base64OrUrl;

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const cleanPrefix = (prefix || 'item')
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase()
            .substring(0, 40);
        
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // Convert to optimized WebP (80% quality, EXIF stripped)
        let uploadBuffer = buffer;
        let uploadMime = 'image/webp';
        let ext = 'webp';

        try {
            uploadBuffer = await optimizeImageBuffer(buffer, { width: 1080, height: 1080, quality: 80 });
        } catch (e) {
            uploadMime = mimeType;
            ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') || 'jpg';
        }

        const fileName = folder ? `${folder}/${cleanPrefix}_${uniqueId}.${ext}` : `${cleanPrefix}_${uniqueId}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, uploadBuffer, {
                contentType: uploadMime,
                upsert: true
            });

        if (uploadError) {
            console.error('[Storage] Upload error:', uploadError.message);
            return base64OrUrl; // fallback to base64 if storage upload fails
        }

        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        return urlData?.publicUrl || base64OrUrl;
    } catch (err) {
        console.error('[Storage] Unexpected error during image upload:', err.message);
        return base64OrUrl;
    }
}

/**
 * Deletes an image from Supabase Storage given its public URL or path.
 */
export async function deleteImageFromStorage(urlOrPath) {
    if (!urlOrPath || typeof urlOrPath !== 'string') return false;

    try {
        const bucketPattern = new RegExp(`/${BUCKET_NAME}/(.+)$`);
        const match = urlOrPath.match(bucketPattern);
        
        if (!match || !match[1]) {
            return false;
        }

        const filePath = decodeURIComponent(match[1].split('?')[0]);

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (error) {
            console.warn(`[Storage] Failed to delete file ${filePath}:`, error.message);
            return false;
        }

        console.log(`[Storage] Successfully deleted older image: ${filePath}`);
        return true;
    } catch (err) {
        console.error('[Storage] Error deleting image from storage:', err.message);
        return false;
    }
}

/**
 * Replaces old image URLs with new ones, automatically removing deleted images from storage.
 */
export async function syncImagesStorage(oldUrls = [], newUrlsOrBase64 = [], prefix = 'shop', folder = 'shops') {
    const safeOldUrls = Array.isArray(oldUrls) ? oldUrls.filter(Boolean) : (oldUrls ? [oldUrls] : []);
    const safeNewInputs = Array.isArray(newUrlsOrBase64) ? newUrlsOrBase64.filter(Boolean) : (newUrlsOrBase64 ? [newUrlsOrBase64] : []);

    // 1. Upload any base64 images in new inputs
    const uploadedNewUrls = await Promise.all(
        safeNewInputs.map(input => uploadImageToStorage(input, prefix, folder))
    );

    const validNewUrls = uploadedNewUrls.filter(Boolean);

    // 2. Identify old URLs that are no longer in validNewUrls
    const removedUrls = safeOldUrls.filter(oldUrl => !validNewUrls.includes(oldUrl));

    // 3. Delete removed URLs from storage
    if (removedUrls.length > 0) {
        await Promise.all(removedUrls.map(url => deleteImageFromStorage(url)));
    }

    return validNewUrls;
}
