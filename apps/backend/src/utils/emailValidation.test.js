import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import User from '../modules/auth/user.model.js';
import Subscriber from '../modules/newsletter/subscriber.model.js';
import {
    normalizeEmail,
    isValidEmailFormat,
    getTypoSuggestion,
    toCanonicalEmail,
    domainAcceptsMail,
    assertValidEmail,
    isDuplicateKeyError,
    INVALID_EMAIL_MESSAGE,
    UNREGISTERED_EMAIL_MESSAGE,
} from './emailValidation.js';

beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'));
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Subscriber.deleteMany({})]);
});

async function makeUser(email) {
    return User.create({
        name: 'Test Person',
        email,
        phone: '08012345678',
        password: 'password123',
    });
}

describe('normalizeEmail', () => {
    it('trims and lowercases so casing cannot hide a duplicate', () => {
        expect(normalizeEmail('  IsMail@Gmail.COM ')).toBe('ismail@gmail.com');
    });

    it('survives non-string input', () => {
        expect(normalizeEmail(undefined)).toBe('');
        expect(normalizeEmail(null)).toBe('');
        expect(normalizeEmail(42)).toBe('');
    });
});

describe('isValidEmailFormat', () => {
    it.each([
        'ismail@gmail.com',
        'first.last@outlook.com',
        "o'brien@yahoo.co.uk",
        'a_b-c@tech-u.store',
        'user+newsletter@gmail.com',
    ])('accepts %s', (email) => {
        expect(isValidEmailFormat(email)).toBe(true);
    });

    it.each([
        ['no at sign', 'ismailgmail.com'],
        ['no domain', 'ismail@'],
        ['no local part', '@gmail.com'],
        ['no TLD', 'ismail@gmail'],
        ['numeric TLD', 'ismail@gmail.123'],
        ['double dot in domain', 'ismail@gmail..com'],
        ['double dot in local part', 'is..mail@gmail.com'],
        ['leading dot in local part', '.ismail@gmail.com'],
        ['trailing dot in local part', 'ismail.@gmail.com'],
        ['space inside', 'is mail@gmail.com'],
        ['trailing dot after TLD', 'ismail@gmail.com.'],
    ])('rejects %s', (_label, email) => {
        expect(isValidEmailFormat(email)).toBe(false);
    });

    it('rejects an address longer than the RFC limit', () => {
        const tooLong = `${'a'.repeat(60)}@${'b'.repeat(200)}.com`;
        expect(tooLong.length).toBeGreaterThan(254);
        expect(isValidEmailFormat(tooLong)).toBe(false);
    });
});

describe('getTypoSuggestion', () => {
    it('recognises the gmail misspellings people actually make', () => {
        expect(getTypoSuggestion('ismail@gamil.com')).toBe('gmail.com');
        expect(getTypoSuggestion('ismail@gmial.com')).toBe('gmail.com');
        expect(getTypoSuggestion('ismail@gmai.com')).toBe('gmail.com');
        expect(getTypoSuggestion('ismail@gmail.co')).toBe('gmail.com');
    });

    it('leaves real domains alone', () => {
        expect(getTypoSuggestion('ismail@gmail.com')).toBeNull();
        expect(getTypoSuggestion('ismail@outlook.com')).toBeNull();
    });
});

describe('toCanonicalEmail', () => {
    it('treats the gmail spellings of one inbox as one identity', () => {
        const expected = 'johndoe@gmail.com';
        expect(toCanonicalEmail('john.doe@gmail.com')).toBe(expected);
        expect(toCanonicalEmail('John.Doe@Gmail.com')).toBe(expected);
        expect(toCanonicalEmail('johndoe+shop@gmail.com')).toBe(expected);
        expect(toCanonicalEmail('j.o.h.n.d.o.e+news@gmail.com')).toBe(expected);
    });

    it('keeps different gmail addresses apart', () => {
        expect(toCanonicalEmail('johndoe@gmail.com')).not.toBe(
            toCanonicalEmail('janedoe@gmail.com'),
        );
    });

    it('drops only the +tag for other providers', () => {
        // Dots are meaningful at outlook.com, so only the tag goes.
        expect(toCanonicalEmail('john.doe+shop@outlook.com')).toBe('john.doe@outlook.com');
    });

    it('does not confuse googlemail with gmail', () => {
        expect(toCanonicalEmail('john.doe@googlemail.com')).toBe('johndoe@googlemail.com');
    });

    it('returns the normalized address when there is no usable local part', () => {
        expect(toCanonicalEmail('+shop@gmail.com')).toBe('+shop@gmail.com');
    });
});

