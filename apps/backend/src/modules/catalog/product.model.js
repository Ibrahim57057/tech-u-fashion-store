import mongoose from 'mongoose';

function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
}

const variantSchema = new mongoose.Schema(
    {
        size: { type: String, required: true },
        color: { type: String, required: true },
        sku: { type: String, required: true, unique: true },
        stock: { type: Number, required: true, min: 0, default: 0 },
        // Optional. Empty means "use the product's main images" — this is
        // what lets an existing product with no variant photos keep working
        // exactly as before, with nothing required to change on old data.
        images: { type: [String], default: [] },
    },
    { _id: true, toJSON: { virtuals: true } },
);
const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, unique: true, lowercase: true },
        brand: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        priceFrom: { type: Number, required: true, min: 0 },
        images: {
            type: [String],
            required: true,
            validate: {
                validator: (arr) => arr.length > 0,
                message: 'A product needs at least one image.',
            },
        },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
        variants: {
            type: [variantSchema],
            validate: {
                validator: (arr) => arr.length > 0,
                message: 'A product needs at least one variant.',
            },
        },
        isActive: { type: Boolean, default: true },
        rating: {
            average: { type: Number, default: 0, min: 0, max: 5 },
            count: { type: Number, default: 0, min: 0 },
        },
    },
    { timestamps: true, toJSON: { virtuals: true } },
);

// Indexes for the queries the app actually runs. Every one of these was a
// collection scan before: slug lookups on product pages, and the
// category + isActive pair behind the public catalogue, which is the single
// most requested endpoint in the app.
//
// Compound rather than single-field where two are always filtered together, so
// the index serves the query instead of only its first stage.
//
// slug is deliberately absent: `unique: true` on the field above already
// builds that index, and declaring both makes Mongoose warn about the
// duplicate (and drops the unique option).
productSchema.index({ category: 1, isActive: 1 }); // public catalogue and category listings
productSchema.index({ brand: 1 }); // ?brand= filter
productSchema.index({ isActive: 1, createdAt: -1 }); // "newest first" without a category
// Sorting a facet on price is done in Mongo as well as for the newest-first
// list, so the catalogue's two sort modes stay covered.
productSchema.index({ isActive: 1, priceFrom: 1 });

productSchema.pre('save', function () {
    if (!this.slug) {
        this.slug = slugify(this.name);
    }
});

const Product = mongoose.model('Product', productSchema);
export default Product;