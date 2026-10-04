import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import DeliveryZone from './deliveryZone.model.js';
import Order from './order.model.js';
import User from '../auth/user.model.js';
import { ORDER_STATUS, PAYMENT_METHOD } from '../../utils/constants.js';

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
    await Promise.all([DeliveryZone.deleteMany({}), Order.deleteMany({}), User.deleteMany({})]);
    await User.create({ name: 'Admin', email: 'admin@gmail.com', phone: '0801', password: 'password123', role: 'admin' });
    const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@gmail.com', password: 'password123' });
    adminCookie = login.headers['set-cookie'];
});

const validZone = { name: 'Lagos Mainland', fee: 250000, etaDays: '1-2', codAllowed: true };

describe('delivery zones', () => {
    // Checkout reads this list before login, so it must stay open.
    it('is readable anonymously', async () => {
        await DeliveryZone.create(validZone);

        const res = await request(app).get('/api/v1/delivery-zones');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it('hides inactive zones from the public list', async () => {
        await DeliveryZone.create({ ...validZone, isActive: false });

        const res = await request(app).get('/api/v1/delivery-zones');

        expect(res.body.data).toHaveLength(0);
    });

    it('creates a zone for an admin', async () => {
        const res = await request(app)
            .post('/api/v1/delivery-zones')
            .set('Cookie', adminCookie)
            .send(validZone);

        expect(res.status).toBe(201);
        expect(res.body.data.etaDays).toBe('1-2');
    });

    it('refuses an anonymous create', async () => {
        const res = await request(app).post('/api/v1/delivery-zones').send(validZone);

        expect(res.status).toBe(401);
    });

    // A negative fee feeds the server-calculated order total, so it is a
    // price-manipulation vector, not a cosmetic mistake.
    it('refuses a negative fee', async () => {
        const res = await request(app)
            .post('/api/v1/delivery-zones')
            .set('Cookie', adminCookie)
            .send({ ...validZone, fee: -500000 });

        expect(res.status).toBe(422);
        expect(await DeliveryZone.countDocuments({})).toBe(0);
    });

    it('refuses a non-numeric fee', async () => {
        const res = await request(app)
            .post('/api/v1/delivery-zones')
            .set('Cookie', adminCookie)
            .send({ ...validZone, fee: 'free' });

        expect(res.status).toBe(422);
    });

    it('requires a delivery estimate', async () => {
        const res = await request(app)
            .post('/api/v1/delivery-zones')
            .set('Cookie', adminCookie)
            .send({ name: 'Abuja', fee: 450000 });

        expect(res.status).toBe(422);
    });

    // Timestamps are not client-writable.
    it('does not let a create backdate itself', async () => {
        const res = await request(app)
            .post('/api/v1/delivery-zones')
            .set('Cookie', adminCookie)
            .send({ ...validZone, createdAt: '1999-01-01T00:00:00.000Z' });

        expect(res.status).toBe(201);
        expect(new Date(res.body.data.createdAt).getFullYear()).toBeGreaterThan(2000);
    });

    it('updates a zone', async () => {
        const zone = await DeliveryZone.create(validZone);

        const res = await request(app)
            .patch(`/api/v1/delivery-zones/${zone._id}`)
            .set('Cookie', adminCookie)
            .send({ fee: 300000 });

        expect(res.status).toBe(200);
        expect(res.body.data.fee).toBe(300000);
        expect(res.body.data.name).toBe('Lagos Mainland');
    });

    it('validates an update too', async () => {
        const zone = await DeliveryZone.create(validZone);

        const res = await request(app)
            .patch(`/api/v1/delivery-zones/${zone._id}`)
            .set('Cookie', adminCookie)
            .send({ fee: -1 });

        expect(res.status).toBe(422);
    });

    describe('delete', () => {
        it('removes a zone for an admin', async () => {
            const zone = await DeliveryZone.create(validZone);

            const res = await request(app)
                .delete(`/api/v1/delivery-zones/${zone._id}`)
                .set('Cookie', adminCookie);

            expect(res.status).toBe(204);
            expect(await DeliveryZone.countDocuments({})).toBe(0);
        });

        it('refuses an anonymous delete', async () => {
            const zone = await DeliveryZone.create(validZone);

            const res = await request(app).delete(`/api/v1/delivery-zones/${zone._id}`);

            expect(res.status).toBe(401);
            // The refusal has to actually leave the zone alone.
            expect(await DeliveryZone.countDocuments({})).toBe(1);
        });

        it('refuses a non-admin delete', async () => {
            const zone = await DeliveryZone.create(validZone);
            await User.create({
                name: 'Shopper',
                email: 'shopper@gmail.com',
                phone: '0802',
                password: 'password123',
            });
            const login = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'shopper@gmail.com', password: 'password123' });

            const res = await request(app)
                .delete(`/api/v1/delivery-zones/${zone._id}`)
                .set('Cookie', login.headers['set-cookie']);

            expect(res.status).toBe(403);
            expect(await DeliveryZone.countDocuments({})).toBe(1);
        });

        it('404s on an already-deleted zone rather than erroring', async () => {
            const zone = await DeliveryZone.create(validZone);
            await DeliveryZone.deleteOne({ _id: zone._id });

            const res = await request(app)
                .delete(`/api/v1/delivery-zones/${zone._id}`)
                .set('Cookie', adminCookie);

            expect(res.status).toBe(404);
        });

        it('404s on a malformed id instead of throwing', async () => {
            const res = await request(app)
                .delete('/api/v1/delivery-zones/not-an-id')
                .set('Cookie', adminCookie);

            expect(res.status).toBe(400);
        });

        // Orders copy the zone name into shipping.zoneName as a plain string
        // snapshot, so a deleted zone cannot blank out an old order's display.
        // This is the reason a hard delete is allowed here when it is forbidden
        // for products and orders, so it is worth pinning.
        it('leaves an existing order readable after its zone is deleted', async () => {
            const zone = await DeliveryZone.create(validZone);
            const admin = await User.findOne({ email: 'admin@gmail.com' });

            const order = await Order.create({
                user: admin._id,
                contact: { fullName: 'Admin', phone: '08012345678' },
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
                paymentMethod: PAYMENT_METHOD.PAY_ON_DELIVERY,
                status: ORDER_STATUS.PENDING_CONFIRMATION,
                shipping: {
                    address: '1 Somewhere, Lagos',
                    zoneName: zone.name,
                },
            });

            const res = await request(app)
                .delete(`/api/v1/delivery-zones/${zone._id}`)
                .set('Cookie', adminCookie);
            expect(res.status).toBe(204);

            // The zone is gone...
            expect(await DeliveryZone.countDocuments({})).toBe(0);
            // ...but the order still reads back with its shipping details
            // intact, because it never pointed at the zone document.
            const stored = await Order.findById(order._id);
            expect(stored).not.toBeNull();
            expect(stored.shipping.zoneName).toBe('Lagos Mainland');
            // The fee is copied onto the order too, so the total a customer was
            // charged cannot change after the zone is gone.
            expect(stored.deliveryFee).toBe(250000);
            expect(stored.total).toBe(750000);
        });
    });
});