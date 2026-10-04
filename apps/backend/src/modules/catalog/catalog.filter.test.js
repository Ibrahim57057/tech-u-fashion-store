import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import Product from './product.model.js';
import Category from './category.model.js';
import {
    buildProductFilter,
    toFilterList,
    asCaseInsensitiveSet,
    sortSizes,
} from './catalog.controller.js';

beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Promise.all([Product.deleteMany({}), Category.deleteMany({})]);
});

let seq = 0;

async function seedProduct({ name, brand = 'TechU', variants, categoryId }) {
    return Product.create({
        name,
        brand,
        description: 'A product used only in this test.',
        priceFrom: 1000000,
        images: ['https://example.com/a.jpg'],
        category: categoryId,
        variants: variants.map((v) => ({
            size: v.size,
            color: v.color,
            sku: `T-${(seq += 1)}`,
            stock: v.stock ?? 5,
        })),
    });
}

/** Runs the built filter against the database, the way the route does. */
const idsFor = (query) =>
    Product.find(buildProductFilter({ baseFilter: { isActive: true }, ...query }))
        .select('_id')
        .then((rows) => rows.map((r) => String(r._id)));

describe('toFilterList', () => {
    it('treats an absent parameter as no filter at all', () => {
        // The original bug: String(undefined) is the text "undefined", so
        // every unfiltered request matched a colour literally named
        // "undefined" and came back empty.
        expect(toFilterList(undefined)).toEqual([]);
        expect(toFilterList(null)).toEqual([]);
    });

    it('accepts comma separated values', () => {
        expect(toFilterList('41,42')).toEqual(['41', '42']);
    });

    it('accepts a repeated parameter, which Express hands over as an array', () => {
        expect(toFilterList(['41', '42'])).toEqual(['41', '42']);
    });

    it('accepts both shapes mixed together and drops blanks', () => {
        expect(toFilterList(['41,42', ' 43 ', '', null, '44'])).toEqual(['41', '42', '43', '44']);
    });
});

describe('asCaseInsensitiveSet', () => {
    it('matches regardless of case', () => {
        const set = asCaseInsensitiveSet(['blue']);
        expect(set.some((re) => re.test('Blue'))).toBe(true);
        expect(set.some((re) => re.test('BLUE'))).toBe(true);
    });

    it('escapes regular expression metacharacters', () => {
        const set = asCaseInsensitiveSet(['b.*']);
        // "b.*" must match that literal text and nothing else.
        expect(set.some((re) => re.test('b.*'))).toBe(true);
        expect(set.some((re) => re.test('blue'))).toBe(false);
    });
});

describe('buildProductFilter', () => {
    it('adds no conditions when nothing is selected', () => {
        const filter = buildProductFilter({ baseFilter: { isActive: true } });
        expect(filter).toEqual({ isActive: true });
        expect(filter.variants).toBeUndefined();
        expect(filter.brand).toBeUndefined();
    });

    it('uses $elemMatch so size and colour must be the same variant', () => {
        const filter = buildProductFilter({ size: '41', color: 'Blue' });
        expect(filter.variants.$elemMatch).toBeDefined();
    });
});

