import { describe, it, expect, beforeAll, afterAll, beforeEach, inject, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import User from './user.model.js';

// Registration now sends a confirmation email; stub it so the suite stays
// offline.
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
    name: 'Session Tester',
    email: 'session.tester@gmail.com',
    phone: '08012345678',
    password: 'password123',
};

const register = () => request(app).post('/api/v1/auth/register').send(creds);
const login = () => request(app).post('/api/v1/auth/login').send({ email: creds.email, password: creds.password });

/** Pulls a single named cookie ("name=value") out of a set-cookie header. */
function pickCookie(headers, name) {
    const all = headers['set-cookie'] ?? [];
    const hit = all.find((c) => c.startsWith(`${name}=`));
    expect(hit, `cookie ${name} was not set`).toBeTruthy();
    return hit.split(';')[0];
}

const refresh = (cookie) => request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);

describe('refresh tokens', () => {
    it('login issues both an access and a refresh cookie', async () => {
        await register();
        const res = await login();
        expect(res.status).toBe(200);
        expect(pickCookie(res.headers, 'token')).toMatch(/^token=/);
        expect(pickCookie(res.headers, 'refresh_token')).toMatch(/^refresh_token=/);
    });

    it('exchanges a refresh cookie for a fresh access cookie', async () => {
        const created = await register();
        const refreshCookie = pickCookie(created.headers, 'refresh_token');

        const res = await refresh(refreshCookie);
        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe(creds.email);
        expect(pickCookie(res.headers, 'token')).toMatch(/^token=/);

        // The new access cookie really works.
        const me = await request(app)
            .get('/api/v1/auth/me')
            .set('Cookie', pickCookie(res.headers, 'token'));
        expect(me.status).toBe(200);
    });

    it('rotates: a refresh token cannot be replayed', async () => {
        const created = await register();
        const refreshCookie = pickCookie(created.headers, 'refresh_token');

        expect((await refresh(refreshCookie)).status).toBe(200);
        // Same token again — its hash was already consumed.
        expect((await refresh(refreshCookie)).status).toBe(401);
    });

    it('refuses a token that was never issued', async () => {
        await register();
        expect((await refresh('refresh_token=deadbeef')).status).toBe(401);
    });

    it('refuses a missing cookie', async () => {
        expect((await request(app).post('/api/v1/auth/refresh')).status).toBe(401);
    });

    it('stores only the hash of the refresh token', async () => {
        const created = await register();
        const raw = pickCookie(created.headers, 'refresh_token').split('=')[1];

        const user = await User.findOne({ email: creds.email }).select('+refreshTokens');
        expect(user.refreshTokens.length).toBe(1);
        expect(user.refreshTokens[0].tokenHash).not.toBe(raw);
        expect(user.refreshTokens[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('logout retires the refresh token', async () => {
        const created = await register();
        const refreshCookie = pickCookie(created.headers, 'refresh_token');
        const accessCookie = pickCookie(created.headers, 'token');

        const out = await request(app)
            .post('/api/v1/auth/logout')
            .set('Cookie', [accessCookie, refreshCookie].join('; '));
        expect(out.status).toBe(200);

        expect((await refresh(refreshCookie)).status).toBe(401);
        expect((await request(app).get('/api/v1/auth/me').set('Cookie', accessCookie)).status).toBe(401);
    });

    it('caps stored sessions so old devices do not pile up', async () => {
        await register();
        for (let i = 0; i < 7; i += 1) {
            expect((await login()).status).toBe(200);
        }
        const user = await User.findOne({ email: creds.email }).select('+refreshTokens');
        expect(user.refreshTokens.length).toBe(5);
    });
});
