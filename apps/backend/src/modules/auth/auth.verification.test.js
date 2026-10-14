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

const creds = (over = {}) => ({
    name: 'Verify Tester',
    email: 'verify.tester@gmail.com',
    phone: '08012345678',
    password: 'password123',
    ...over,
});

const register = (over) => request(app).post('/api/v1/auth/register').send(creds(over));

const verify = (token) => request(app).post('/api/v1/auth/verify-email').send({ token });

/** The raw token from the most recent (mocked) verification email. */
function lastToken() {
    const call = sendVerificationEmail.mock.calls.at(-1);
    expect(call, 'no verification email was sent').toBeTruthy();
    return call[0].rawToken;
}

describe('email confirmation on signup', () => {
    it('emails a confirmation link and starts unverified', async () => {
        const res = await register();
        expect(res.status).toBe(201);
        expect(res.body.data.isEmailVerified).toBe(false);
        expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
        expect(sendVerificationEmail.mock.calls[0][0].to).toBe(creds().email);
    });

    it('marks the account verified when the link is followed', async () => {
        await register();
        const token = lastToken();

        const res = await verify(token);
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ email: creds().email, isEmailVerified: true });

        const stored = await User.findOne({ email: creds().email }).select('+emailVerificationToken');
        expect(stored.isEmailVerified).toBe(true);
        expect(stored.emailVerificationToken).toBeUndefined();
    });

    it('stores only the hash of the confirmation token', async () => {
        await register();
        const raw = lastToken();

        const stored = await User.findOne({ email: creds().email }).select('+emailVerificationToken');
        expect(raw).toMatch(/^[0-9a-f]{64}$/);
        expect(stored.emailVerificationToken).not.toBe(raw);
    });

    it('is single-use', async () => {
        await register();
        const token = lastToken();

        expect((await verify(token)).status).toBe(200);
        expect((await verify(token)).status).toBe(400);
    });

    it('rejects a link past its expiry', async () => {
        await register();
        const token = lastToken();

        await User.updateOne(
            { email: creds().email },
            { $set: { emailVerificationExpires: new Date(Date.now() - 1000) } },
        );

        const res = await verify(token);
        expect(res.status).toBe(400);
        expect(res.body.error.message).toMatch(/expired/i);
    });

    it('rejects a token nobody was issued', async () => {
        await register();
        expect((await verify('a'.repeat(64))).status).toBe(400);
    });

    it('rejects a truncated token before it reaches the database', async () => {
        expect((await verify('abc123')).status).toBe(422);
    });
});

describe('resending the confirmation email', () => {
    it('requires a session', async () => {
        const res = await request(app).post('/api/v1/auth/resend-verification');
        expect(res.status).toBe(401);
    });

    it('replaces the previous link with a fresh one', async () => {
        const created = await register();
        const oldToken = lastToken();
        const cookie = created.headers['set-cookie'];

        const res = await request(app).post('/api/v1/auth/resend-verification').set('Cookie', cookie);
        expect(res.status).toBe(200);

        const newToken = lastToken();
        expect(newToken).not.toBe(oldToken);

        // The superseded link is dead; the new one works.
        expect((await verify(oldToken)).status).toBe(400);
        expect((await verify(newToken)).status).toBe(200);
    });

    it('does not re-send once the address is already confirmed', async () => {
        const created = await register();
        const cookie = created.headers['set-cookie'];
        await verify(lastToken());
        sendVerificationEmail.mockClear();

        const res = await request(app).post('/api/v1/auth/resend-verification').set('Cookie', cookie);
        expect(res.status).toBe(200);
        expect(res.body.data.message).toMatch(/already confirmed/i);
        expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
});
