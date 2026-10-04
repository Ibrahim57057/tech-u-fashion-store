/**
 * NoSQL-injection guard.
 *
 * Strips the two shapes MongoDB treats as query operators: a key starting
 * with "$" ({"$gt": ""}, {"$where": "..."}) and a key containing "." (which
 * reaches into a nested document). Left alone, `?$where=...` on a public
 * endpoint is server-side JavaScript execution against the database.
 *
 * req.body and req.params are plain own properties, so they are cleaned in
 * place. req.query cannot be: in Express 5 it is a getter that re-parses the
 * query string on every access, so mutating the object it returns changes a
 * throwaway, and assigning to it throws
 * "Cannot set property query of #<IncomingMessage> which has only a getter".
 * (Both verified against express 5.2.1 — an earlier version of this file
 * mutated req.query in place and silently did nothing at all.)
 *
 * So query parameters are cleaned into a copy published as req.safeQuery,
 * which controllers read instead. Express's default 'simple' query parser
 * means values arrive as strings or arrays of strings and never as nested
 * objects, so the shallow key check below is sufficient.
 */

const isOperatorKey = (key) => key.startsWith('$') || key.includes('.');

/** Removes operator keys from a body/params object, in place. */
function sanitizeInPlace(obj) {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
        if (isOperatorKey(key)) {
            delete obj[key];
            continue;
        }
        const value = obj[key];
        if (value && typeof value === 'object') sanitizeInPlace(value);
    }
}

/** Returns a copy of a query object with operator keys removed. */
export function sanitizeQuery(query) {
    const clean = {};
    if (!query || typeof query !== 'object') return clean;

    for (const key of Object.keys(query)) {
        if (!isOperatorKey(key)) clean[key] = query[key];
    }
    return clean;
}

export function sanitizeRequest(req, res, next) {
    sanitizeInPlace(req.body);
    sanitizeInPlace(req.params);
    req.safeQuery = sanitizeQuery(req.query);
    next();
}