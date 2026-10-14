import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import User from './user.model.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';
import { asScalar } from '../../middleware/sanitize.js';
import { signToken, signTwoFactorTicket, verifyToken } from '../../config/jwt.js';
import { env } from '../../config/env.js';
import {
    assertValidEmail,
    normalizeEmail,
    toCanonicalEmail,
    isDuplicateKeyError,
    DUPLICATE_EMAIL_MESSAGE,
} from '../../utils/emailValidation.js';
import { generateRawToken, hashToken } from '../../utils/tokens.js';
import { sendPasswordResetEmail } from './passwordReset.email.js';
import { sendVerificationEmail } from './verification.email.js';

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_REFRESH_SESSIONS = 5;

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;

const ABSENT_ACCOUNT_HASH = '$2b$12$BIWIrCeX0x9vxl0fP0Xj0ORzD3M/U63GHE3aVDDDOjhe/O1Ta3PVu';

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

const TOTP_ISSUER = 'TECH-U Fashion Store';
const RECOVERY_CODE_COUNT = 10;

/**
 * Verifies a TOTP code, treating a malformed one as simply wrong.
 *
 * otplib throws (TokenLengthError) on anything that is not six digits, and the
 * same field also accepts a twelve-character recovery code, so a thrown error
 * here would surface as a 500 instead of "that code is not correct".
 */
async function verifyTotp(secret, token) {
    try {
        return (await verify({ secret, token, epochTolerance: 30 })).valid;
    } catch {
        return false;
    }
}

async function recordFailedLogin(user) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const update = { failedLoginAttempts: attempts };
    if (attempts >= MAX_LOGIN_ATTEMPTS) update.lockUntil = new Date(Date.now() + LOGIN_LOCK_MS);

    await User.updateOne({ _id: user._id }, { $set: update });
}

function baseCookieOptions(path) {
    const isProd = env.nodeEnv === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path,
    };
}

const ACCESS_COOKIE_PATH = '/';
// Scoped to the auth routes: the refresh cookie is only ever sent to
// /auth/refresh and /auth/logout, so an XSS on any other page cannot quietly
// use it to mint new access tokens.
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function sendTokenCookie(res, token) {
    res.cookie('token', token, { ...baseCookieOptions(ACCESS_COOKIE_PATH), maxAge: ACCESS_COOKIE_MAX_AGE });
}

function clearTokenCookie(res) {
    res.clearCookie('token', baseCookieOptions(ACCESS_COOKIE_PATH));
}

function sendRefreshCookie(res, rawToken) {
    res.cookie('refresh_token', rawToken, {
        ...baseCookieOptions(REFRESH_COOKIE_PATH),
        maxAge: REFRESH_TOKEN_TTL_MS,
    });
}

function clearRefreshCookie(res) {
    res.clearCookie('refresh_token', baseCookieOptions(REFRESH_COOKIE_PATH));
}

/** Stores the SHA-256 of a fresh refresh token and sets the cookie. */
async function issueRefreshToken(res, user) {
    const rawToken = generateRawToken();
    await User.updateOne(
        { _id: user._id },
        {
            $push: {
                refreshTokens: {
                    $each: [
                        { tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
                    ],
                    $slice: -MAX_REFRESH_SESSIONS,
                },
            },
        },
    );
    sendRefreshCookie(res, rawToken);
}

/** Starts a full session: short-lived access cookie plus a rotating refresh. */
async function startSession(res, user) {
    sendTokenCookie(res, signToken(user));
    await issueRefreshToken(res, user);
}

function publicUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        isEmailVerified: user.isEmailVerified === true,
        pendingEmail: user.pendingEmail,
        twoFactorEnabled: user.twoFactorEnabled === true,
    };
}

export const register = catchAsync(async (req, res, next) => {
    const { name, phone, password } = req.body;
    const email = await assertValidEmail(req.body.email);

    const canonical = toCanonicalEmail(email);
    if (await User.exists({ canonicalEmail: canonical })) {
        return next(new AppError(DUPLICATE_EMAIL_MESSAGE, 409));
    }

    const rawVerifyToken = generateRawToken();

    try {
        const user = await User.create({
            name,
            email,
            phone,
            password,
            emailVerificationToken: hashToken(rawVerifyToken),
            emailVerificationExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
        });

        await startSession(res, user);

        // After the reply, like the reset mail: awaiting the transport here
        // would make registration slower than it needs to be, and the function
        // reports its own failures to the log.
        sendVerificationEmail({ to: user.email, name: user.name, rawToken: rawVerifyToken });

        res.status(201).json({ success: true, data: publicUser(user) });
    } catch (err) {
        if (isDuplicateKeyError(err)) {
            return next(new AppError(DUPLICATE_EMAIL_MESSAGE, 409));
        }
        throw err;
    }
});

