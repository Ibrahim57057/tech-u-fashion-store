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
    name: 'Session Tester',
    email: 'session.tester@gmail.com',
    phone: '08012345678',
    password: 'password123',
};

const register = () => request(app).post('/api/v1/auth/register').send(creds);
const login = (password) =>
    request(app).post('/api/v1/auth/login').send({ email: creds.email, password });

describe('logout revokes the session cookie', () => {
    it('refuses the cookie after signing out', async () => {
        const reg = await register();
        const cookie = reg.headers['set-cookie'];
        expect(cookie).toBeDefined();

        const before = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
        expect(before.status).toBe(200);

        const out = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
        expect(out.status).toBe(200);

        const after = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
        expect(after.status).toBe(401);
    });
});

describe('repeated failures lock the account', () => {
    it('locks after five wrong passwords, even against the right one', async () => {
        await register();

        for (let i = 0; i < 5; i++) {
            const res = await login('wrong-password');
            expect(res.status).toBe(401);
        }

        const stillWrong = await login('wrong-password');
        expect(stillWrong.status).toBe(429);

        const correctWhileLocked = await login('password123');
        expect(correctWhileLocked.status).toBe(429);
    });

    it('clears the failed-attempt budget after a good sign-in', async () => {
        await register();

        expect((await login('wrong-password')).status).toBe(401);
        expect((await login('password123')).status).toBe(200);

        const user = await User.findOne({ email: creds.email }).select(
            '+failedLoginAttempts +lockUntil',
        );
        expect(user.failedLoginAttempts).toBe(0);
        expect(user.lockUntil).toBeUndefined();
    });
});
