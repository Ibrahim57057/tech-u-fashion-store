import crypto from 'node:crypto';
import { env } from '../../config/env.js';

/**
 * Unsubscribe links are signed rather than remembered.
 *
 * POST /newsletter/unsubscribe changes state for an arbitrary address, so
 * leaving it open to anyone meant a single request could remove any
 * subscriber, and the 404-versus-200 answer told the caller which addresses
 * were on the list at all. Requiring a token makes the endpoint usable only
 * by someone who actually received the link.
 *
 * The token is an HMAC over the email with the server's JWT_SECRET, so it
 * needs no schema column, no token table and no expiry bookkeeping: the
 * secret already rotates with a full redeploy, and a forged token for an
 * address we never mailed changes nothing.
 */
export function unsubscribeTokenFor(email) {
    return crypto
        .createHmac('sha256', env.jwtSecret)
        .update(`newsletter-unsubscribe:${String(email).toLowerCase()}`)
        .digest('hex');
}

/** Constant-time comparison; a wrong-length token short-circuits to false. */
export function isValidUnsubscribeToken(email, token) {
    const given = Buffer.from(String(token ?? ''), 'utf8');
    const expected = Buffer.from(unsubscribeTokenFor(email), 'utf8');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** The URL a subscriber clicks. Kept here so every email builds it the same way. */
export function unsubscribeUrlFor(email) {
    return `${env.clientUrl}/newsletter/unsubscribe?email=${encodeURIComponent(email)}`
        + `&token=${unsubscribeTokenFor(email)}`;
}
