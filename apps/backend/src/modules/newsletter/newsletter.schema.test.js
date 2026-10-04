import { describe, it, expect } from 'vitest';
import { subscribeSchema, unsubscribeSchema } from './newsletter.schema.js';
import { createMessageSchema, updateMessageSchema } from '../contact/contact.schema.js';
import { MESSAGE_STATUS } from '../contact/message.model.js';

/**
 * Pure validation rules — no database required, so these run even on a
 * machine where the in-memory MongoDB binary hasn't been downloaded yet.
 */

describe('newsletter input validation', () => {
    it('accepts a normal address and treats name/source as optional', () => {
        expect(subscribeSchema.safeParse({ email: 'ada@example.com' }).success).toBe(true);
        expect(subscribeSchema.safeParse({ email: 'ada@example.com', name: 'Ada', source: 'footer' }).success).toBe(
            true,
        );
    });

    it('rejects addresses that are not emails', () => {
        expect(subscribeSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
        expect(subscribeSchema.safeParse({ email: '' }).success).toBe(false);
        expect(subscribeSchema.safeParse({}).success).toBe(false);
        expect(unsubscribeSchema.safeParse({ email: 'bad' }).success).toBe(false);
    });

    it('caps the length of name and source so the list can’t be abused', () => {
        expect(subscribeSchema.safeParse({ email: 'a@b.co', name: 'x'.repeat(81) }).success).toBe(false);
        expect(subscribeSchema.safeParse({ email: 'a@b.co', source: 'x'.repeat(41) }).success).toBe(false);
        expect(subscribeSchema.safeParse({ email: 'a@b.co', name: 'x'.repeat(80) }).success).toBe(true);
    });
});

describe('contact input validation', () => {
    const valid = { name: 'Ada', email: 'ada@example.com', message: 'Is the Lagos delivery fee still 2000?' };

    it('accepts a well-formed enquiry', () => {
        expect(createMessageSchema.safeParse(valid).success).toBe(true);
    });

    it('requires a real name, not a single character', () => {
        expect(createMessageSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
        expect(createMessageSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
        expect(createMessageSchema.safeParse({ ...valid, name: 'x'.repeat(81) }).success).toBe(false);
    });

    it('rejects a message that is too short to act on', () => {
        expect(createMessageSchema.safeParse({ ...valid, message: 'hi' }).success).toBe(false);
        expect(createMessageSchema.safeParse({ ...valid, message: 'x'.repeat(2001) }).success).toBe(false);
        expect(createMessageSchema.safeParse({ ...valid, message: 'x'.repeat(10) }).success).toBe(true);
    });

    it('requires a valid email address', () => {
        expect(createMessageSchema.safeParse({ ...valid, email: 'ada@' }).success).toBe(false);
        expect(createMessageSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    });

    it('allows a long subject but still caps it', () => {
        expect(createMessageSchema.safeParse({ ...valid, subject: 'x'.repeat(121) }).success).toBe(false);
        expect(createMessageSchema.safeParse({ ...valid, subject: 'x'.repeat(120) }).success).toBe(true);
    });
});

describe('message status rules', () => {
    it('knows exactly the three statuses the inbox renders', () => {
        expect(MESSAGE_STATUS).toEqual(['new', 'read', 'replied']);
    });

    it('allows each real status and rejects anything else', () => {
        for (const status of MESSAGE_STATUS) {
            expect(updateMessageSchema.safeParse({ status }).success).toBe(true);
        }
        expect(updateMessageSchema.safeParse({ status: 'archived' }).success).toBe(false);
        expect(updateMessageSchema.safeParse({ status: '' }).success).toBe(false);
        expect(updateMessageSchema.safeParse({}).success).toBe(false);
    });
});