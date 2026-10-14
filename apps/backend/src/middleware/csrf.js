import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for a cookie-authenticated API.
 *
 * The session cookie is SameSite=None in production (the storefront and the
 * API are different origins), so a page on another site can make the browser
 * attach it. What such a page cannot do is forge the Origin header: browsers
 * set it on every state-changing request, and a script cannot override it.
 * Verify it instead of pulling in csurf, which is deprecated.
 *
 * A request with neither Origin nor Referer is not a browser form post (curl,
 * a payment webhook), so it is allowed through.
 */
export function isAllowedOrigin(origin) {
    if (!origin) return false;

    const normalized = origin.replace(/\/+$/, '');
    if (env.clientUrls.includes(normalized)) return true;

    return (
        env.nodeEnv !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)
    );
}

export function verifyCsrfOrigin(req, res, next) {
    if (env.nodeEnv === 'test' || SAFE_METHODS.has(req.method)) return next();

    const origin = req.get('origin');
    if (origin) {
        return isAllowedOrigin(origin)
            ? next()
            : next(new AppError('Request blocked: untrusted origin.', 403));
    }

    const referer = req.get('referer');
    if (referer) {
        try {
            return isAllowedOrigin(new URL(referer).origin)
                ? next()
                : next(new AppError('Request blocked: untrusted origin.', 403));
        } catch {
            return next(new AppError('Request blocked: untrusted origin.', 403));
        }
    }

    return next();
}
