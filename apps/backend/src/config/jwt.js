import jwt from 'jsonwebtoken';
import { env } from './env.js';

// Short on purpose: the access cookie is a bearer token, so the refresh cookie
// (see auth.controller.js) is what keeps a customer logged in beyond this.
export const ACCESS_TOKEN_TTL = '15m';

/**
 * `tv` mirrors User.tokenVersion at signing time. `protect` rejects a token
 * whose `tv` no longer matches, which is what makes logout able to revoke an
 * already-issued cookie.
 */
export function signToken(user) {
    return jwt.sign({ id: user._id, tv: user.tokenVersion ?? 0 }, env.jwtSecret, {
        expiresIn: ACCESS_TOKEN_TTL,
    });
}

// Issued after a correct password when the account has 2FA on. Carries no
// access of its own — `protect` refuses any token with a `scope`.
export function signTwoFactorTicket(user) {
    return jwt.sign({ id: user._id, scope: '2fa' }, env.jwtSecret, { expiresIn: '5m' });
}

export function verifyToken(token) {
    return jwt.verify(token, env.jwtSecret);
}
