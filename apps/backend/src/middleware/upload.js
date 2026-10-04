import multer from 'multer';

// Files are held in memory just long enough to forward to Cloudinary,
// never written to disk on our own server.
const storage = multer.memoryStorage();

// Image formats we accept, keyed by the magic bytes each format starts with.
// Declared as a type check here too so an unexpected format is caught before
// a Cloudinary round trip.
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * Detects the real content type from the file's leading bytes.
 *
 * `file.mimetype` comes from the client's own Content-Type header, so on its
 * own it proves nothing: an attacker could send a script or an HTML file
 * declared as image/png. This sniffs the magic number instead.
 *
 * SVG is deliberately not accepted. It is an XML document that can carry
 * <script>, and once Cloudinary serves it from the store's own domain that is
 * stored XSS on a trusted origin.
 *
 * Returns the sniffed MIME type, or null when the bytes are not a known image.
 */
function sniffImageMime(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return 'image/png';
    }

    // GIF: "GIF87a" or "GIF89a"
    const header = buffer.subarray(0, 6).toString('latin1');
    if (header === 'GIF87a' || header === 'GIF89a') {
        return 'image/gif';
    }

    // WebP: "RIFF" .... "WEBP"
    if (
        buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
        buffer.subarray(8, 12).toString('latin1') === 'WEBP'
    ) {
        return 'image/webp';
    }

    return null;
}

function fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'));
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(new Error(`Unsupported image type: ${file.mimetype}`));
    }
    cb(null, true);
}

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5MB per file
});

export { sniffImageMime, ALLOWED_MIME };