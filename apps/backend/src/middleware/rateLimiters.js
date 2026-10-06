import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.js';

const isTest = env.nodeEnv === 'test';
const tooMany = (message) => ({ success: false, error: { message } });

/**
 * The bucket key for an authenticated action.
 *
 * Exported so the behaviour can be asserted directly — express-rate-limit does
 * not expose a built limiter's keyGenerator for inspection.
 *
 * A signed-in request keys on the account id, which survives an attacker
 * rotating addresses. Anything unauthenticated falls back to the IP, but via
 * ipKeyGenerator rather than req.ip: on IPv6 one customer is routinely handed
 * a /64, so a literal-address bucket would be trivially escaped, and
 * express-rate-limit refuses to build a limiter that does this
 * (ERR_ERL_KEY_GEN_IPV6).
 */
export function perUserKey(req) {
    return req.user?.id ?? ipKeyGenerator(req.ip);
}

/**
 * Throttles an authenticated action per signed-in account rather than per IP.
 *
 * Two reasons it keys on the user:
 *  - behind a shared connection (an office, a mobile carrier CGNAT, a
 *    university campus) a per-IP bucket means one heavy user locks out
 *    everyone else on the same address;
 *  - per-IP is trivially sidestepped by rotating the address, so it does
 *    little against the account-level abuse these limits exist for.
 *
 * Must be mounted AFTER `protect` in the route chain — req.user does not exist
 * before then, and the limiter would silently degrade to per-IP.
 */
export function perUserLimiter({ windowMs, max, message }) {
    return rateLimit({
        windowMs,
        max: isTest ? 100_000 : max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: perUserKey,
        message: tooMany(message),
    });
}

/**
 * POST /orders: each accepted order writes a document, a statusHistory entry,
 * decrements stock and fires a confirmation email. Ten a minute is far above
 * what any real customer needs and far below anything abusive.
 */
export const orderLimiter = perUserLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many orders placed. Please wait a moment and try again.',
});

/**
 * POST /payments/initialize: each call creates a Payment row and a real
 * Paystack transaction, so it both spends gateway quota and leaves abandoned
 * records behind. Tighter, and over a longer window, to allow a genuine retry
 * of an abandoned payment.
 */
export const paymentLimiter = perUserLimiter({
    windowMs: 10 * 60 * 1000,
    max: 8,
    message: 'Too many payment attempts. Please wait a few minutes and try again.',
});

/**
 * POST /auth/forgot-password. Unauthenticated, so perUserKey falls back to the
 * IP — which is the right key here anyway, since the thing being rate-limited
 * is the mail we send out, not an account.
 *
 * Five links in fifteen minutes is far beyond a person who mistyped their
 * address once. Without it this endpoint is an open relay: anyone can make
 * Resend send mail to any address claiming to be from us, and a few hundred
 * of those will get the sending domain suspended.
 */
export const forgotPasswordLimiter = perUserLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many reset requests. Please wait a few minutes and try again.',
});

/**
 * POST /auth/reset-password. The token is 256 bits and cannot be guessed, so
 * this is not really about brute force — it is a cheap guard on a cheap
 * endpoint, and it bounds how fast a caller can throw malformed tokens at the
 * hashing comparison.
 */
export const resetPasswordLimiter = perUserLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many reset attempts. Please request a new link and try again.',
});