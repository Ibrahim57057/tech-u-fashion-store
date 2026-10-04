import mongoose from 'mongoose';
import Product from './product.model.js';
import Category from './category.model.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';
import { ApiFeatures } from '../../utils/apiFeatures.js';
import { destroyCloudinaryAssets } from '../../utils/cloudinaryCleanup.js';

/**
 * Filters may arrive as "?size=41,42", "?size=41&size=42" or an array, so
 * flatten every shape into a clean list of non-empty strings.
 */
export function toFilterList(value) {
    // An absent parameter must produce an empty list. String(undefined) is
    // the literal text "undefined", so without this guard every request
    // without a filter would match against the word "undefined".
    if (value === undefined || value === null) return [];

    const raw = Array.isArray(value) ? value : [value];
    return raw
        .filter((v) => v !== undefined && v !== null)
        .flatMap((v) => String(v).split(','))
        .map((v) => v.trim())
        .filter(Boolean);
}

/**
 * "blue" should match "Blue". Every value is anchored and escaped first, so
 * a value like "b.*" matches only that literal text instead of being
 * evaluated as a regular expression.
 */
export function asCaseInsensitiveSet(values) {
    return values.map((v) => new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
}

/**
 * Builds the Mongo filter for the size / colour / brand choices. Split out
 * from the request handler so it can be tested directly.
 *
 * The important part is $elemMatch: the chosen size and the chosen colour
 * have to describe the SAME variant. With two separate conditions a product
 * holding Blue/39 and White/41 would still match "Blue + 41", because each
 * condition is satisfied by some variant — just not by the same one.
 */
export function buildProductFilter({ baseFilter = {}, size, color, brand } = {}) {
    const filter = { ...baseFilter };

    const sizes = toFilterList(size);
    const colors = toFilterList(color);
    const brands = toFilterList(brand);

    if (brands.length) {
        filter.brand = { $in: asCaseInsensitiveSet(brands) };
    }

    if (sizes.length || colors.length) {
        filter.variants = {
            $elemMatch: {
                ...(sizes.length ? { size: { $in: asCaseInsensitiveSet(sizes) } } : {}),
                ...(colors.length ? { color: { $in: asCaseInsensitiveSet(colors) } } : {}),
                // A variant you cannot buy is not a useful result.
                stock: { $gt: 0 },
            },
        };
    }

    return filter;
}

/** Shoe/clothing sizes, so XL lands after L and 9.5 lands after 9. */
export function sortSizes(a, b) {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (Number.isNaN(na) && Number.isNaN(nb)) return a.localeCompare(b);
    if (Number.isNaN(na)) return -1; // letter sizes first
    if (Number.isNaN(nb)) return 1;
    return na - nb;
}

/**
 * GET /api/v1/products
 *
 * Every route handler here follows the same shape: wrapped in
 * catchAsync (so thrown errors reach globalErrorHandler automatically),
 * and every response follows { success, data } — matching exactly
 * what your frontend's apiClient.js already expects.
 *
 * Filtering happens here, before pagination, so a page of results is a real
 * page of matching products rather than a page of everything with the
 * filtering bolted on afterwards.
 */
export const getAllProducts = catchAsync(async (req, res) => {
    // req.safeQuery, not req.query: sanitizeRequest() strips Mongo operator
    // keys there, and `...restQuery` below forwards everything not destructured
    // into ApiFeatures — so an unsanitised query put `?$where=...` into
    // Product.find(). See middleware/sanitize.js for why req.query itself
    // cannot be cleaned.
    const { search, category, size, color, brand, ...restQuery } = req.safeQuery;

    // Everything except the choice of size/colour/brand, so the sidebar
    // options stay complete even while a filter is active.
    const baseFilter = { isActive: true };
    if (search) {
        baseFilter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    if (category) {
        // Accepts a slug ("sneakers") or a raw ObjectId.
        const byId = mongoose.isValidObjectId(category);
        const match = await Category.findOne(
            byId ? { _id: category } : { slug: String(category).toLowerCase() },
        ).select('_id');

        // An unknown category must return nothing. Silently falling back to
        // the whole catalogue is what made /products?category=sneakers show
        // all 80 products under a "Sneakers" heading.
        if (!match) return res.json({ success: true, data: [], meta: emptyMeta(restQuery) });

        baseFilter.category = match._id;
    }

    const filter = buildProductFilter({ baseFilter, size, color, brand });

    const features = new ApiFeatures(
        Product.find(filter).populate('category', 'name slug'),
        restQuery,
    )
        .filter()
        .sort()
        .paginate();

    // Count the filtered set, not the whole catalogue — meta.total used to be
    // a constant 80 no matter what you filtered by, which is what the
    // "N items" counter and any pagination would have shown.
    const [products, total, allSizes, allColors, allBrands] = await Promise.all([
        features.query,
        Product.countDocuments(filter),
        Product.distinct('variants.size', baseFilter),
        Product.distinct('variants.color', baseFilter),
        Product.distinct('brand', baseFilter),
    ]);

    res.json({
        success: true,
        data: products,
        meta: {
            total,
            // Reported from the paginator, not straight off the query string,
            // so ?limit=1000000 advertises the 100 that were actually applied
            // and the frontend's pager stays consistent with the results.
            page: features.page,
            limit: features.limit,
            // Derived from the database so a new colour, size or brand shows
            // up in the sidebar on its own, instead of someone having to edit
            // a hardcoded list in the frontend.
            filters: {
                sizes: allSizes.filter(Boolean).sort(sortSizes),
                colors: allColors.filter(Boolean).sort((a, b) => a.localeCompare(b)),
                brands: allBrands.filter(Boolean).sort((a, b) => a.localeCompare(b)),
            },
        },
    });
});

/** Response shape for the "nothing matched" cases. */
function emptyMeta(query = {}) {
    return {
        total: 0,
        page: Number(query.page) || 1,
        limit: Math.min(Number(query.limit) || 20, 100),
        filters: { sizes: [], colors: [], brands: [] },
    };
}/**
 * GET /api/v1/products/:slug
 */
export const getProductBySlug = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate(
        'category',
        'name slug',
    );

    if (!product) {
        return next(new AppError('Product not found', 404));
    }

    res.json({ success: true, data: product });
});

