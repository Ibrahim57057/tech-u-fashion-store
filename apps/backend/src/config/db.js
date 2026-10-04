import mongoose from 'mongoose';
import { env } from './env.js';

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000;

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
            await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
            console.info('MongoDB connected');
            return;
        } catch (err) {
            console.error(
                `MongoDB connection failed (attempt ${attempt}/${MAX_ATTEMPTS}):`,
                err.message,
            );

            if (attempt === MAX_ATTEMPTS) {
                console.error('Giving up. Check your network, DNS, and the Atlas IP access list.');
                process.exit(1);
            }

            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
}
