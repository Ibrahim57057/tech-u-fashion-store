import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import Product from '../catalog/product.model.js';
import Category from '../catalog/category.model.js';
import DeliveryZone from './deliveryZone.model.js';
import Order from './order.model.js';

// The throwaway database is started once by src/test/globalSetup.js and
// shared across the suite, so no file starts or stops its own mongod.
beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    // Each test builds its own product, and Product.slug is unique and
    // derived from the name, so leftovers from a previous test would make the
    // next create() fail with a duplicate key error.
    await Promise.all([
        Order.deleteMany({}),
        Product.deleteMany({}),
        Category.deleteMany({}),
        DeliveryZone.deleteMany({}),
    ]);
});

async function makeProductWithStock(stock) {
    const category = await Category.create({ name: 'Test', slug: `test-${Date.now()}` });
    const product = await Product.create({
        name: 'Test Sneaker',
        brand: 'TechU',
        description: 'A product used only in this test.',
        priceFrom: 1000000,
        images: ['https://example.com/a.jpg'],
        category: category._id,
        variants: [{ size: '42', color: 'Black', sku: `T-${Date.now()}`, stock }],
    });
    return { product, variant: product.variants[0] };
}

describe('stock protection on order creation', () => {
    it('decrements stock by exactly the quantity ordered', async () => {
        const { product, variant } = await makeProductWithStock(5);

        // This mirrors the atomic update inside createOrder directly,
        // rather than spinning up the whole Express app, so the test
        // stays focused on the one rule that matters most: the update
        // only succeeds if enough stock exists, and it removes exactly
        // the right amount.
        const updated = await Product.findOneAndUpdate(
            { _id: product._id, variants: { $elemMatch: { _id: variant._id, stock: { $gte: 2 } } } },
            { $inc: { 'variants.$.stock': -2 } },
            { returnDocument: 'after' },
        );

        expect(updated).not.toBeNull();
        expect(updated.variants.id(variant._id).stock).toBe(3);
    });

    it('refuses to oversell: two requests for the last unit, only one succeeds', async () => {
        const { product, variant } = await makeProductWithStock(1);

        // Simulates two customers racing for the same last pair, the exact
        // scenario our exit criteria named back in Round 3.
        const [first, second] = await Promise.all([
            Product.findOneAndUpdate(
                { _id: product._id, variants: { $elemMatch: { _id: variant._id, stock: { $gte: 1 } } } },
                { $inc: { 'variants.$.stock': -1 } },
                { returnDocument: 'after' },
            ),
            Product.findOneAndUpdate(
                { _id: product._id, variants: { $elemMatch: { _id: variant._id, stock: { $gte: 1 } } } },
                { $inc: { 'variants.$.stock': -1 } },
                { returnDocument: 'after' },
            ),
        ]);

        const successCount = [first, second].filter((r) => r !== null).length;
        expect(successCount).toBe(1);

        const finalProduct = await Product.findById(product._id);
        expect(finalProduct.variants.id(variant._id).stock).toBe(0);
    });

    it('rejects an order for more than what is in stock', async () => {
        const { product, variant } = await makeProductWithStock(2);

        const updated = await Product.findOneAndUpdate(
            { _id: product._id, variants: { $elemMatch: { _id: variant._id, stock: { $gte: 5 } } } },
            { $inc: { 'variants.$.stock': -5 } },
            { returnDocument: 'after' },
        );

        expect(updated).toBeNull();

        const unchanged = await Product.findById(product._id);
        expect(unchanged.variants.id(variant._id).stock).toBe(2);
    });
});