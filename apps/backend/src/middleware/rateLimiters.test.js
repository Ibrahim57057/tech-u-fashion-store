import { describe, it, expect } from 'vitest';
import { perUserKey, perUserLimiter, orderLimiter, paymentLimiter } from './rateLimiters.js';

describe('per-user rate limiters', () => {
    // express-rate-limit throws ERR_ERL_KEY_GEN_IPV6 at construction time if the
    // key generator touches a raw IP, rather than letting an escapable limiter
    // reach production. Building both limiters is therefore the regression test
    // for the warning the server printed on startup.
    it('builds without the IPv6 validation error', () => {
        expect(() => perUserLimiter({ windowMs: 1000, max: 5, message: 'x' })).not.toThrow();
        expect(orderLimiter).toBeDefined();
        expect(paymentLimiter).toBeDefined();
    });

    it('keys a signed-in request on the account, not the address', () => {
        // Same user, two different addresses -> one bucket. This is what stops
        // one account rotating IPs to escape its own limit.
        expect(perUserKey({ user: { id: 'user-1' }, ip: '::1' })).toBe(
            perUserKey({ user: { id: 'user-1' }, ip: '203.0.113.9' }),
        );
    });

    it('gives different users different buckets', () => {
        expect(perUserKey({ user: { id: 'user-1' }, ip: '::1' })).not.toBe(
            perUserKey({ user: { id: 'user-2' }, ip: '::1' }),
        );
    });

    // One IPv6 customer typically holds a whole /64, so keying on the literal
    // address would hand them billions of buckets to cycle through.
    it('folds an IPv6 prefix into a single key', () => {
        expect(perUserKey({ ip: '2001:db8:1:2:3:4:5:6' })).toBe(
            perUserKey({ ip: '2001:db8:1:2:3:4:5:7' }),
        );
    });

    it('still separates genuinely different IPv4 addresses', () => {
        expect(perUserKey({ ip: '203.0.113.9' })).not.toBe(
            perUserKey({ ip: '198.51.100.4' }),
        );
    });

    it('prefers the account even when an address is present', () => {
        expect(perUserKey({ user: { id: 'user-9' }, ip: '203.0.113.9' })).toBe('user-9');
    });
});