describe('domainAcceptsMail', () => {
    it('finds real mail servers', async () => {
        const result = await domainAcceptsMail('gmail.com');
        expect(result.exists).toBe(true);
    });

    it('reports a domain that does not resolve', async () => {
        const result = await domainAcceptsMail('definitely-not-a-real-domain-zzz9.com');
        expect(result.exists).toBe(false);
        expect(result.uncertain).toBe(false);
    });

    it('flags gamil.com as real infrastructure — which is why it needs a blocklist', async () => {
        // Documents the reason the typo list exists: this domain has working
        // MX records, so DNS alone cannot catch it.
        const result = await domainAcceptsMail('gamil.com');
        expect(result.exists).toBe(true);
    });
});

describe('assertValidEmail', () => {
    it('returns the normalized address when everything is fine', async () => {
        await expect(assertValidEmail('  IsMail@Gmail.com ')).resolves.toBe('ismail@gmail.com');
    });

    it('rejects a malformed address', async () => {
        await expect(assertValidEmail('ismail@@gmail')).rejects.toThrow(INVALID_EMAIL_MESSAGE);
    });

    it('rejects a typo domain and points at the right one', async () => {
        // The exact address that created this whole problem.
        await expect(assertValidEmail('ismailtaiwo965@gamil.com')).rejects.toThrow(
            /Did you mean ismailtaiwo965@gmail\.com\?/,
        );
    });

    it('rejects a domain that accepts no mail', async () => {
        // verifyDomain is explicit here because vitest.config.js turns the
        // DNS check off by default to keep the suite off the network.
        await expect(
            assertValidEmail('someone@definitely-not-a-real-domain-zzz9.com', {
                verifyDomain: true,
            }),
        ).rejects.toThrow(UNREGISTERED_EMAIL_MESSAGE);
    });

    it('skips the DNS check when the suite disables it', async () => {
        expect(process.env.EMAIL_VERIFY_DNS).toBe('false');
        await expect(
            assertValidEmail('someone@definitely-not-a-real-domain-zzz9.com'),
        ).resolves.toBe('someone@definitely-not-a-real-domain-zzz9.com');
    });

    it('can also skip the DNS check explicitly', async () => {
        await expect(
            assertValidEmail('someone@definitely-not-a-real-domain-zzz9.com', {
                verifyDomain: false,
            }),
        ).resolves.toBe('someone@definitely-not-a-real-domain-zzz9.com');
    });
});

describe('one person cannot hold two accounts', () => {
    it('blocks the same address twice', async () => {
        await makeUser('johndoe@gmail.com');
        await expect(makeUser('johndoe@gmail.com')).rejects.toMatchObject({ code: 11000 });
    });

    it('blocks a different casing of the same address', async () => {
        await makeUser('johndoe@gmail.com');
        // A plain findOne({ email: 'John.Doe@Gmail.com' }) misses the stored
        // lowercase row and only fails later as an unhandled 500.
        await expect(makeUser('John.Doe@Gmail.com')).rejects.toMatchObject({ code: 11000 });
    });

    it('blocks the dotted gmail spelling of an existing inbox', async () => {
        await makeUser('johndoe@gmail.com');
        await expect(makeUser('john.doe@gmail.com')).rejects.toMatchObject({ code: 11000 });
    });

    it('blocks a +tag of an existing inbox', async () => {
        await makeUser('johndoe@gmail.com');
        await expect(makeUser('johndoe+newsletter@gmail.com')).rejects.toMatchObject({ code: 11000 });
    });

    it('still allows genuinely different people', async () => {
        await makeUser('johndoe@gmail.com');
        await expect(makeUser('janedoe@gmail.com')).resolves.toBeTruthy();
        await expect(makeUser('johndoe@outlook.com')).resolves.toBeTruthy();
    });

    it('stores the canonical address automatically', async () => {
        const user = await makeUser('John.Doe+Shop@Gmail.com');
        expect(user.email).toBe('john.doe+shop@gmail.com');
        expect(user.canonicalEmail).toBe('johndoe@gmail.com');
    });

    it('applies the same rule to newsletter subscribers', async () => {
        await Subscriber.create({ email: 'John.Doe@Gmail.com' });
        await expect(Subscriber.create({ email: 'johndoe@gmail.com' })).rejects.toMatchObject({
            code: 11000,
        });
    });
});

describe('isDuplicateKeyError', () => {
    it('recognises the mongo duplicate key code', () => {
        expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
        expect(isDuplicateKeyError({ code: 11001 })).toBe(true);
        expect(isDuplicateKeyError(new Error('nope'))).toBe(false);
        expect(isDuplicateKeyError(undefined)).toBe(false);
    });
});