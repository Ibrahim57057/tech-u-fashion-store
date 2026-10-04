import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

/**
 * Starts one throwaway MongoDB for the entire test suite and hands its URI
 * to the test files via `inject('mongoUri')`.
 *
 * Two reasons this is global rather than per-file:
 *  1. Starting mongod takes ~60s here, so doing it once instead of once per
 *     file keeps `npm test` bearable.
 *  2. The suites clean up collections they use, and a shared instance keeps
 *     that coordination simple (vitest.config.js disables file parallelism).
 *
 * Standalone, deliberately. A single-node replica set would also allow the
 * transaction in createOrder to run under test, but on this machine mongod
 * kept dying mid-suite with ECONNRESET, which is a far worse trade than the
 * coverage it buys. Production is Atlas, a real replica set, so the
 * transactional path is exercised for real when the app runs.
 *
 * This is always a fresh, empty, in-memory database — your real Atlas data is
 * never involved.
 */
export default async function setup({ provide }) {
    mongod = await MongoMemoryServer.create({
        instance: {
            // The library default is 10s, which is far too short on this
            // machine. Without this the suite dies with
            // "Instance failed to start within 10000ms".
            launchTimeout: 180_000,
        },
    });

    provide('mongoUri', mongod.getUri());
}

export async function teardown() {
    if (mongod) await mongod.stop();

    // Note: vitest still prints "something prevents Vite server from exiting"
    // and "close timed out after 10000ms" after the run. The hanging-process
    // reporter shows ~40 FILEHANDLEs, i.e. Vite's own source watcher, not
    // mongod. Every test passes and mongod is stopped, so it is cosmetic.
}