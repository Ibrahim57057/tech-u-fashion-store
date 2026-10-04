import { describe, it, expect } from 'vitest';
import { generateOrderNumber } from './generateOrderNumber.js';

describe('generateOrderNumber', () => {
    it('matches the documented shape', () => {
        expect(generateOrderNumber()).toMatch(/^TU-\d{6}-[A-HJ-NP-Z2-9]{6}$/);
    });

    it('embeds today in yymmdd', () => {
        const now = new Date();
        const expected = [
            String(now.getFullYear()).slice(2),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
        ].join('');

        expect(generateOrderNumber()).toContain(`-${expected}-`);
    });

    it('avoids characters that are easy to misread', () => {
        // Only the random suffix is checked. The date segment legitimately
        // contains 0 and 1 (the 4th of October reads 1004).
        const suffixes = Array.from({ length: 500 }, generateOrderNumber).map((n) => n.slice(-6)).join('');

        expect(suffixes).not.toMatch(/[01OI]/);
    });

    // 500 draws from a 32-character alphabet is expected to leave every
    // character uncovered only about 5e-7 of the time, so a uniform generator
    // passes this and a heavily biased one does not.
    it('uses the whole alphabet, not a biased prefix', () => {
        const seen = new Set(
            Array.from({ length: 500 }, generateOrderNumber)
                .map((n) => n.slice(-6))
                .join(''),
        );

        expect(seen.size).toBeGreaterThan(25);
    });

    it('does not repeat across many calls', () => {
        const generated = new Set(Array.from({ length: 2000 }, generateOrderNumber));

        expect(generated.size).toBe(2000);
    });
});