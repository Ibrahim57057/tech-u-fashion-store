import mongoose from 'mongoose';
import { env } from './env.js';

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Why a failure is worth retrying, or is never going to succeed.
 *
 * Retrying everything was the original mistake. A wrong database password
 * fails identically five times over 25 seconds, so the deploy just takes
 * longer to reach the same error while the logs scroll past the line that
 * actually says what is wrong.
 *
 * Two classes:
 *
 *  - Fatal. Bad credentials, a malformed URI, a database that does not
 *    exist. No amount of waiting changes the answer, so stop immediately.
 *  - Transient. DNS hiccups, a waking Atlas free cluster, a dropped socket.
 *    Worth waiting out.
 *
 * The distinction matters most in production, where the only visible symptom
 * of a fatal error is a container that will not start.
 */
function isRetryable(err) {
    const code = err?.code;

    // 18 = AuthenticationFailed, 13 = Unauthorized, 31 = ... let it fail now.
    if (code === 18 || code === 13) return false;

    const message = err?.message ?? '';

    // AuthenticationFailed has no numeric code on some driver versions.
    if (/authentication failed/i.test(message)) return false;

    // A URI the driver cannot even parse: missing host, bad scheme, no
    // database name. Waiting cannot repair the string.
    if (/mongodb\+srv:\/\/[^@]*@?$|invalid (?:scheme|connection string|uri)/i.test(message)) {
        return false;
    }

    return true;
}

/** The one line worth reading when the database is unreachable. */
function explain(err) {
    const code = err?.code;

    if (code === 18 || /authentication failed/i.test(err?.message ?? '')) {
        return 'Authentication failed — check the username and password in MONGO_URI. ' +
            'In Atlas: Database Access → edit the user, or reset its password.';
    }
    if (/could not connect to any servers|server selection timed out/i.test(err?.message ?? '')) {
        return 'Cannot reach the cluster — check the Atlas IP Access List ' +
            '(add Render\'s outbound IPs or 0.0.0.0/0), and that MONGO_URI has no typo.';
    }
    if (/getaddrinfo|ENOTFOUND|EAI_AGAIN/i.test(err?.message ?? '')) {
        return 'DNS lookup failed — a temporary resolver problem. Retrying.';
    }
    return null;
}

/**
 * Retries before giving up. An Atlas free cluster parks itself when idle
 * and the first connection that wakes it can take tens of seconds, so a
 * single failed attempt should not kill the process — otherwise nodemon
 * just crash-loops and the API stops answering entirely.
 */
export async function connectDB() {
    if (!env.mongoUri) {
        console.warn('MONGO_URI is not set — skipping DB connection for now.');
        return;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
            await mongoose.connect(env.mongoUri, {
                serverSelectionTimeoutMS: 10000,
                // Fail fast on a dead socket instead of hanging a request that
                // will never come back. The driver default is 30s.
                socketTimeoutMS: 45000,
            });
            console.info('MongoDB connected');
            return;
        } catch (err) {
            const retryable = isRetryable(err);

            console.error(
                `MongoDB connection failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message}`,
            );

            const hint = explain(err);
            if (hint) console.error(`  -> ${hint}`);

            if (!retryable) {
                console.error('This will not fix itself. Stopping immediately.');
                process.exit(1);
            }

            if (attempt === MAX_ATTEMPTS) {
                console.error('Giving up. Check your network, DNS, and the Atlas IP access list.');
                process.exit(1);
            }

            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
}