export const login = catchAsync(async (req, res, next) => {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    const user = await User.findOne({ email }).select(
        '+password +tokenVersion +failedLoginAttempts +lockUntil',
    );

    if (user?.lockUntil && user.lockUntil > new Date()) {
        return next(new AppError('Too many failed attempts. Please try again in a few minutes.', 429));
    }

    const passwordOk = user
        ? await user.comparePassword(password)
        : await bcrypt.compare(password, ABSENT_ACCOUNT_HASH);

    if (!user || !passwordOk) {
        if (user) await recordFailedLogin(user);
        return next(new AppError('Incorrect email or password', 401));
    }

    if (user.isActive === false) {
        return next(new AppError('This account has been suspended. Please contact support.', 403));
    }

    if (user.failedLoginAttempts || user.lockUntil) {
        await User.updateOne(
            { _id: user._id },
            { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: '' } },
        );
    }

    // With 2FA on, a correct password only earns a short ticket. The session is
    // not created until a valid code is supplied.
    if (user.twoFactorEnabled) {
        return res.json({
            success: true,
            data: { twoFactorRequired: true, ticket: signTwoFactorTicket(user) },
        });
    }

    await startSession(res, user);
    res.json({ success: true, data: publicUser(user) });
});

/**
 * POST /auth/2fa/authenticate â€” completes a login that stopped at the code.
 *
 * The ticket carries no session; it only proves the password step. A valid
 * TOTP code (or an unused recovery code) turns it into a real session.
 */
export const authenticateTwoFactor = catchAsync(async (req, res, next) => {
    const { ticket, code } = req.body;

    let decoded;
    try {
        decoded = verifyToken(ticket);
    } catch {
        return next(new AppError('Your verification session expired. Please log in again.', 401));
    }
    if (decoded.scope !== '2fa') {
        return next(new AppError('Invalid verification session. Please log in again.', 401));
    }

    const user = await User.findById(decoded.id).select(
        '+tokenVersion +twoFactorSecret +twoFactorRecoveryCodes',
    );
    if (!user || !user.twoFactorEnabled) {
        return next(new AppError('Invalid verification session. Please log in again.', 401));
    }
    if (user.isActive === false) {
        return next(new AppError('This account has been suspended. Please contact support.', 403));
    }

    let accepted = await verifyTotp(user.twoFactorSecret, code);
    let usedRecoveryCode = false;

    if (!accepted && Array.isArray(user.twoFactorRecoveryCodes)) {
        const hashed = hashToken(String(code).trim());
        if (user.twoFactorRecoveryCodes.includes(hashed)) {
            accepted = true;
            usedRecoveryCode = true;
            // Single-use: an observed recovery code is worth nothing after this.
            user.twoFactorRecoveryCodes = user.twoFactorRecoveryCodes.filter((c) => c !== hashed);
        }
    }

    if (!accepted) {
        return next(new AppError('That code is not correct. Please try again.', 401));
    }

    if (usedRecoveryCode) await user.save({ validateBeforeSave: false });

    await startSession(res, user);
    res.json({ success: true, data: publicUser(user) });
});

/**
 * POST /auth/refresh â€” trades a valid refresh cookie for a new access cookie.
 *
 * Rotation: the presented token is deleted first, then a fresh one is issued.
 * Replaying a stolen refresh token therefore fails, because its hash is gone.
 */
export const refresh = catchAsync(async (req, res, next) => {
    const rawToken = req.cookies.refresh_token;
    if (!rawToken) {
        return next(new AppError('Your session has ended. Please log in again.', 401));
    }

    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({ 'refreshTokens.tokenHash': tokenHash }).select(
        '+tokenVersion +refreshTokens',
    );
    if (!user) {
        return next(new AppError('Your session has ended. Please log in again.', 401));
    }

    const entry = user.refreshTokens.find((t) => t.tokenHash === tokenHash);
    await User.updateOne({ _id: user._id }, { $pull: { refreshTokens: { tokenHash } } });

    if (!entry || entry.expiresAt < new Date()) {
        return next(new AppError('Your session has ended. Please log in again.', 401));
    }
    if (user.isActive === false) {
        return next(new AppError('This account has been suspended. Please contact support.', 403));
    }

    await startSession(res, user);
    res.json({ success: true, data: publicUser(user) });
});

/**
 * POST /auth/verify-email â€” consumes the emailed token.
 *
 * One endpoint serves both signup confirmation and an email change; it decides
 * which by which stored hash matches.
 */
