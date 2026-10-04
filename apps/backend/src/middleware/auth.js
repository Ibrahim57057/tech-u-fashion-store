import User from '../modules/auth/user.model.js';
import { catchAsync } from './catchAsync.js';
import { AppError } from './errorHandler.js';
import { verifyToken } from '../config/jwt.js';

export const protect = catchAsync(async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return next(new AppError('You are not logged in. Please log in to continue.', 401));
    }

    let decoded;
    try {
        decoded = verifyToken(token);
    } catch {
        return next(new AppError('Invalid or expired session. Please log in again.', 401));
    }

    const user = await User.findById(decoded.id);
    if (!user) {
        return next(new AppError('The user for this session no longer exists.', 401));
    }

    // A suspended account is refused here, not only at login. The token in the
    // cookie is still cryptographically valid after an admin suspends the user,
    // so without this the account would keep full access until the token
    // expired. This is also why the lookup cannot be cached.
    if (user.isActive === false) {
        return next(new AppError('This account has been suspended. Please contact support.', 403));
    }

    req.user = user;
    next();
});

/**
 * Like protect, but never blocks. Used where guests are allowed
 * (checkout): if a valid session exists we attach req.user, otherwise
 * the request simply continues as a guest.
 */
export const optionalAuth = catchAsync(async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return next();

    try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id);
        if (user) req.user = user;
    } catch {
        // Bad or expired token: treat as a guest instead of failing.
    }
    next();
});

export function restrictTo(...allowedRoles) {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action.', 403));
        }
        next();
    };
}