import User from './user.model.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';
import { signToken } from '../../config/jwt.js';
import { env } from '../../config/env.js';
import {
    assertValidEmail,
    normalizeEmail,
    toCanonicalEmail,
    isDuplicateKeyError,
    DUPLICATE_EMAIL_MESSAGE,
} from '../../utils/emailValidation.js';

// Sends the token as an httpOnly cookie — JavaScript in the browser
// can't read it (protecting against XSS stealing it), but the browser
// automatically sends it back on every request to our API.
function sendTokenCookie(res, token) {
    const isProd = env.nodeEnv === 'production';
    res.cookie('token', token, {
        httpOnly: true,
        secure: isProd, // SameSite: 'none' requires Secure, browsers reject it otherwise
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
}

/**
 * The user object we hand to the browser.
 *
 * `role` has to be in here. The frontend decides whether to show the admin
 * link from user.role, so omitting it from the register and login responses
 * meant the admin link vanished the moment you signed in and only reappeared
 * after a full page refresh, when /auth/me got a chance to supply the role.
 */
function publicUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
    };
}

export const register = catchAsync(async (req, res, next) => {
    const { name, phone, password } = req.body;

    // Rejects malformed addresses, known typo domains like gamil.com, and
    // domains with no mail servers at all.
    const email = await assertValidEmail(req.body.email);

    // Checked on the canonical form, so John.Doe@gmail.com cannot slip past
    // the johndoe@gmail.com account that already exists.
    const canonical = toCanonicalEmail(email);
    if (await User.exists({ canonicalEmail: canonical })) {
        return next(new AppError(DUPLICATE_EMAIL_MESSAGE, 409));
    }

    try {
        const user = await User.create({ name, email, phone, password });
        const token = signToken(user._id);
        sendTokenCookie(res, token);

        res.status(201).json({ success: true, data: publicUser(user) });
    } catch (err) {
        // Two people can submit the same address in the same instant and both
        // pass the check above. The database has the final say, so translate
        // its verdict into the same friendly 409 rather than a 500.
        if (isDuplicateKeyError(err)) {
            return next(new AppError(DUPLICATE_EMAIL_MESSAGE, 409));
        }
        throw err;
    }
});

export const login = catchAsync(async (req, res, next) => {
    const { password } = req.body;

    // Normalised so signing in as "Ismail@Gmail.com" finds the stored
    // "ismail@gmail.com" instead of reporting a wrong password.
    const email = normalizeEmail(req.body.email);

    // .select('+password') overrides the schema's select: false, just
    // for this one query, since we genuinely need it here to compare.
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    // Checked after the password compare on purpose. A suspended account must
    // still be told "incorrect password" for a wrong password, so this cannot
    // become an oracle for which addresses have accounts.
    if (user.isActive === false) {
        return next(new AppError('This account has been suspended. Please contact support.', 403));
    }

    const token = signToken(user._id);
    sendTokenCookie(res, token);

    res.json({ success: true, data: publicUser(user) });
});

export const logout = catchAsync(async (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, data: null });
});

export const getMe = catchAsync(async (req, res) => {
    // req.user is attached by the `protect` middleware (next file) —
    // by the time this runs, we already know the request is authenticated.
    res.json({ success: true, data: req.user });
});

/** PATCH /api/v1/auth/users/:id/role — admin-only, promotes or demotes a user. */
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

/**
 * PATCH /api/v1/auth/users/:id/status — admin-only, suspends or reinstates an
 * account. This is the "remove a customer" action that does not exist as a
 * delete, and deliberately so: Order.user is a real reference, so deleting the
 * user would orphan every order they ever placed.
 *
 * Guards worth noting:
 *  - an admin cannot suspend themselves, which is the usual way a store ends
 *    up with exactly one admin and nobody able to undo it;
 *  - the last remaining active admin cannot be suspended, for the same reason.
 */
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

/**
 * GET /api/v1/auth/users — admin-only, lists everyone for the Users page.
 *
 * Paginated like the rest of the admin lists. This used to return every
 * account in the collection at once, which grows without limit and meant a
 * single request had to load the full user table into memory and over the
 * wire. `meta.total` drives the pager.
 */
export const getAllUsers = catchAsync(async (req, res) => {
    const page = Math.max(1, Number(req.safeQuery.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.safeQuery.limit) || 20), 100);
    const filter = {};

    if (req.safeQuery.search) {
        // Escaped for the same reason the admin order search is: unescaped,
        // `?search=` reaches the regex engine verbatim.
        const term = String(req.safeQuery.search)
            .slice(0, 50)
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
            { name: { $regex: term, $options: 'i' } },
            { email: { $regex: term, $options: 'i' } },
        ];
    }
    if (req.safeQuery.role) {
        filter.role = req.safeQuery.role;
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