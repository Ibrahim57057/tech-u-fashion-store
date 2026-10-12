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

// Production fails fast at startup rather than running quietly broken: every
// secret used to default to '' and nothing checked. Dev keeps permissive
// defaults so `npm run dev` works with no configuration.
if (nodeEnv === 'production') {
    required('MONGO_URI');
    required('CLIENT_URL');
    required('PAYSTACK_SECRET_KEY');

    // Require exactly one mail transport: SMTP, or Resend.
    const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    if (!process.env.RESEND_API_KEY && !smtpConfigured) {
        throw new Error('Set RESEND_API_KEY, or SMTP_HOST + SMTP_USER + SMTP_PASS, for email in production');
    }
    if (smtpConfigured && !process.env.MAIL_FROM) {
        throw new Error('MAIL_FROM is required when sending over SMTP, e.g. "TECH-U Fashion Store <noreply@yourdomain.com>"');
    }

    const jwtSecret = required('JWT_SECRET');

    // Catch stray whitespace/quotes in pasted values before they fail later as a mystery 500.
    if (jwtSecret !== jwtSecret.trim() || /^["'].*["']$/.test(jwtSecret)) {
        throw new Error(
            'JWT_SECRET has surrounding whitespace or quotes. Paste the raw value with no ' +
                'leading/trailing space and no wrapping quotes.',
        );
    }

    // Minimum HS256 key size is 256 bits (32 characters).
    if (jwtSecret.length < 32) {
        throw new Error(
            `JWT_SECRET must be at least 32 characters in production (got ${jwtSecret.length}). ` +
                'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
        );
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
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpSecure: process.env.SMTP_SECURE === 'true',
    mailFrom: process.env.MAIL_FROM || '',
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
};
export { required };