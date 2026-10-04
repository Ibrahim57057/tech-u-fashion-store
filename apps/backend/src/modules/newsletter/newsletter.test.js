import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import Subscriber from './subscriber.model.js';
import Message from '../contact/message.model.js';

// The throwaway database is started once by src/test/globalSetup.js and
// shared across the suite, so no file starts or stops its own mongod.
beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    // Scoped to the models this file owns, so cleaning up can never disturb
    // another suite sharing the same database.
    await Promise.all([Subscriber.deleteMany({}), Message.deleteMany({})]);
});

const uniqueViolation = (err) => err?.code === 11000 || /duplicate/i.test(err?.message ?? '');

describe('subscriber persistence rules', () => {
    it('stores an address once, lowercased and trimmed', async () => {
        await Subscriber.create({ email: '  Ada@Example.COM  ' });

        expect(await Subscriber.countDocuments({})).toBe(1);
        const found = await Subscriber.findOne({ email: 'ada@example.com' });
        expect(found).not.toBeNull();
    });

    it('blocks a second row for the same address (unique index)', async () => {
        await Subscriber.create({ email: 'dup@example.com' });
        await expect(Subscriber.create({ email: 'dup@example.com' })).rejects.toSatisfy(uniqueViolation);
        expect(await Subscriber.countDocuments({ email: 'dup@example.com' })).toBe(1);
    });

    it('unsubscribe keeps the row so history survives', async () => {
        await Subscriber.create({ email: 'gone@example.com' });

        const updated = await Subscriber.findOneAndUpdate(
            { email: 'gone@example.com' },
            { unsubscribedAt: new Date() },
            { returnDocument: 'after' },
        );

        expect(updated.unsubscribedAt).toBeInstanceOf(Date);
        expect(await Subscriber.countDocuments({ email: 'gone@example.com' })).toBe(1);
    });

    it('re-subscribing a soft-deleted address reactivates the same row', async () => {
        await Subscriber.create({ email: 'back@example.com' });
        await Subscriber.findOneAndUpdate({ email: 'back@example.com' }, { unsubscribedAt: new Date() });

        // Exactly the branch newsletter.controller.js takes.
        const existing = await Subscriber.findOne({ email: 'back@example.com' });
        expect(existing.unsubscribedAt).toBeInstanceOf(Date);
        existing.unsubscribedAt = null;
        await existing.save();

        const revived = await Subscriber.findOne({ email: 'back@example.com' });
        expect(revived.unsubscribedAt).toBeNull();
        expect(await Subscriber.countDocuments({})).toBe(1);
    });

    it('meta.total counts everyone while meta.active excludes unsubscribed', async () => {
        await Subscriber.create({ email: 'stay@example.com' });
        await Subscriber.create({ email: 'leave@example.com' });
        await Subscriber.findOneAndUpdate({ email: 'leave@example.com' }, { unsubscribedAt: new Date() });

        const all = await Subscriber.find();
        expect(all.length).toBe(2);
        expect(all.filter((s) => !s.unsubscribedAt).length).toBe(1);
    });
});

describe('contact message persistence rules', () => {
    it('starts every message as unread "new" with a default subject', async () => {
        const msg = await Message.create({
            name: 'Ada',
            email: 'ada@example.com',
            message: 'Is the Lagos delivery fee still 2000?',
        });

        expect(msg.status).toBe('new');
        expect(msg.subject).toBe('General enquiry');
        expect(msg.user).toBeNull();
    });

    it('rejects an unknown status in the database layer, not just in zod', async () => {
        const msg = await Message.create({ name: 'Ada', email: 'a@b.co', message: 'hello there friend' });

        await expect(
            Message.findByIdAndUpdate(msg._id, { status: 'archived' }, { runValidators: true }),
        ).rejects.toThrow();

        const unchanged = await Message.findById(msg._id);
        expect(unchanged.status).toBe('new');
    });

    it('walks new -> read -> replied without losing the body', async () => {
        const msg = await Message.create({
            name: 'Ada',
            email: 'ada@example.com',
            message: 'Wrong size, need to exchange for a smaller one',
        });

        await Message.findByIdAndUpdate(msg._id, { status: 'read' });
        const replied = await Message.findByIdAndUpdate(msg._id, { status: 'replied' }, { returnDocument: 'after' });

        expect(replied.status).toBe('replied');
        expect(replied.message).toBe('Wrong size, need to exchange for a smaller one');
    });

    it('unread count drops as messages are marked read', async () => {
        await Message.create({ name: 'A', email: 'a@b.co', message: 'first message here' });
        await Message.create({ name: 'B', email: 'b@b.co', message: 'second message here' });

        const before = await Message.find();
        expect(before.filter((m) => m.status === 'new').length).toBe(2);

        await Message.findOneAndUpdate({ email: 'a@b.co' }, { status: 'read' });

        const after = await Message.find();
        expect(after.filter((m) => m.status === 'new').length).toBe(1);
    });

    it('links a message to an account when the sender is logged in', async () => {
        const userId = new mongoose.Types.ObjectId();
        const msg = await Message.create({
            name: 'Ada',
            email: 'ada@example.com',
            message: 'I need help with my order',
            user: userId,
        });

        expect(msg.user.toString()).toBe(userId.toString());
    });
});