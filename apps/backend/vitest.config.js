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
        //
        // The mail variables are blanked for the same reason: a developer with
        // real credentials in .env would otherwise have the suite fire real
        // messages (registration and order confirmations both send), which is
        // slow, non-deterministic and rude to the provider. dotenv does not
        // overwrite keys that already exist, so setting them here wins.
        env: {
            EMAIL_VERIFY_DNS: 'false',
            RESEND_API_KEY: '',
            SMTP_HOST: '',
            SMTP_USER: '',
            SMTP_PASS: '',
        },
    },
});