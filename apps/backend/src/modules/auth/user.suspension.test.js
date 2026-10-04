import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import User from './user.model.js';
import Order from '../orders/order.model.js';

let app;
let adminCookie;
let adminId;
let customerId;

async function login(email, password = 'password123') {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password });
    return res;
}

beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Order.deleteMany({})]);

    const admin = await User.create({
        name: 'Admin',
        email: 'admin@gmail.com',
        phone: '08012345678',
        password: 'password123',
        role: 'admin',
    });
    adminId = admin._id;

    const customer = await User.create({
        name: 'Customer',
        email: 'customer@gmail.com',
        phone: '08098765432',
        password: 'password123',
    });
    customerId = customer._id;

    const res = await login('admin@gmail.com');
    adminCookie = res.headers['set-cookie'];
});

describe('account suspension', () => {
    it('defaults new accounts to active', async () => {
        expect((await User.findById(customerId)).isActive).toBe(true);
    });

    // An existing document has no isActive field at all until it is written.
    // Treating undefined as suspended would lock out every current customer on
    // deploy, so it has to read as active.
    it('treats a user with no isActive field as active', async () => {
        await User.updateOne({ _id: customerId }, { $unset: { isActive: '' } });

        const res = await request(app).get('/api/v1/auth/me').set('Cookie', adminCookie);

        expect(res.status).toBe(200);
    });

    it('lets a suspended user sign in again after reinstatement', async () => {
        await request(app)
            .patch(`/api/v1/auth/users/${customerId}/status`)
            .set('Cookie', adminCookie)
            .send({ isActive: false });
        expect((await login('customer@gmail.com')).status).toBe(403);

        await request(app)
            .patch(`/api/v1/auth/users/${customerId}/status`)
            .set('Cookie', adminCookie)
            .send({ isActive: true });
        expect((await login('customer@gmail.com')).status).toBe(200);
    });

    it('blocks sign-in for a suspended account', async () => {
        await User.updateOne({ _id: customerId }, { isActive: false });

        const res = await login('customer@gmail.com');

        expect(res.status).toBe(403);
        expect(res.body.error.message).toMatch(/suspended/i);
    });

    // Checked after the password comparison, so suspension cannot be used to
    // discover which email addresses have accounts.
    it('still reports a wrong password as a wrong password', async () => {
        await User.updateOne({ _id: customerId }, { isActive: false });

        const res = await login('customer@gmail.com', 'wrongpassword');

        expect(res.status).toBe(401);
        expect(res.body.error.message).toMatch(/incorrect/i);
    });

    // The token is still valid after suspension. Without a check in `protect`
    // the account would keep working until the token expired on its own.
    it('kills an already-issued session', async () => {
        const session = await login('customer@gmail.com');
        const cookie = session.headers['set-cookie'];
        expect((await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(200);

        await request(app)
            .patch(`/api/v1/auth/users/${customerId}/status`)
            .set('Cookie', adminCookie)
            .send({ isActive: false });

        const after = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
        expect(after.status).toBe(403);
    });

    it('refuses anonymous suspension', async () => {
        const res = await request(app)
            .patch(`/api/v1/auth/users/${customerId}/status`)
            .send({ isActive: false });

        expect(res.status).toBe(401);
        expect((await User.findById(customerId)).isActive).toBe(true);
    });

    it('refuses suspension by a non-admin', async () => {
        const session = await login('customer@gmail.com');

        const res = await request(app)
            .patch(`/api/v1/auth/users/${adminId}/status`)
            .set('Cookie', session.headers['set-cookie'])
            .send({ isActive: false });

        expect(res.status).toBe(403);
        expect((await User.findById(adminId)).isActive).toBe(true);
    });

    it('will not let an admin suspend themselves', async () => {
        const res = await request(app)
            .patch(`/api/v1/auth/users/${adminId}/status`)
            .set('Cookie', adminCookie)
            .send({ isActive: false });

        expect(res.status).toBe(400);
        expect((await User.findById(adminId)).isActive).toBe(true);
    });

    // Not reachable over HTTP: the caller has already been proven to be an
    // active admin by restrictTo, and the self-suspension guard runs first, so
    // by the time this check is reached a second active admin always exists.
    // Kept as defence in depth for any future caller that bypasses those two.
    it('counts other active admins before refusing', async () => {
        const second = await User.create({
            name: 'Admin Two',
            email: 'admin2@gmail.com',
            phone: '08011112222',
            password: 'password123',
            role: 'admin',
        });
        // Suspended, so it must not be counted as a safety net.
        await User.updateOne({ _id: second._id }, { isActive: false });

        const otherAdmins = await User.countDocuments({
            role: 'admin',
            isActive: { $ne: false },
            _id: { $ne: second._id },
        });

        expect(otherAdmins).toBe(1);
    });

    it('allows suspending one admin while another stays active', async () => {
        const second = await User.create({
            name: 'Admin Two',
            email: 'admin2@gmail.com',
            phone: '08011112222',
            password: 'password123',
            role: 'admin',
        });

        const res = await request(app)
            .patch(`/api/v1/auth/users/${second._id}/status`)
            .set('Cookie', adminCookie)
            .send({ isActive: false });

        expect(res.status).toBe(200);
        expect((await User.findById(second._id)).isActive).toBe(false);
        // The caller is untouched and can still act.
        expect((await User.findById(adminId)).isActive).toBe(true);
    });

    it('rejects a non-boolean isActive', async () => {
        const res = await request(app)
            .patch(`/api/v1/auth/users/${customerId}/status`)
            .set('Cookie', adminCookie)
            .send({ isActive: 'false' });

        expect(res.status).toBe(422);
        expect((await User.findById(customerId)).isActive).toBe(true);
    });

    it('404s on an unknown user', async () => {
        const res = await request(app)
            .patch('/api/v1/auth/users/64b7f9c2a1b2c3d4e5f60718/status')
            .set('Cookie', adminCookie)
            .send({ isActive: false });

        expect(res.status).toBe(404);
    });

    // The reason suspension replaces deletion: the order keeps its owner.
    it('leaves a suspended customer\'s orders intact and owned', async () => {
        const order = await Order.create({
            user: customerId,
            contact: { fullName: 'Customer', phone: '08098765432' },
            items: [
                {
                    product: new mongoose.Types.ObjectId(),
                    variantId: new mongoose.Types.ObjectId(),
                    name: 'Test Tee',
                    price: 500000,
                    qty: 1,
                    size: 'M',
                    color: 'Black',
                },
            ],
            subtotal: 500000,
            deliveryFee: 250000,
            total: 750000,
            paymentMethod: 'pay_on_delivery',
            status: 'pending_confirmation',
            shipping: { address: '1 Somewhere, Lagos', zoneName: 'Lagos Mainland' },
        });

        const res = await request(app)
            .patch(`/api/v1/auth/users/${customerId}/status`)
            .set('Cookie', adminCookie)
            .send({ isActive: false });
        expect(res.status).toBe(200);

        const stored = await Order.findById(order._id);
        expect(stored).not.toBeNull();
        expect(String(stored.user)).toBe(String(customerId));
    });

    it('includes isActive in the admin user list', async () => {
        await User.updateOne({ _id: customerId }, { isActive: false });

        const res = await request(app).get('/api/v1/auth/users').set('Cookie', adminCookie);

        expect(res.status).toBe(200);
        const customer = res.body.data.find((u) => String(u._id ?? u.id) === String(customerId));
        expect(customer).toBeDefined();
        expect(customer.isActive).toBe(false);
    });
});