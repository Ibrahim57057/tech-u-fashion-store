import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';

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

describe('a broken request body', () => {
    // A client that sends invalid JSON has made a mistake, not hit a server
    // fault. Reporting "Something went wrong on our end" (500) for it was
    // both wrong and confusing in the logs.
    it('is answered with 400, not an unexplained 500', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .set('Content-Type', 'application/json')
            .send('{email: someone@gmail.com, password: oops}');

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toMatch(/malformed/i);
    });

    it('never echoes the submitted credentials back', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .set('Content-Type', 'application/json')
            .send('{email: someone@gmail.com, password: hunter2-the-actual-secret}');

        // body-parser keeps the raw request text on the error. If that ever
        // reaches the response, a customer's password is echoed back over the
        // wire.
        expect(JSON.stringify(res.body)).not.toMatch(/hunter2-the-actual-secret/);
    });
});

describe('the real login failure path', () => {
    it('reports a wrong password as 401 with a usable message', async () => {
        const reg = await request(app).post('/api/v1/auth/register').send({
            name: 'Login Probe',
            email: 'login.probe@gmail.com',
            phone: '08012345678',
            password: 'password123',
        });
        expect(reg.status).toBe(201);

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'login.probe@gmail.com', password: 'wrong-password' });

        expect(res.status).toBe(401);
        expect(res.body.error.message).toBe('Incorrect email or password');
    });

    it('reports an unknown email the same way', async () => {
        // Identical response for "no such user" and "wrong password", so the
        // login form cannot be used to discover which addresses are registered.
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'nobody.here.at.all@gmail.com', password: 'password123' });

        expect(res.status).toBe(401);
        expect(res.body.error.message).toBe('Incorrect email or password');
    });

    it('accepts the right password', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'login.probe@gmail.com', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe('login.probe@gmail.com');
    });
});