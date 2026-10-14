import { describe, it, expect, beforeAll, afterAll, beforeEach, inject, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { generate } from 'otplib';
import { createApp } from '../../app.js';
import User from './user.model.js';

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
});

const creds = {
    name: 'Two Factor Tester',
    email: 'twofactor.tester@gmail.com',
    phone: '08012345678',
    password: 'password123',
};

const register = () => request(app).post('/api/v1/auth/register').send(creds);
const login = () => request(app).post('/api/v1/auth/login').send({ email: creds.email, password: creds.password });

function pickCookie(headers, name) {
    const all = headers['set-cookie'] ?? [];
    const hit = all.find((c) => c.startsWith(`${name}=`));
    expect(hit, `cookie ${name} was not set`).toBeTruthy();
    return hit.split(';')[0];
}

/** Registers, turns 2FA on, and returns the secret plus one recovery code. */
async function enableTwoFactor() {
    const created = await register();
    const cookie = created.headers['set-cookie'];

    const setup = await request(app).post('/api/v1/auth/2fa/setup').set('Cookie', cookie);
    expect(setup.status).toBe(200);
    const { secret } = setup.body.data;

    const code = await generate({ secret });
    const enabled = await request(app)
        .post('/api/v1/auth/2fa/enable')
        .set('Cookie', cookie)
        .send({ code });
    expect(enabled.status).toBe(200);

    return { secret, recoveryCodes: enabled.body.data.recoveryCodes };
}

describe('two-factor setup', () => {
    it('requires a session', async () => {
        expect((await request(app).post('/api/v1/auth/2fa/setup')).status).toBe(401);
    });

    it('returns a secret and a scannable URI', async () => {
        const created = await register();
        const res = await request(app)
            .post('/api/v1/auth/2fa/setup')
            .set('Cookie', created.headers['set-cookie']);

        expect(res.status).toBe(200);
        expect(res.body.data.secret).toMatch(/^[A-Z2-7]+$/);
        expect(res.body.data.otpauthUrl).toContain('otpauth://totp/');
        expect(res.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('will not enable without a valid code', async () => {
        const created = await register();
        await request(app).post('/api/v1/auth/2fa/setup').set('Cookie', created.headers['set-cookie']);

        const res = await request(app)
            .post('/api/v1/auth/2fa/enable')
            .set('Cookie', created.headers['set-cookie'])
            .send({ code: '000000' });

        expect(res.status).toBe(400);
        const stored = await User.findOne({ email: creds.email });
        expect(stored.twoFactorEnabled).toBe(false);
    });

    it('enables and returns ten single-use recovery codes', async () => {
        const { recoveryCodes } = await enableTwoFactor();
        expect(recoveryCodes).toHaveLength(10);

        const stored = await User.findOne({ email: creds.email }).select('+twoFactorRecoveryCodes');
        expect(stored.twoFactorEnabled).toBe(true);
        // Hashed, so the plaintext codes in the response are the only copy.
        expect(stored.twoFactorRecoveryCodes).not.toContain(recoveryCodes[0]);
    });
});

describe('logging in with two-factor enabled', () => {
    it('stops at a ticket instead of starting a session', async () => {
        await enableTwoFactor();

        const res = await login();
        expect(res.status).toBe(200);
        expect(res.body.data.twoFactorRequired).toBe(true);
        expect(res.body.data.ticket).toBeTruthy();
        // No session was issued.
        expect(res.headers['set-cookie'] ?? []).not.toContainEqual(expect.stringContaining('token='));
    });

    it('completes with a valid code', async () => {
        const { secret } = await enableTwoFactor();

        const started = await login();
        const code = await generate({ secret });
        const res = await request(app)
            .post('/api/v1/auth/2fa/authenticate')
            .send({ ticket: started.body.data.ticket, code });

        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe(creds.email);

        const me = await request(app)
            .get('/api/v1/auth/me')
            .set('Cookie', pickCookie(res.headers, 'token'));
        expect(me.status).toBe(200);
    });

    it('refuses a wrong code', async () => {
        await enableTwoFactor();
        const started = await login();

        const res = await request(app)
            .post('/api/v1/auth/2fa/authenticate')
            .send({ ticket: started.body.data.ticket, code: '000000' });

        expect(res.status).toBe(401);
    });

    it('needs only the password again once 2FA is disabled', async () => {
        const { secret } = await enableTwoFactor();

        const started = await login();
        const authed = await request(app)
            .post('/api/v1/auth/2fa/authenticate')
            .send({ ticket: started.body.data.ticket, code: await generate({ secret }) });

        const disabled = await request(app)
            .post('/api/v1/auth/2fa/disable')
            .set('Cookie', authed.headers['set-cookie'])
            .send({ password: creds.password, code: await generate({ secret }) });
        expect(disabled.status).toBe(200);

        const plain = await login();
        expect(plain.body.data.twoFactorRequired).toBeUndefined();
        expect(pickCookie(plain.headers, 'token')).toBeTruthy();
    });
});

describe('the two-factor ticket', () => {
    it('cannot be used as a session on its own', async () => {
        await enableTwoFactor();
        const started = await login();
        const ticket = started.body.data.ticket;

        const me = await request(app).get('/api/v1/auth/me').set('Cookie', `token=${ticket}`);
        expect(me.status).toBe(401);
    });
});

describe('recovery codes', () => {
    it('let a customer in, and burn on use', async () => {
        const { recoveryCodes } = await enableTwoFactor();
        const recovery = recoveryCodes[0];

        const started = await login();
        const first = await request(app)
            .post('/api/v1/auth/2fa/authenticate')
            .send({ ticket: started.body.data.ticket, code: recovery });
        expect(first.status).toBe(200);

        // The same code is single-use.
        const second = await login();
        const replay = await request(app)
            .post('/api/v1/auth/2fa/authenticate')
            .send({ ticket: second.body.data.ticket, code: recovery });
        expect(replay.status).toBe(401);
    });
});
