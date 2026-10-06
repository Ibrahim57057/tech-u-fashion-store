import { describe, it, expect, beforeAll, afterAll, beforeEach, inject, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import User from './user.model.js';
import { sendPasswordResetEmail } from './passwordReset.email.js';

// Replaced so the suite does not depend on whether a real Resend key happens
// to be present in .env — the flow only needs the raw token, which the real
// function is handed and would otherwise bury in an API call.
vi.mock('./passwordReset.email.js', () => ({
    sendPasswordResetEmail: vi.fn(async () => ({ sent: true })),
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
    sendPasswordResetEmail.mockClear();
});

const creds = (over = {}) => ({
    name: 'Test Person',
    email: 'tester@gmail.com',
    phone: '08012345678',
    password: 'password123',
    ...over,
});

const register = (over) => request(app).post('/api/v1/auth/register').send(creds(over));

const forgot = (email) => request(app).post('/api/v1/auth/forgot-password').send({ email });

const reset = (token, password, confirmPassword = password) =>
    request(app).post('/api/v1/auth/reset-password').send({ token, password, confirmPassword });

/** Runs a reset request and returns the raw token from the (mocked) email. */
async function startReset(email = 'tester@gmail.com') {
    const res = await forgot(email);
    expect(res.status).toBe(200);
    const call = sendPasswordResetEmail.mock.calls.at(-1);
    expect(call, 'no reset email was sent for an existing account').toBeTruthy();
    return call[0].rawToken;
}

describe('POST /auth/forgot-password', () => {
    // The point of this pair is that a caller cannot use the endpoint to
    // enumerate which addresses have accounts here.
    it('answers an unknown address exactly like a known one', async () => {
        await register();

        const known = await forgot('tester@gmail.com');
        const unknown = await forgot('nobody@gmail.com');

        expect(unknown.status).toBe(known.status);
        expect(unknown.body.data.message).toBe(known.body.data.message);
    });

    it('sends no mail for an address with no account', async () => {
        await forgot('nobody@gmail.com');
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('sends a link to the account that does exist', async () => {
        await register();
        await forgot('tester@gmail.com');
        expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
        expect(sendPasswordResetEmail.mock.calls[0][0].to).toBe('tester@gmail.com');
    });

    it('stores only the hash of the token, never the token itself', async () => {
        await register();
        const raw = await startReset();

        const user = await User.findOne({ email: 'tester@gmail.com' }).select(
            '+passwordResetToken +passwordResetExpires',
        );

        expect(raw).toMatch(/^[0-9a-f]{64}$/);
        expect(user.passwordResetToken).not.toBe(raw);
        expect(user.passwordResetToken).toMatch(/^[0-9a-f]{64}$/);
        expect(user.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
    });

    it('validates the address before touching the database', async () => {
        const res = await forgot('not-an-email');
        expect(res.status).toBe(422);
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
});

describe('POST /auth/reset-password', () => {
    it('sets the new password and signs the customer in', async () => {
        await register();
        const raw = await startReset();

        const res = await reset(raw, 'brandNewPass1');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('role', 'customer');
        expect(res.headers['set-cookie'].join(';')).toContain('token=');

        const login = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'tester@gmail.com', password: 'brandNewPass1' });
        expect(login.status).toBe(200);
    });

    it('keeps the new session it just issued valid', async () => {
        // Regression guard for the one-second fudge on passwordChangedAt.
        // The token is minted in the same second as the change, so without
        // that fudge `protect` would reject it on the very next request and
        // every reset would look like a failed login.
        await register();
        const raw = await startReset();

        const res = await reset(raw, 'brandNewPass1');

        const me = await request(app)
            .get('/api/v1/auth/me')
            .set('Cookie', res.headers['set-cookie']);
        expect(me.status).toBe(200);
        expect(me.body.data.email).toBe('tester@gmail.com');
    });

    it('is single-use: the same link cannot be replayed', async () => {
        await register();
        const raw = await startReset();

        expect((await reset(raw, 'brandNewPass1')).status).toBe(200);

        const replay = await reset(raw, 'secondPass123');
        expect(replay.status).toBe(400);

        // The first password still holds — the replay must not have quietly
        // changed it back.
        const login = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'tester@gmail.com', password: 'brandNewPass1' });
        expect(login.status).toBe(200);
    });

    it('rejects a link past its expiry', async () => {
        await register();
        const raw = await startReset();

        await User.updateOne(
            { email: 'tester@gmail.com' },
            { $set: { passwordResetExpires: new Date(Date.now() - 1000) } },
        );

        const res = await reset(raw, 'brandNewPass1');
        expect(res.status).toBe(400);
        expect(res.body.error.message).toMatch(/expired/i);
    });

    it('rejects a token nobody was issued', async () => {
        await register();
        const res = await reset('a'.repeat(64), 'brandNewPass1');
        expect(res.status).toBe(400);
        expect(res.body.error.message).toMatch(/expired|invalid/i);
    });

    it('rejects a truncated token before it reaches the database', async () => {
        const res = await reset('abc123', 'brandNewPass1');
        expect(res.status).toBe(422);
    });

    it('requires the confirmation to match, like the signup form', async () => {
        await register();
        const raw = await startReset();

        const res = await reset(raw, 'brandNewPass1', 'differentPass1');

        expect(res.status).toBe(422);
        expect(res.body.error.details).toEqual([
            { path: 'confirmPassword', message: 'Passwords do not match' },
        ]);
    });

    it('requires a password long enough', async () => {
        await register();
        const raw = await startReset();

        const res = await reset(raw, 'short');
        expect(res.status).toBe(422);
    });
});

describe('sessions issued before a password change', () => {
    it('kills the previous session once the password is reset', async () => {
        const created = await register();
        const oldCookie = created.headers['set-cookie'];

        // The old token has to be more than a second old to fall on the right
        // side of the second-resolution `iat` check — see the fudge in
        // user.model.js. Without the wait this test would be checking that a
        // token issued 5ms ago was rejected, which the design deliberately
        // does not do.
        await new Promise((resolve) => setTimeout(resolve, 1100));

        const raw = await startReset();
        expect((await reset(raw, 'brandNewPass1')).status).toBe(200);

        const me = await request(app).get('/api/v1/auth/me').set('Cookie', oldCookie);
        expect(me.status).toBe(401);
        expect(me.body.error.message).toMatch(/password was changed/i);
    });

    it('leaves an ordinary session untouched', async () => {
        const created = await register();
        const me = await request(app)
            .get('/api/v1/auth/me')
            .set('Cookie', created.headers['set-cookie']);
        expect(me.status).toBe(200);
    });
});
