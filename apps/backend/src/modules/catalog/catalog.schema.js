import { z } from 'zod';

// Matches product.model.js exactly — this is the request-body-level
// check (does the JSON coming in look right?), separate from Mongoose's
// database-level check (does it satisfy the schema when saving?).
// Having both is deliberate: Zod gives fast, clear error messages
// before we even touch the database; Mongoose is the final safety net.

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Not a valid id');

const variantInputSchema = z.object({
    // Zod strips keys it does not declare, and the admin product form
    // round-trips each variant's _id so the server can update that exact
    // sub-document. Dropping it here would silently mint a new _id for every
    // variant on every save, which invalidates any cart or wishlist already
    // pointing at the old variant ids.
    _id: objectId.optional(),
    size: z.string().min(1, 'Size is required'),
    color: z.string().min(1, 'Color is required'),
    sku: z.string().min(1, 'SKU is required'),
    stock: z.number().int().min(0, 'Stock cannot be negative'),
    images: z.array(z.url()).optional(),
});

export const createProductSchema = z.object({
    name: z.string().min(2).max(200),
    brand: z.string().min(1),
    description: z.string().min(10),
    priceFrom: z.number().int().positive('Price must be a positive integer, in kobo'),
    images: z.array(z.string().url()).min(1, 'At least one image is required'),
    category: z.string().min(1, 'Category is required'),
    variants: z.array(variantInputSchema).min(1, 'At least one variant is required'),
});

export const updateProductSchema = createProductSchema.partial();

/**
 * Categories. Both fields are required by category.model.js, so they are
 * required here too — and `slug` is constrained to the character set a slug
 * actually needs, which stops a category being created that can never be
 * matched by the `?category=` lookup in getAllProducts.
 */
export const createCategorySchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(60),
    slug: z
        .string()
        .trim()
        .toLowerCase()
        .min(1, 'Slug is required')
        .max(60)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single dashes'),
});

export const updateCategorySchema = createCategorySchema.partial();

/** Bulk category/product toggles from the admin tables. */
export const bulkDeactivateSchema = z.object({
    ids: z.array(z.string().min(1)).min(1, 'Select at least one item').max(500, 'Too many items at once'),
});