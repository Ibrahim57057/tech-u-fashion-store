import 'dotenv/config';

function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

// Comma-separated list, so a preview or a second dev server on another port
// can be allowed without loosening CORS everywhere: CLIENT_URL=https://a.com,https://b.com
const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const nodeEnv = process.env.NODE_ENV || 'development';

// Fail fast in production rather than starting up in a quietly broken state.
//
// Every secret below used to default to '' and nothing checked, so a deploy
// that forgot NODE_ENV=production ran with `secure: false` on the session
// cookie (sent over plain HTTP), CORS open to any localhost origin, and no
// JWT secret — where jsonwebtoken only fails later, at the first login, as a
// 500. A refused start is a much better outcome than a quietly unsafe one.
//
// Development and test keep the permissive defaults on purpose: a contributor
// should be able to `npm run dev` with nothing configured.
if (nodeEnv === 'production') {
    required('MONGO_URI');
    required('JWT_SECRET');
    required('CLIENT_URL');
    required('PAYSTACK_SECRET_KEY');
    required('RESEND_API_KEY');

    if (process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters in production');
    }

    if (clientUrls.some((url) => url.includes('localhost') || url.includes('127.0.0.1'))) {
        throw new Error('CLIENT_URL points at localhost — set it to the real storefront origin');
    }
}

export const env = {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: Number(process.env.PORT) || 4000,
    clientUrl: clientUrls[0],
    clientUrls,
    mongoUri: process.env.MONGO_URI || '',
    jwtSecret: process.env.JWT_SECRET || '',
    paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
};
export { required };