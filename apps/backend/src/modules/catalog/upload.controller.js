import cloudinary from '../../config/cloudinary.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';
import { sniffImageMime } from '../../middleware/upload.js';

/** POST /api/v1/products/upload-image — admin uploads one image, gets back a URL. */
export const uploadProductImage = catchAsync(async (req, res, next) => {
    if (!req.file) return next(new AppError('No image file was provided', 400));

    // The declared Content-Type is attacker-controlled, so the bytes decide.
    // Checked before the Cloudinary round trip so a disguised file is rejected
    // here rather than becoming a stored object on our own CDN domain.
    const actualMime = sniffImageMime(req.file.buffer);
    if (!actualMime) {
        return next(new AppError('That file is not a valid image', 400));
    }
    if (actualMime !== req.file.mimetype) {
        return next(
            new AppError(
                `File content does not match its declared type (${actualMime})`,
                400,
            ),
        );
    }

    // Cloudinary's upload_stream expects a readable stream, but multer
    // gives us the file as a plain buffer in memory. This wraps that
    // buffer in a promise so we can await the result normally.
    const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'techu-products' },
            (err, uploadResult) => (err ? reject(err) : resolve(uploadResult)),
        );
        stream.end(req.file.buffer);
    });

    res.status(201).json({ success: true, data: { url: result.secure_url } });
});