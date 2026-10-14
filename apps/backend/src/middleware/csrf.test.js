import { describe, it, expect } from 'vitest';
import { isAllowedOrigin } from './csrf.js';

describe('isAllowedOrigin', () => {
    it('accepts the configured storefront origin', () => {
        expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    });

    it('accepts a localhost port outside production', () => {
        expect(isAllowedOrigin('http://127.0.0.1:4173')).toBe(true);
    });

    it('rejects an unrelated origin', () => {
        expect(isAllowedOrigin('https://evil.example')).toBe(false);
    });

    it('rejects a missing origin', () => {
        expect(isAllowedOrigin(undefined)).toBe(false);
        expect(isAllowedOrigin('')).toBe(false);
    });
});
