import multer from 'multer';

// Use memory storage so we can validate buffers (magic bytes) before saving to disk/S3
const storage = multer.memoryStorage();

// Validate file extension and MIME type
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
    }
};

export const uploadMiddleware = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Max 5 files per request
    },
    fileFilter: fileFilter
});

/**
 * Middleware to strictly validate Magic Bytes (File Headers)
 * Prevents attackers from renaming a .php file to .jpg and bypassing multer.
 */
export const validateMagicBytes = (req, res, next) => {
    if (!req.files && !req.file) {
        return next(); // No files uploaded, skip validation
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];

    for (const file of files) {
        // Read first 4 bytes
        const header = file.buffer.toString('hex', 0, 4);
        let isValid = false;

        // Magic numbers for common image formats
        switch (header) {
            case '89504e47': // PNG
            case 'ffd8ffe0': // JPEG
            case 'ffd8ffe1': // JPEG EXIF
            case 'ffd8ffe2': // JPEG EXIF
            case 'ffd8ffe3': // JPEG EXIF
            case 'ffd8ffe8': // JPEG SPIFF
            case '52494646': // WebP (RIFF...)
                isValid = true;
                break;
            default:
                isValid = false;
                break;
        }

        if (!isValid) {
            return res.status(400).json({
                success: false,
                error: 'File upload rejected: Invalid file signature (Magic Bytes mismatch). Potential malicious file detected.'
            });
        }
    }

    next();
};

/**
 * Middleware to validate Base64 encoded images
 * Useful when the frontend doesn't use Multipart/Form-data
 */
export const validateBase64Image = (fieldName) => (req, res, next) => {
    const base64String = req.body[fieldName];
    if (!base64String) return next();

    // Check if it's a valid data URI
    const matches = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: `Invalid ${fieldName} format.` });

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    // Magic Bytes check
    const header = buffer.toString('hex', 0, 4);
    const allowedHeaders = ['89504e47', 'ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8', '52494646'];

    if (!allowedHeaders.includes(header)) {
        return res.status(400).json({ error: `Invalid file signature in ${fieldName}.` });
    }

    next();
};