export const verifyEmail = catchAsync(async (req, res, next) => {
    const hashed = hashToken(req.body.token);

    const user = await User.findOne({
        $or: [{ emailVerificationToken: hashed }, { pendingEmailToken: hashed }],
    }).select('+emailVerificationToken +emailVerificationExpires +pendingEmailToken +pendingEmailExpires');

    if (!user) {
        return next(new AppError('This confirmation link is invalid or has already been used.', 400));
    }

    const isSignup = user.emailVerificationToken === hashed;
    const expiresAt = isSignup ? user.emailVerificationExpires : user.pendingEmailExpires;

    if (!expiresAt || expiresAt < new Date()) {
        return next(new AppError('This confirmation link has expired. Please request a new one.', 400));
    }

    if (isSignup) {
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
    } else {
        user.email = user.pendingEmail;
        user.pendingEmail = undefined;
        user.pendingEmailToken = undefined;
        user.pendingEmailExpires = undefined;
        user.isEmailVerified = true;
    }

    // Full save (not validateBeforeSave:false): changing the email has to run
    // the pre-validate hook so canonicalEmail is recomputed.
    await user.save();

    res.json({ success: true, data: publicUser(user) });
});

/** POST /auth/resend-verification â€” sends a fresh signup confirmation. */
export const resendVerification = catchAsync(async (req, res) => {
    if (req.user.isEmailVerified) {
        return res.json({ success: true, data: { message: 'Your email is already confirmed.' } });
    }

    const rawToken = generateRawToken();
    req.user.emailVerificationToken = hashToken(rawToken);
    req.user.emailVerificationExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
    await req.user.save({ validateBeforeSave: false });

    sendVerificationEmail({ to: req.user.email, name: req.user.name, rawToken });

    res.json({
        success: true,
        data: { message: 'Confirmation email sent. Check your inbox.' },
    });
});

/**
 * PATCH /auth/me/email â€” asks to move the account to a new address.
 *
 * The change is held as pendingEmail and never applied until the NEW address
 * clicks its link, so a typo cannot lock the owner out, and a stolen session
 * still needs the current password to start the change.
 */
export const changeEmail = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return next(new AppError('User not found', 404));

    if (!(await user.comparePassword(req.body.password))) {
        return next(new AppError('Your password is incorrect', 401));
    }

    const email = await assertValidEmail(req.body.email);
    if (email === user.email) {
        return next(new AppError('That is already your email address', 400));
    }

    const canonical = toCanonicalEmail(email);
    if (await User.exists({ canonicalEmail: canonical, _id: { $ne: user._id } })) {
        return next(new AppError(DUPLICATE_EMAIL_MESSAGE, 409));
    }

    const rawToken = generateRawToken();
    user.pendingEmail = email;
    user.pendingEmailToken = hashToken(rawToken);
    user.pendingEmailExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
    await user.save({ validateBeforeSave: false });

    sendVerificationEmail({ to: email, name: user.name, rawToken });

    res.json({ success: true, data: publicUser(user) });
});

/** POST /auth/2fa/setup â€” mints a secret and a QR the app can scan. Not yet on. */
export const setupTwoFactor = catchAsync(async (req, res) => {
    const secret = generateSecret();
    await User.updateOne({ _id: req.user._id }, { $set: { twoFactorSecret: secret } });

    const otpauthUrl = generateURI({ issuer: TOTP_ISSUER, label: req.user.email, secret });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    res.json({ success: true, data: { secret, otpauthUrl, qrDataUrl } });
});

/** POST /auth/2fa/enable â€” confirms the secret with a code and switches 2FA on. */
export const enableTwoFactor = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user?.twoFactorSecret) {
        return next(new AppError('Start the two-factor setup first.', 400));
    }

    const valid = await verifyTotp(user.twoFactorSecret, req.body.code);
    if (!valid) {
        return next(new AppError('That code is not correct. Try the next one.', 400));
    }

    const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
        crypto.randomBytes(6).toString('hex'),
    );

    user.twoFactorEnabled = true;
    user.twoFactorRecoveryCodes = recoveryCodes.map(hashToken);
    await user.save({ validateBeforeSave: false });

    // Plaintext recovery codes exist only in this response.
    res.json({ success: true, data: { recoveryCodes } });
});

/** POST /auth/2fa/disable â€” re-authenticates, then turns 2FA off. */
export const disableTwoFactor = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id).select(
        '+password +twoFactorSecret +twoFactorRecoveryCodes',
    );
    if (!user) return next(new AppError('User not found', 404));

    if (!(await user.comparePassword(req.body.password))) {
        return next(new AppError('Your password is incorrect', 401));
    }
    if (!user.twoFactorEnabled) {
        return next(new AppError('Two-factor authentication is not enabled.', 400));
    }

    let accepted = await verifyTotp(user.twoFactorSecret, req.body.code);
    if (!accepted && Array.isArray(user.twoFactorRecoveryCodes)) {
        accepted = user.twoFactorRecoveryCodes.includes(hashToken(String(req.body.code).trim()));
    }
    if (!accepted) {
        return next(new AppError('That code is not correct.', 400));
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorRecoveryCodes = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, data: publicUser(user) });
});

