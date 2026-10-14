import { describe, it, expect, beforeAll, afterAll, beforeEach, inject, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import User from './user.model.js';
import { sendVerificationEmail } from './verification.email.js';

vi.mock('./verification.email.js', () => ({
    sendVerificationEmail: vi.fn(async () => ({ sent: true })),
}));

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
    sendVerificationEmail.mockClear();
});

const base = { name: 'Email Tester', phone: '08012345678', password: 'password123' };

const register = (email) => request(app).post('/api/v1/auth/register').send({ ...base, email });

const changeEmail = (cookie, body) =>
    request(app).patch('/api/v1/auth/me/email').set('Cookie', cookie).send(body);

const verify = (token) => request(app).post('/api/v1/auth/verify-email').send({ token });

const login = (email, password = base.password) =>
    request(app).post('/api/v1/auth/login').send({ email, password });

function lastTokenFor(email) {
    const call = sendVerificationEmail.mock.calls.filter((c) => c[0].to === email).at(-1);
    expect(call, `no email was sent to ${email}`).toBeTruthy();
    return call[0].rawToken;
}

describe('changing the account email', () => {
    it('requires the current password', async () => {
        const created = await register('old@gmail.com');
        const cookie = created.headers['set-cookie'];

        const res = await changeEmail(cookie, { email: 'new@gmail.com', password: 'wrongOne123' });
        expect(res.status).toBe(401);

        const stored = await User.findOne({ email: 'old@gmail.com' });
        expect(stored.pendingEmail).toBeUndefined();
    });

    it('holds the new address as pending and does not switch the login yet', async () => {
        const created = await register('old@gmail.com');
        const cookie = created.headers['set-cookie'];

        const res = await changeEmail(cookie, { email: 'new@gmail.com', password: base.password });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ email: 'old@gmail.com', pendingEmail: 'new@gmail.com' });

        // Still signs in with the old address; the new one is not live yet.
        expect((await login('old@gmail.com')).status).toBe(200);
        expect((await login('new@gmail.com')).status).toBe(401);
    });

    it('applies the change once the new address confirms it', async () => {
        const created = await register('old@gmail.com');
        const cookie = created.headers['set-cookie'];
        await changeEmail(cookie, { email: 'new@gmail.com', password: base.password });

        const token = lastTokenFor('new@gmail.com');
        const res = await verify(token);
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ email: 'new@gmail.com', isEmailVerified: true });

        const stored = await User.findOne({ email: 'new@gmail.com' });
        expect(stored).toBeTruthy();
        expect(stored.pendingEmail).toBeUndefined();
        expect(stored.canonicalEmail).toBe('new@gmail.com');

        expect((await login('new@gmail.com')).status).toBe(200);
        expect((await login('old@gmail.com')).status).toBe(401);
    });

    it('refuses an address another account already holds', async () => {
        await register('taken@gmail.com');
        const created = await register('old@gmail.com');
        const cookie = created.headers['set-cookie'];

        const res = await changeEmail(cookie, { email: 'taken@gmail.com', password: base.password });
        expect(res.status).toBe(409);
    });

    it('treats a dotted alias of the same mailbox as a duplicate', async () => {
        await register('johndoe@gmail.com');
        const created = await register('old@gmail.com');
        const cookie = created.headers['set-cookie'];

        // john.doe@gmail.com and johndoe@gmail.com reach the same inbox.
        const res = await changeEmail(cookie, { email: 'john.doe@gmail.com', password: base.password });
        expect(res.status).toBe(409);
    });

    it('rejects the address you already use', async () => {
        const created = await register('old@gmail.com');
        const cookie = created.headers['set-cookie'];

        const res = await changeEmail(cookie, { email: 'old@gmail.com', password: base.password });
        expect(res.status).toBe(400);
    });

    it('rejects a malformed address before storing anything', async () => {
        const created = await register('old@gmail.com');
        const cookie = created.headers['set-cookie'];

        const res = await changeEmail(cookie, { email: 'not-an-email', password: base.password });
        expect(res.status).toBe(422);

        const stored = await User.findOne({ email: 'old@gmail.com' });
        expect(stored.pendingEmail).toBeUndefined();
    });

    it('requires a session', async () => {
        const res = await request(app)
            .patch('/api/v1/auth/me/email')
            .send({ email: 'new@gmail.com', password: base.password });
        expect(res.status).toBe(401);
    });
});
