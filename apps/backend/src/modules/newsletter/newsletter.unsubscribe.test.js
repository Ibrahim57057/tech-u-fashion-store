import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../app.js';
import Subscriber from './subscriber.model.js';
import { unsubscribeTokenFor } from './unsubscribeToken.js';

let app;

beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Subscriber.deleteMany({});
});

const unsubscribe = (body) => request(app).post('/api/v1/newsletter/unsubscribe').send(body);

describe('POST /newsletter/unsubscribe', () => {
    // Without a token this endpoint let anyone remove any subscriber, and the
    // 404-versus-200 answer told them which addresses were on the list.
    it('refuses a request with no token', async () => {
        await Subscriber.create({ email: 'ada@example.com' });

        const res = await unsubscribe({ email: 'ada@example.com' });

        expect(res.status).toBe(422);
        expect((await Subscriber.findOne({ email: 'ada@example.com' })).unsubscribedAt).toBeNull();
    });

    it('refuses a forged token without touching the subscriber', async () => {
        await Subscriber.create({ email: 'ada@example.com' });

        const res = await unsubscribe({ email: 'ada@example.com', token: 'a'.repeat(64) });

        expect(res.status).toBe(400);
        expect((await Subscriber.findOne({ email: 'ada@example.com' })).unsubscribedAt).toBeNull();
    });

    it('refuses a token issued for a different address', async () => {
        await Subscriber.create({ email: 'ada@example.com' });

        const res = await unsubscribe({
            email: 'ada@example.com',
            token: unsubscribeTokenFor('somebody-else@example.com'),
        });

        expect(res.status).toBe(400);
    });

    it('accepts the signed token and soft-deletes the row', async () => {
        await Subscriber.create({ email: 'ada@example.com' });

        const res = await unsubscribe({
            email: 'Ada@Example.com',
            token: unsubscribeTokenFor('ada@example.com'),
        });

        expect(res.status).toBe(200);
        expect(await Subscriber.countDocuments({})).toBe(1);
        expect((await Subscriber.findOne({ email: 'ada@example.com' })).unsubscribedAt).toBeInstanceOf(Date);
    });

    it('answers a valid token for an address that was never subscribed the same way', async () => {
        const res = await unsubscribe({
            email: 'nobody@example.com',
            token: unsubscribeTokenFor('nobody@example.com'),
        });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Unsubscribed.');
    });
});

describe('POST /newsletter/subscribe does not reveal membership', () => {
    const subscribe = (email) => request(app).post('/api/v1/newsletter/subscribe').send({ email });

    it('answers a known address and an unknown one identically', async () => {
        await subscribe('ada@example.com');

        const known = await subscribe('ada@example.com');
        const unknown = await subscribe('stranger@example.com');

        expect(known.status).toBe(200);
        expect(unknown.status).toBe(201);
        // The message is the whole answer, and it is the same sentence either
        // way. The body only echoes back the address the caller just typed,
        // which says nothing about whether it is on the list.
        expect(known.body.message).toBe(unknown.body.message);
        expect(Object.keys(known.body.data)).toEqual(['email']);
        expect(Object.keys(unknown.body.data)).toEqual(['email']);
        expect(known.body.data).not.toHaveProperty('alreadySubscribed');
    });

    it('still only stores the address once', async () => {
        await subscribe('ada@example.com');
        await subscribe('ada@example.com');

        expect(await Subscriber.countDocuments({})).toBe(1);
    });
});
