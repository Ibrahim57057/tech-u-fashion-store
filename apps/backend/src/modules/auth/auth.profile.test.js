import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import User from './user.model.js';

let app;

beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    await User.deleteMany({});
});

const creds = {
    name: 'Profile Tester',
    email: 'profile.tester@gmail.com',
    phone: '08012345678',
    password: 'password123',
};

const register = () => request(app).post('/api/v1/auth/register').send(creds);
const login = (password) =>
    request(app).post('/api/v1/auth/login').send({ email: creds.email, password });

async function cookie() {
    const res = await register();
    return res.headers['set-cookie'];
}

describe('editing your own details', () => {
    it('requires a session', async () => {
        const res = await request(app).patch('/api/v1/auth/me').send({ name: 'New Name' });
        expect(res.status).toBe(401);
    });

    it('updates the name and phone and returns the new values', async () => {
        const c = await cookie();

        const res = await request(app)
            .patch('/api/v1/auth/me')
            .set('Cookie', c)
            .send({ name: 'New Name', phone: '08098765432' });

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
            name: 'New Name',
            phone: '08098765432',
            email: creds.email,
        });

        const stored = await User.findOne({ email: creds.email });
        expect(stored.name).toBe('New Name');
        expect(stored.phone).toBe('08098765432');
    });

    it('lets a single field be changed on its own', async () => {
        const c = await cookie();
        const res = await request(app)
            .patch('/api/v1/auth/me')
            .set('Cookie', c)
            .send({ name: 'Only The Name' });
        expect(res.status).toBe(200);
        expect(res.body.data.phone).toBe(creds.phone);
    });

    it('rejects a malformed phone number', async () => {
        const c = await cookie();
        const res = await request(app)
            .patch('/api/v1/auth/me')
            .set('Cookie', c)
            .send({ phone: '12345' });
        expect(res.status).toBe(422);
    });

    it('rejects a name that is too short', async () => {
        const c = await cookie();
        const res = await request(app).patch('/api/v1/auth/me').set('Cookie', c).send({ name: 'A' });
        expect(res.status).toBe(422);
    });

    it('rejects an empty body rather than doing nothing', async () => {
        const c = await cookie();
        const res = await request(app).patch('/api/v1/auth/me').set('Cookie', c).send({});
        expect(res.status).toBe(422);
    });

    it('cannot be used to change role, status or email', async () => {
        const c = await cookie();

        const res = await request(app).patch('/api/v1/auth/me').set('Cookie', c).send({
            name: 'Still A Customer',
            role: 'admin',
            isActive: false,
            email: 'attacker@gmail.com',
        });

        expect(res.status).toBe(200);
        expect(res.body.data.role).toBe('customer');

        const stored = await User.findOne({ email: creds.email });
        expect(stored.role).toBe('customer');
        expect(stored.email).toBe(creds.email);
        expect(stored.isActive).toBe(true);
    });
});

describe('changing your password while signed in', () => {
    it('requires the current password', async () => {
        const c = await cookie();

        const res = await request(app)
            .patch('/api/v1/auth/me/password')
            .set('Cookie', c)
            .send({ currentPassword: 'wrongOne123', password: 'brandNewPass1', confirmPassword: 'brandNewPass1' });

        expect(res.status).toBe(401);

        // The old password still works — the failed attempt changed nothing.
        expect((await login('password123')).status).toBe(200);
    });

    it('refuses a too-short or unconfirmed new password', async () => {
        const c = await cookie();

        expect(
            (
                await request(app)
                    .patch('/api/v1/auth/me/password')
                    .set('Cookie', c)
                    .send({ currentPassword: 'password123', password: 'short' })
            ).status,
        ).toBe(422);

        expect(
            (
                await request(app)
                    .patch('/api/v1/auth/me/password')
                    .set('Cookie', c)
                    .send({ currentPassword: 'password123', password: 'brandNewPass1', confirmPassword: 'mismatch' })
            ).status,
        ).toBe(422);
    });

    it('sets the new password and kills other sessions, keeping the current one', async () => {
        const oldCookie = await cookie();

        // The old token must be more than a second old to fall on the right
        // side of the whole-second JWT `iat` check — see user.model.js.
        await new Promise((resolve) => setTimeout(resolve, 1100));

        const changed = await request(app)
            .patch('/api/v1/auth/me/password')
            .set('Cookie', oldCookie)
            .send({ currentPassword: 'password123', password: 'brandNewPass1', confirmPassword: 'brandNewPass1' });
        expect(changed.status).toBe(200);

        // The session that made the change keeps working…
        const freshCookie = changed.headers['set-cookie'];
        expect((await request(app).get('/api/v1/auth/me').set('Cookie', freshCookie)).status).toBe(200);
        // …while the cookie issued before it is now dead.
        expect((await request(app).get('/api/v1/auth/me').set('Cookie', oldCookie)).status).toBe(401);

        // And the credentials themselves swapped over.
        expect((await login('brandNewPass1')).status).toBe(200);
        expect((await login('password123')).status).toBe(401);
    });
});
