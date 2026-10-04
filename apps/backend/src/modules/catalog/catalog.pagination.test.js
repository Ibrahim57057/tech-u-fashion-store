import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import Product from './product.model.js';
import Category from './category.model.js';
import { ApiFeatures } from '../../utils/apiFeatures.js';

beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Promise.all([Product.deleteMany({}), Category.deleteMany({})]);
});

/**
 * Reproduces the real seed data: createdAt is NOT unique - a handful of
 * moments, with many products landing in each one. createdAt on its own
 * therefore cannot order the catalogue, which is what used to make MongoDB
 * repeat one product on two pages and drop another.
 */
async function seedTiedProducts(count) {
    const category = await Category.create({ name: 'Shoes', slug: 'shoes' });
    for (let i = 0; i < count; i += 1) {
        await Product.create({
            name: `Tied Product ${i}`,
            brand: 'TechU',
            description: 'Used only by this test.',
            priceFrom: 1000000 + (i % 7), // price ties too
            images: ['https://example.com/a.jpg'],
            category: category._id,
            variants: [{ size: 'M', color: 'Black', sku: `TIE-${i}`, stock: 3 }],
        });
    }
    // Four distinct moments, ~12 products in each - timestamps:false so
    // Mongoose does not stamp its own value over ours.
    const moments = [0, 1, 2, 3].map((n) => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, n * 5)));
    const ids = (await Product.find({}, '_id').sort({ _id: 1 })).map((d) => d._id);
    await Promise.all(
        ids.map((id, i) =>
            Product.updateOne(
                { _id: id },
                { $set: { createdAt: moments[i % moments.length] } },
                { timestamps: false },
            ),
        ),
    );
    expect(await Product.countDocuments({})).toBe(count);
}

/** Walks every page the way the admin table does, collecting ids. */
async function walkPages({ limit, sort }) {
    const total = await Product.countDocuments({ isActive: true });
    const ids = [];
    for (let page = 1; page * limit <= total + limit; page += 1) {
        const query = new ApiFeatures(Product.find({ isActive: true }), { limit, page, ...(sort ? { sort } : {}) })
            .sort()
            .paginate().query;
        const rows = await query;
        if (!rows.length) break;
        ids.push(...rows.map((r) => r._id.toString()));
        if (rows.length < limit) break;
    }
    return { ids, total };
}

describe('paginating a catalogue with tied sort values', () => {
    const COUNT = 47;

    it('returns every product exactly once with the default sort', async () => {
        await seedTiedProducts(COUNT);
        const { ids, total } = await walkPages({ limit: 20 });

        expect(ids).toHaveLength(total);
        expect(new Set(ids).size).toBe(total);
    });

    it('returns every product exactly once when sorting by price', async () => {
        await seedTiedProducts(COUNT);
        const { ids, total } = await walkPages({ limit: 20, sort: 'priceFrom' });

        expect(ids).toHaveLength(total);
        expect(new Set(ids).size).toBe(total);
    });

    it('still returns everything when the requested sort field does not exist', async () => {
        await seedTiedProducts(COUNT);
        // A typo in ?sort= must not silently collapse the catalogue.
        const { ids, total } = await walkPages({ limit: 20, sort: 'not-a-real-field' });

        expect(ids).toHaveLength(total);
        expect(new Set(ids).size).toBe(total);
    });

    it('keeps a caller-supplied _id tiebreaker from being added twice', async () => {
        await seedTiedProducts(COUNT);
        const { ids, total } = await walkPages({ limit: 20, sort: '-createdAt,_id' });

        expect(ids).toHaveLength(total);
        expect(new Set(ids).size).toBe(total);
    });
});