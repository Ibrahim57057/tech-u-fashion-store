import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import User from '../auth/user.model.js';

let app;
let adminCookie;
let staffCookie;

beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
    // A factory, so this file gets its own rate limiter rather than sharing
    // (and exhausting) the live app's login budget.
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    await User.deleteMany({});

    adminCookie = await loginAs('admin@gmail.com', 'admin');
    staffCookie = await loginAs('staff@gmail.com', 'staff');
});

async function loginAs(email, role) {
    await User.create({ name: role, email, phone: '0801', password: 'password123', role });
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
    return res.headers['set-cookie'];
}

describe('the staff dashboard split', () => {
    // AdminLayout shows staff Dashboard, Orders and Returns. Orders and
    // Returns already allowed staff; the dashboard endpoints did not, so a
    // staff member opening /admin was told to log in again.
    it('lets staff read the operational counts', async () => {
        const res = await request(app).get('/api/v1/admin/stats').set('Cookie', staffCookie);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('totalOrders');
        expect(res.body.data).toHaveProperty('pendingOrders');
        expect(res.body.data).toHaveProperty('lowStockProducts');
        expect(res.body.data).toHaveProperty('totalCustomers');
    });

    it('does not put revenue in a staff response at all', async () => {
        const res = await request(app).get('/api/v1/admin/stats').set('Cookie', staffCookie);

        expect(res.status).toBe(200);
        expect(res.body.data).not.toHaveProperty('totalRevenue');
        expect(JSON.stringify(res.body)).not.toMatch(/totalRevenue/);
    });

    it('still gives an admin the revenue total', async () => {
        const res = await request(app).get('/api/v1/admin/stats').set('Cookie', adminCookie);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('totalRevenue', 0);
    });

    it('refuses staff the per-product revenue list', async () => {
        const res = await request(app).get('/api/v1/admin/top-products').set('Cookie', staffCookie);

        expect(res.status).toBe(403);
    });

    it('refuses staff the revenue chart', async () => {
        const res = await request(app).get('/api/v1/admin/revenue-by-day').set('Cookie', staffCookie);

        expect(res.status).toBe(403);
    });

    it('refuses an anonymous caller on every admin endpoint', async () => {
        for (const path of ['/admin/stats', '/admin/top-products', '/admin/revenue-by-day']) {
            const res = await request(app).get(`/api/v1${path}`);
            expect(res.status, path).toBe(401);
        }
    });

    it('refuses a customer on every admin endpoint', async () => {
        const customerCookie = await loginAs('buyer@gmail.com', 'customer');

        for (const path of ['/admin/stats', '/admin/top-products', '/admin/revenue-by-day']) {
            const res = await request(app).get(`/api/v1${path}`).set('Cookie', customerCookie);
            expect(res.status, path).toBe(403);
        }
    });
});