describe('size and colour filtering against the database', () => {
    it('returns only products where one variant is both Blue and size 41', async () => {
        const category = await Category.create({ name: 'Sneakers', slug: 'sneakers' });
        const match = await seedProduct({
            name: 'Blue 41 sneaker',
            variants: [{ size: '41', color: 'Blue' }],
            categoryId: category._id,
        });
        await seedProduct({
            // Two separate conditions would happily match this one: Blue
            // exists, and 41 exists, just not on the same variant.
            name: 'Blue 39 and White 41 sneaker',
            variants: [
                { size: '39', color: 'Blue' },
                { size: '41', color: 'White' },
            ],
            categoryId: category._id,
        });

        expect(await idsFor({ size: '41', color: 'Blue' })).toEqual([String(match._id)]);
    });

    it('matches a lowercase colour against the stored capitalisation', async () => {
        const category = await Category.create({ name: 'Sneakers', slug: 'sneakers' });
        const match = await seedProduct({
            name: 'Blue sneaker',
            variants: [{ size: '41', color: 'Blue' }],
            categoryId: category._id,
        });

        expect(await idsFor({ size: '41', color: 'blue' })).toEqual([String(match._id)]);
    });

    it('treats a selected colour as OR across the list', async () => {
        const category = await Category.create({ name: 'Sneakers', slug: 'sneakers' });
        const blue = await seedProduct({
            name: 'Blue sneaker',
            variants: [{ size: '41', color: 'Blue' }],
            categoryId: category._id,
        });
        const white = await seedProduct({
            name: 'White sneaker',
            variants: [{ size: '41', color: 'White' }],
            categoryId: category._id,
        });

        const found = await idsFor({ size: '41', color: 'Blue,White' });
        expect(found.sort()).toEqual([String(blue._id), String(white._id)].sort());
    });

    it('treats a selected size as OR across the list', async () => {
        const category = await Category.create({ name: 'Sneakers', slug: 'sneakers' });
        const fortyOne = await seedProduct({
            name: 'Size 41 sneaker',
            variants: [{ size: '41', color: 'Blue' }],
            categoryId: category._id,
        });
        const fortyTwo = await seedProduct({
            name: 'Size 42 sneaker',
            variants: [{ size: '42', color: 'Blue' }],
            categoryId: category._id,
        });

        const found = await idsFor({ size: '41,42', color: 'Blue' });
        expect(found.sort()).toEqual([String(fortyOne._id), String(fortyTwo._id)].sort());
    });

    it('hides a variant that is out of stock', async () => {
        const category = await Category.create({ name: 'Sneakers', slug: 'sneakers' });
        await seedProduct({
            name: 'Sold out Blue 41',
            variants: [{ size: '41', color: 'Blue', stock: 0 }],
            categoryId: category._id,
        });

        expect(await idsFor({ size: '41', color: 'Blue' })).toEqual([]);
    });

    it('still matches the colour when another variant of it is sold out', async () => {
        const category = await Category.create({ name: 'Sneakers', slug: 'sneakers' });
        const match = await seedProduct({
            name: 'Partly sold out',
            variants: [
                { size: '41', color: 'Blue', stock: 0 },
                { size: '42', color: 'Blue', stock: 3 },
            ],
            categoryId: category._id,
        });

        expect(await idsFor({ color: 'Blue' })).toEqual([String(match._id)]);
    });

    it('matches a brand regardless of case', async () => {
        const category = await Category.create({ name: 'Sneakers', slug: 'sneakers' });
        const match = await seedProduct({
            name: 'Denim jacket',
            brand: 'TechU Denim',
            variants: [{ size: 'M', color: 'Blue' }],
            categoryId: category._id,
        });

        expect(await idsFor({ brand: 'techu denim' })).toEqual([String(match._id)]);
    });

    it('combines brand with size and colour', async () => {
        const category = await Category.create({ name: 'Sneakers', slug: 'sneakers' });
        const match = await seedProduct({
            name: 'Denim jacket',
            brand: 'TechU Denim',
            variants: [{ size: 'M', color: 'Blue' }],
            categoryId: category._id,
        });
        await seedProduct({
            name: 'Denim jeans',
            brand: 'TechU Denim',
            variants: [{ size: 'L', color: 'Red' }],
            categoryId: category._id,
        });

        expect(await idsFor({ brand: 'TechU Denim', size: 'M', color: 'Blue' })).toEqual([
            String(match._id),
        ]);
    });

    it('ignores inactive products', async () => {
        const category = await Category.create({ name: 'Sneakers', slug: 'sneakers' });
        const product = await seedProduct({
            name: 'Retired sneaker',
            variants: [{ size: '41', color: 'Blue' }],
            categoryId: category._id,
        });
        await Product.updateOne({ _id: product._id }, { $set: { isActive: false } });

        expect(await idsFor({ size: '41', color: 'Blue' })).toEqual([]);
    });
});

describe('sortSizes', () => {
    it('orders numeric shoe sizes numerically and letter sizes first', () => {
        expect(['44', '9', '41'].sort(sortSizes)).toEqual(['9', '41', '44']);
        expect(['XL', '39', 'S', 'L', '41'].sort(sortSizes)).toEqual(['L', 'S', 'XL', '39', '41']);
    });
});