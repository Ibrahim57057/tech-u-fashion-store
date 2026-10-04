import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import User from '../auth/user.model.js';
import Product from '../catalog/product.model.js';
import Category from '../catalog/category.model.js';
import Order from '../orders/order.model.js';
import { ORDER_STATUS, PAYMENT_METHOD } from '../../utils/constants.js';

let app;
let owner;
let stranger;
let cookie;

beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Product.deleteMany({}), Category.deleteMany({}), Order.deleteMany({})]);

    // Registered through the API rather than User.create, so the sign-in
    // cookie and the stored account are the same customer.
    await request(app).post('/api/v1/auth/register').send({
        name: 'Owner',
        email: 'owner@gmail.com',
        phone: '08011111111',
        password: 'password123',
    });
    await request(app).post('/api/v1/auth/register').send({
        name: 'Stranger',
        email: 'stranger@gmail.com',
        phone: '08022222222',
        password: 'password123',
    });

    owner = await User.findOne({ email: 'owner@gmail.com' });
    stranger = await User.findOne({ email: 'stranger@gmail.com' });

    const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'owner@gmail.com', password: 'password123' });
    cookie = login.headers['set-cookie'];
});

/** An order that a signed-in customer is meant to be able to pay. */
async function makeOrder(user, orderNumber = 'TU-TEST-0001') {
    return Order.create({
        orderNumber,
        user: user._id,
        contact: { fullName: 'Owner', phone: '08011111111', email: 'owner@gmail.com' },
        shipping: { address: '12 Test Street', zoneName: 'Lagos' },
        items: [
            {
                product: new mongoose.Types.ObjectId(),
                variantId: new mongoose.Types.ObjectId(),
                name: 'Court Classic',
                size: '42',
                color: 'White',
                price: 100000,
                qty: 1,
            },
        ],
        subtotal: 100000,
        deliveryFee: 50000,
        total: 150000,
        paymentMethod: PAYMENT_METHOD.ONLINE,
        status: ORDER_STATUS.PENDING_PAYMENT,
    });
}

/** A pre-fix order: written straight to the collection, bypassing the schema. */
async function makeOwnerlessOrder(orderNumber = 'TU-TEST-LEGACY') {
    const now = new Date();
    await Order.collection.insertOne({
        orderNumber,
        contact: { fullName: 'Someone', phone: '08099999999', email: 'someone@gmail.com' },
        shipping: { address: '9 Old Road', zoneName: 'Lagos' },
        items: [
            {
                product: new mongoose.Types.ObjectId(),
                variantId: new mongoose.Types.ObjectId(),
                name: 'Court Classic',
                size: '42',
                color: 'White',
                price: 100000,
                qty: 1,
            },
        ],
        subtotal: 100000,
        deliveryFee: 50000,
        total: 150000,
        paymentMethod: PAYMENT_METHOD.ONLINE,
        status: ORDER_STATUS.PENDING_PAYMENT,
        createdAt: now,
        updatedAt: now,
    });
}

describe('paying for an order', () => {
    // Before the account requirement, POST /orders let anyone through, so a
    // number of orders exist with no owner. The old ownership test read a
    // missing owner as "no restriction", which meant any signed-in customer
    // could start a payment against one of them.
    it('refuses an order that has no recorded owner', async () => {
        await makeOwnerlessOrder();

        const res = await request(app)
            .post('/api/v1/payments/initialize')
            .set('Cookie', cookie)
            .send({ orderNumber: 'TU-TEST-LEGACY' });

        expect(res.status).toBe(404);
    });

    it('refuses an order belonging to somebody else', async () => {
        await makeOrder(stranger, 'TU-TEST-OTHER');

        const res = await request(app)
            .post('/api/v1/payments/initialize')
            .set('Cookie', cookie)
            .send({ orderNumber: 'TU-TEST-OTHER' });

        expect(res.status).toBe(404);
    });

    it('refuses an order number that does not exist', async () => {
        const res = await request(app)
            .post('/api/v1/payments/initialize')
            .set('Cookie', cookie)
            .send({ orderNumber: 'TU-TEST-NOPE' });

        expect(res.status).toBe(404);
    });

    it('uses the same 404 for every refusal, so order numbers cannot be probed', async () => {
        await makeOwnerlessOrder('TU-TEST-LEGACY');
        await makeOrder(stranger, 'TU-TEST-OTHER');

        const bodies = await Promise.all(
            ['TU-TEST-LEGACY', 'TU-TEST-OTHER', 'TU-TEST-NOPE'].map((orderNumber) =>
                request(app)
                    .post('/api/v1/payments/initialize')
                    .set('Cookie', cookie)
                    .send({ orderNumber })
                    .then((r) => `${r.status} ${r.body.error.message}`),
            ),
        );

        expect(new Set(bodies).size).toBe(1);
    });

    it('lets the real owner past the ownership gate', async () => {
        await makeOrder(owner, 'TU-TEST-MINE');

        const res = await request(app)
            .post('/api/v1/payments/initialize')
            .set('Cookie', cookie)
            .send({ orderNumber: 'TU-TEST-MINE' });

        // Only asserting "not refused". With no Paystack key configured the
        // gateway call itself fails, which is fine — reaching it at all means
        // the ownership check let this customer through.
        expect(res.status).not.toBe(404);
    });

    it('still needs a session', async () => {
        await makeOrder(owner, 'TU-TEST-MINE');

        const res = await request(app)
            .post('/api/v1/payments/initialize')
            .send({ orderNumber: 'TU-TEST-MINE' });

        expect(res.status).toBe(401);
    });
});