import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import User from '../auth/user.model.js';
import Product from '../catalog/product.model.js';
import Category from '../catalog/category.model.js';
import DeliveryZone from './deliveryZone.model.js';
import Order from './order.model.js';
import { PAYMENT_METHOD } from '../../utils/constants.js';

let app;
let cookie;
let product;
let variantId;
let zone;

beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
    // A factory, so this file gets its own rate limiter rather than sharing
    // (and exhausting) the live app's 10-per-15-minutes budget.
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Promise.all([
        User.deleteMany({}),
        Product.deleteMany({}),
        Category.deleteMany({}),
        DeliveryZone.deleteMany({}),
        Order.deleteMany({}),
    ]);

    const category = await Category.create({ name: 'Shoes', slug: 'shoes' });
    const created = await Product.create({
        name: 'Test Runner',
        brand: 'TechU',
        description: 'Used only by this test.',
        priceFrom: 500000,
        images: ['https://example.com/a.jpg'],
        category: category._id,
        variants: [{ size: '42', color: 'Black', sku: 'AUTH-1', stock: 10 }],
    });
    product = created;
    variantId = created.variants[0]._id;

    zone = await DeliveryZone.create({
        name: 'Lagos',
        state: 'Lagos',
        fee: 100000,
        etaDays: 2,
        codAllowed: true,
        isActive: true,
    });

    const reg = await request(app).post('/api/v1/auth/register').send({
        name: 'Test Customer',
        email: 'tester@gmail.com',
        phone: '08012345678',
        password: 'password123',
    });
    cookie = reg.headers['set-cookie'];
});

const orderPayload = () => ({
    contact: { fullName: 'Test Customer', phone: '08012345678', email: 'tester@gmail.com' },
    shipping: { address: '12 Test Street, Lagos', zoneId: zone._id.toString() },
    items: [{ productId: product._id.toString(), variantId: variantId.toString(), qty: 1 }],
    paymentMethod: PAYMENT_METHOD.PAY_ON_DELIVERY,
});

describe('buying requires an account', () => {
    // Regression guard. POST /orders used optionalAuth, so anyone could place
    // an order while signed out. The order was stored with user: undefined,
    // which meant the customer could never see it again under "my orders",
    // could not return it, and no payment could be reconciled against it.
    it('refuses to create an order when signed out', async () => {
        const res = await request(app).post('/api/v1/orders').send(orderPayload());

        expect(res.status).toBe(401);
        expect(res.body.error.message).toMatch(/log in/i);
    });

    it('writes no order at all when signed out', async () => {
        const res = await request(app).post('/api/v1/orders').send(orderPayload());

        // The status is asserted on purpose. Without it this test would also
        // pass with the gate wide open, because on a standalone mongod the
        // controller dies on the transaction before it can insert anything -
        // the right outcome for the wrong reason.
        expect(res.status).toBe(401);
        expect(await Order.countDocuments({})).toBe(0);
    });

    it('does not touch stock when signed out', async () => {
        const res = await request(app).post('/api/v1/orders').send(orderPayload());

        expect(res.status).toBe(401);
        const after = await Product.findById(product._id);
        expect(after.variants.id(variantId).stock).toBe(10);
    });

    it('lets a signed-in customer past the auth gate', async () => {
        // Deliberately only asserting "not 401". createOrder runs inside a
        // transaction, and the test database is a standalone mongod, which
        // refuses transactions - so the request cannot be carried to a 201
        // here. Reaching the controller at all is the point: the gate is what
        // was broken, and production (Atlas) is a real replica set.
        const res = await request(app)
            .post('/api/v1/orders')
            .set('Cookie', cookie)
            .send(orderPayload());

        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
    });

    it('refuses to initialize a payment when signed out', async () => {
        const res = await request(app)
            .post('/api/v1/payments/initialize')
            .send({ orderId: new mongoose.Types.ObjectId().toString() });

        expect(res.status).toBe(401);
    });

    it('requires an account to read ones own orders', async () => {
        const res = await request(app).get('/api/v1/orders');

        expect(res.status).toBe(401);
    });
});

describe('browsing stays open to anyone', () => {
    // The point of the fix is that only buying is gated. A customer must be
    // able to look through the catalogue, read a product page and fill a cart
    // before deciding whether to make an account.
    it('serves the product catalogue without a session', async () => {
        const res = await request(app).get('/api/v1/products');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('serves a single product without a session', async () => {
        const res = await request(app).get(`/api/v1/products/${product.slug}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('serves the category list without a session', async () => {
        const res = await request(app).get('/api/v1/categories');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});