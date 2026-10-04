import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // One throwaway database for the whole suite instead of one per file.
        globalSetup: './src/test/globalSetup.js',
        // mongod takes roughly a minute to accept connections on this
        // machine, and that startup happens inside the test hooks.
        hookTimeout: 180_000,
        testTimeout: 30_000,
        // Every suite shares that single database, so files must not run
        // concurrently — one file's cleanup could wipe another's rows.
        fileParallelism: false,
        // Keeps the suite hermetic and fast: no test should depend on a live
        // DNS round-trip to Gmail. The tests that are specifically about
        // domain resolution ask for it explicitly.
        env: { EMAIL_VERIFY_DNS: 'false' },
    },
});