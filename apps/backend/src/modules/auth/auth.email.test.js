import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import User from './user.model.js';

let app;

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
    await User.deleteMany({});
});

const creds = (over = {}) => ({
    name: 'Test Person',
    email: 'tester@gmail.com',
    phone: '08012345678',
    password: 'password123',
    ...over,
});

const register = (over) => request(app).post('/api/v1/auth/register').send(creds(over));

describe('the admin link depends on role being in the auth response', () => {
    // Regression guard. register and login both used to return
    // { id, name, email } with no role, so the frontend's user.role was
    // undefined straight after signing in. Header.jsx then hid the admin
    // link, and the panel looked like it had vanished — until a hard refresh
    // re-fetched /auth/me, which did return a role.
    it('register returns the role', async () => {
        const res = await register();
        expect(res.status).toBe(201);
        expect(res.body.data).toHaveProperty('role', 'customer');
    });

    it('login returns the role', async () => {
        await register();
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'tester@gmail.com', password: 'password123' });
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('role', 'customer');
    });

    it('register, login and /auth/me agree on the same shape', async () => {
        const created = await register();
        const loggedIn = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'tester@gmail.com', password: 'password123' });
        const me = await request(app)
            .get('/api/v1/auth/me')
            .set('Cookie', loggedIn.headers['set-cookie']);

        expect(Object.keys(created.body.data).sort()).toEqual(
            Object.keys(loggedIn.body.data).sort(),
        );
        expect(me.body.data.role).toBe('customer');
    });

    it('an admin account comes back as admin on every response', async () => {
        await register();
        await User.updateOne({ email: 'tester@gmail.com' }, { $set: { role: 'admin' } });

        const loggedIn = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'tester@gmail.com', password: 'password123' });
        expect(loggedIn.body.data.role).toBe('admin');

        const me = await request(app)
            .get('/api/v1/auth/me')
            .set('Cookie', loggedIn.headers['set-cookie']);
        expect(me.body.data.role).toBe('admin');
    });

    it('does not leak the password hash', async () => {
        const res = await register();
        expect(res.body.data.password).toBeUndefined();
    });
});

describe('register rejects unusable email addresses', () => {
    it('rejects a typo domain and suggests the right one', async () => {
        const res = await register({ email: 'tester@gamil.com' });
        expect(res.status).toBe(422);
        expect(res.body.error.message).toMatch(/Did you mean tester@gmail\.com\?/);
    });

    // The "domain accepts no mail" rule needs a live DNS lookup, which
    // vitest.config.js disables so the suite stays off the network. It is
    // covered against real DNS in emailValidation.test.js.

    it('refuses to store the typo address', async () => {
        await register({ email: 'tester@gamil.com' });
        expect(await User.countDocuments({})).toBe(0);
    });
});

describe('register enforces one person, one account', () => {
    it('refuses an exact duplicate', async () => {
        await register();
        const res = await register();
        expect(res.status).toBe(409);
        expect(await User.countDocuments({})).toBe(1);
    });

    it('refuses a duplicate that differs only by casing', async () => {
        await register();
        const res = await register({ email: 'TESTER@Gmail.com' });
        expect(res.status).toBe(409);
        expect(await User.countDocuments({})).toBe(1);
    });

    it('refuses the dotted gmail spelling of the same inbox', async () => {
        await register({ email: 'tester@gmail.com' });
        const res = await register({ email: 'te.ste.r@gmail.com' });
        expect(res.status).toBe(409);
    });

    it('refuses a +tag of the same inbox', async () => {
        await register({ email: 'tester@gmail.com' });
        const res = await register({ email: 'tester+shop@gmail.com' });
        expect(res.status).toBe(409);
    });

    it('still lets a different person register', async () => {
        await register({ email: 'one@gmail.com' });
        const res = await register({ email: 'two@gmail.com' });
        expect(res.status).toBe(201);
        expect(await User.countDocuments({})).toBe(2);
    });

    it('stores the address normalised alongside its canonical form', async () => {
        await register({ email: '  Te.Ste.R+Tag@Gmail.COM  ' });
        const user = await User.findOne({});
        expect(user.email).toBe('te.ste.r+tag@gmail.com');
        expect(user.canonicalEmail).toBe('tester@gmail.com');
    });
});

describe('login finds the account regardless of typing', () => {
    it('accepts a differently cased address', async () => {
        await register();
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'TESTER@GmAiL.CoM', password: 'password123' });
        expect(res.status).toBe(200);
    });

    it('surrounding whitespace does not lock anyone out', async () => {
        await register();
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: '  tester@gmail.com  ', password: 'password123' });
        expect(res.status).toBe(200);
    });

    it('still rejects a wrong password', async () => {
        await register();
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'tester@gmail.com', password: 'wrongpassword' });
        expect(res.status).toBe(401);
    });
});