/** GET /api/v1/products/by-id/:id — admin only, used by the edit form. */
export const getProductById = catchAsync(async (req, res, next) => {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');
    if (!product) return next(new AppError('Product not found', 404));
    res.json({ success: true, data: product });
});

/**
 * POST /api/v1/products
 * (Admin-only — we'll add that protection once the auth module exists.)
 */
export const createProduct = catchAsync(async (req, res) => {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
});

/**
 * PATCH /api/v1/products/:id
 */
export const updateProduct = catchAsync(async (req, res, next) => {
    const before = await Product.findById(req.params.id).select('images');
    if (!before) {
        return next(new AppError('Product not found', 404));
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        returnDocument: 'after', // return the UPDATED document, not the old one
        runValidators: true, // re-run schema validation on the update
    });

    if (!product) {
        return next(new AppError('Product not found', 404));
    }

    // Removing an image from the form used to drop the URL from the array and
    // leave the file sitting in the Cloudinary account forever — invisible
    // storage cost that adds up over a few thousand products. Deleting only the
    // ones actually removed keeps the account matching what the site serves.
    //
    // Cleanup runs AFTER the document is saved and its failures are swallowed
    // by destroyCloudinaryAssets: a Cloudinary outage must not turn a
    // successful product edit into a 500 that the admin would read as a failed
    // save, when the save in fact went through.
    if (Array.isArray(req.body.images)) {
        const kept = new Set(req.body.images);
        const removed = before.images.filter((url) => !kept.has(url));
        if (removed.length > 0) {
            void destroyCloudinaryAssets(removed);
        }
    }

    res.json({ success: true, data: product });
});

/**
 * DELETE /api/v1/products/:id
 * "Delete" here means hide, per our Round 5 rule — never actually
 * remove the document, since past orders may reference it.
 */
export const deactivateProduct = catchAsync(async (req, res, next) => {
    const product = await Product.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { returnDocument: 'after' },
    );

    if (!product) {
        return next(new AppError('Product not found', 404));
    }

    res.json({ success: true, data: product });
});

/** PATCH /api/v1/products/bulk-deactivate — admin only, body: { ids: [...] } */
export const bulkDeactivateProducts = catchAsync(async (req, res) => {
    const { ids } = req.body;
    await Product.updateMany({ _id: { $in: ids } }, { isActive: false });
    res.json({ success: true, data: null });
});