export const forgotPassword = catchAsync(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const canonical = toCanonicalEmail(email);

    const user = await User.findOne({ $or: [{ email }, { canonicalEmail: canonical }] });

    if (user) {
        const rawToken = generateRawToken();
        user.passwordResetToken = hashToken(rawToken);
        user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
        await user.save({ validateBeforeSave: false });

        sendPasswordResetEmail({ to: user.email, name: user.name, rawToken });
    }

    res.json({
        success: true,
        data: {
            message:
                'If an account exists for that email, a password reset link is on its way. It expires in 15 minutes.',
        },
    });
});

export const resetPassword = catchAsync(async (req, res, next) => {
    const { token, password } = req.body;

    const user = await User.findOne({
        passwordResetToken: hashToken(token),
        passwordResetExpires: { $gt: new Date() },
    }).select('+tokenVersion');
    if (!user) {
        return next(
            new AppError(
                'This reset link is invalid or has expired. Please request a new one.',
                400,
            ),
        );
    }

    user.password = password; // hashed by the pre('save') hook
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    // A reset proves the mailbox, so every other session is retired before a
    // fresh one is handed to this browser.
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
    await startSession(res, user);

    res.json({ success: true, data: publicUser(user) });
});

export const logout = catchAsync(async (req, res) => {
    // Bumping tokenVersion retires every access token at once; the refresh
    // token this browser holds is deleted so it cannot mint a new one.
    if (req.user) {
        await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    }

    const rawToken = req.cookies.refresh_token;
    if (rawToken) {
        const tokenHash = hashToken(rawToken);
        await User.updateOne(
            { 'refreshTokens.tokenHash': tokenHash },
            { $pull: { refreshTokens: { tokenHash } } },
        );
    }

    clearTokenCookie(res);
    clearRefreshCookie(res);
    res.json({ success: true, data: null });
});

export const getMe = catchAsync(async (req, res) => {
    res.json({ success: true, data: publicUser(req.user) });
});

export const updateProfile = catchAsync(async (req, res, next) => {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
        returnDocument: 'after',
        runValidators: true,
    });

    if (!user) return next(new AppError('User not found', 404));

    res.json({ success: true, data: publicUser(user) });
});

export const changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, password } = req.body;

    const user = await User.findById(req.user._id).select('+password +tokenVersion');
    if (!user) return next(new AppError('User not found', 404));

    if (!(await user.comparePassword(currentPassword))) {
        return next(new AppError('Your current password is incorrect', 401));
    }

    user.password = password; // hashed by the pre('save') hook
    await user.save();

    // Other devices lose their refresh tokens; this one gets a fresh pair.
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
    await startSession(res, user);

    res.json({ success: true, data: publicUser(user) });
});

/** PATCH /api/v1/auth/users/:id/role â€” admin-only, promotes or demotes a user. */
export const updateUserRole = catchAsync(async (req, res, next) => {
    const { role } = req.body;

    if (req.params.id === String(req.user._id)) {
        return next(new AppError('You cannot change your own role', 400));
    }
    const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { returnDocument: 'after', runValidators: true },
    );

    if (!user) return next(new AppError('User not found', 404));

    res.json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

export const updateUserStatus = catchAsync(async (req, res, next) => {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
        return next(new AppError('isActive must be true or false', 400));
    }

    if (req.params.id === String(req.user._id)) {
        return next(new AppError('You cannot suspend your own account', 400));
    }

    if (!isActive) {
        const target = await User.findById(req.params.id).select('role');
        if (!target) return next(new AppError('User not found', 404));

        if (target.role === 'admin') {
            const otherAdmins = await User.countDocuments({
                role: 'admin',
                isActive: { $ne: false },
                _id: { $ne: target._id },
            });
            if (otherAdmins === 0) {
                return next(
                    new AppError('Cannot suspend the last active admin. Promote someone else first.', 409),
                );
            }
        }
    }

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { returnDocument: 'after', runValidators: true },
    );

    if (!user) return next(new AppError('User not found', 404));

    res.json({
        success: true,
        data: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
        },
    });
});

export const getAllUsers = catchAsync(async (req, res) => {
    const page = Math.max(1, Number(req.safeQuery.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.safeQuery.limit) || 20), 100);
    const filter = {};

    if (req.safeQuery.search) {
        const term = String(req.safeQuery.search)
            .slice(0, 50)
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
            { name: { $regex: term, $options: 'i' } },
            { email: { $regex: term, $options: 'i' } },
        ];
    }
    const role = asScalar(req.safeQuery.role);
    if (role) {
        filter.role = role;
    }

    const [users, total] = await Promise.all([
        User.find(filter)
            .select('name email role isActive createdAt')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(limit),
        User.countDocuments(filter),
    ]);

    res.json({ success: true, data: users, meta: { total, page, limit } });
});

