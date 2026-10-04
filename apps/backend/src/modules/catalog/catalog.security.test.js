import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import Category from './category.model.js';
import Product from './product.model.js';
import Order from '../orders/order.model.js';
import User from '../auth/user.model.js';

let app;
let adminCookie;

beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Promise.all([
        Category.deleteMany({}),
        Product.deleteMany({}),
        Order.deleteMany({}),
        User.deleteMany({}),
    ]);

    await User.create({ name: 'Admin', email: 'admin@gmail.com', phone: '0801', password: 'password123', role: 'admin' });
    const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@gmail.com', password: 'password123' });
    adminCookie = login.headers['set-cookie'];
});

describe('Mongo operator keys never reach the database', () => {
    // Express 5's req.query is a getter that re-parses on every access, so the
    // original sanitizer mutated a throwaway object and did nothing at all.
    // `?$where=...` on a public endpoint is server-side JavaScript execution
    // against MongoDB, so this is the check that matters most.
    it('ignores $where on the public product list', async () => {
        const res = await request(app).get('/api/v1/products').query({ $where: 'sleep(10000)' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('ignores $where on categories', async () => {
        const res = await request(app).get('/api/v1/categories').query({ $where: 'this.isTrue' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('ignores dotted keys on the public product list', async () => {
        const res = await request(app).get('/api/v1/products').query({ 'variants.stock': { $gt: 0 } });

        expect(res.status).toBe(200);
    });

    it('strips operator keys from a JSON body', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: { $ne: null }, password: { $ne: null } });

        // The $ne keys are removed, leaving empty objects where a string was
        // expected, so validation rejects the request. What matters is that it
        // is refused — the classic bypass here would have matched every user.
        expect(res.status).not.toBe(200);
        expect([401, 422]).toContain(res.status);
        expect(res.body.data).toBeUndefined();
    });
});

describe('pagination is bounded', () => {
    // A public endpoint that will load the entire catalogue on request.
    it('caps limit at 100', async () => {
        await Category.create({ name: 'Shoes', slug: 'shoes' });

        const res = await request(app).get('/api/v1/products').query({ limit: 1_000_000 });

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(100);
        expect(res.body.meta.limit).toBe(100);
    });

    it('reports the limit it actually applied', async () => {
        const res = await request(app).get('/api/v1/products').query({ limit: 5 });

        expect(res.body.meta.limit).toBe(5);
    });

    it('falls back to the default for nonsense input', async () => {
        for (const limit of ['abc', '-5', '0']) {
            const res = await request(app).get('/api/v1/products').query({ limit });
            expect(res.status).toBe(200);
            expect(res.body.meta.limit).toBe(20);
        }
    });

    it('caps the skip so a huge page number cannot walk the collection', async () => {
        const res = await request(app).get('/api/v1/products').query({ page: 999_999_999, limit: 100 });

        expect(res.status).toBe(200);
        expect(res.body.meta.page).toBe(999_999_999);
    });
});

describe('admin sorting is a field, not an operator', () => {
    it('drops operator characters from the sort parameter', async () => {
        const res = await request(app)
            .get('/api/v1/orders/admin')
            .set('Cookie', adminCookie)
            .query({ sort: '$natural,meta.password' });

        expect(res.status).toBe(200);
    });
});

describe('categories require an admin', () => {
    // These two routes were mounted with no middleware at all — the only
    // mutating endpoints in the API an anonymous caller could reach.
    it('refuses an anonymous create', async () => {
        const before = await Category.countDocuments({});

        const res = await request(app).post('/api/v1/categories').send({ name: 'Injected', slug: 'injected' });

        expect(res.status).toBe(401);
        expect(await Category.countDocuments({})).toBe(before);
    });

    it('refuses an anonymous delete', async () => {
        const category = await Category.create({ name: 'Keep', slug: 'keep' });

        const res = await request(app).delete(`/api/v1/categories/${category._id}`);

        expect(res.status).toBe(401);
        expect(await Category.countDocuments({})).toBe(1);
    });

    it('refuses a signed-in non-admin', async () => {
        await User.create({ name: 'Shopper', email: 'shopper@gmail.com', phone: '0802', password: 'password123' });
        const login = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'shopper@gmail.com', password: 'password123' });

        const res = await request(app)
            .post('/api/v1/categories')
            .set('Cookie', login.headers['set-cookie'])
            .send({ name: 'Injected', slug: 'injected' });

        expect(res.status).toBe(403);
    });

    it('does not let a create smuggle extra fields through', async () => {
        const res = await request(app)
            .post('/api/v1/categories')
            .set('Cookie', adminCookie)
            .send({ name: 'Real', slug: 'real', createdAt: '1999-01-01T00:00:00.000Z' });

        expect(res.status).toBe(201);
        expect(new Date(res.body.data.createdAt).getFullYear()).toBeGreaterThan(2000);
    });

    it('validates the slug', async () => {
        const res = await request(app)
            .post('/api/v1/categories')
            .set('Cookie', adminCookie)
            .send({ name: 'Bad Slug', slug: 'Not A Slug!' });

        expect(res.status).toBe(422);
    });

    it('lets an admin create and update', async () => {
        const created = await request(app)
            .post('/api/v1/categories')
            .set('Cookie', adminCookie)
            .send({ name: 'Sneakers', slug: 'sneakers' });
        expect(created.status).toBe(201);

        const updated = await request(app)
            .patch(`/api/v1/categories/${created.body.data._id}`)
            .set('Cookie', adminCookie)
            .send({ name: 'Sneakers & Trainers' });
        expect(updated.status).toBe(200);
        expect(updated.body.data.name).toBe('Sneakers & Trainers');
    });

    it('refuses to delete a category products still use', async () => {
        const category = await Category.create({ name: 'Shoes', slug: 'shoes' });
        await Product.create({
            name: 'Test Runner',
            brand: 'TechU',
            description: 'Used only by this test.',
            priceFrom: 500000,
            images: ['https://example.com/a.jpg'],
            category: category._id,
            variants: [{ size: '42', color: 'Black', sku: 'DEL-1', stock: 10 }],
        });

        const res = await request(app)
            .delete(`/api/v1/categories/${category._id}`)
            .set('Cookie', adminCookie);

        expect(res.status).toBe(409);
        expect(await Category.countDocuments({})).toBe(1);
    });

    it('deletes an unused category', async () => {
        const category = await Category.create({ name: 'Spare', slug: 'spare' });

        const res = await request(app)
            .delete(`/api/v1/categories/${category._id}`)
            .set('Cookie', adminCookie);

        expect(res.status).toBe(204);
        expect(await Category.countDocuments({})).toBe(0);
    });
});

describe('malformed ids answer 400, not 500', () => {
    it('rejects a non-ObjectId category id', async () => {
        const res = await request(app)
            .patch('/api/v1/categories/not-an-id')
            .set('Cookie', adminCookie)
            .send({ name: 'Nope' });

        // A CastError is a client mistake, not a crash. Asserted here so the
        // errorHandler CastError branch stays covered.
        expect(res.status).toBe(400);
    });
});