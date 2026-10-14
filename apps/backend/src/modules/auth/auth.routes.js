import { Router } from 'express';
import { protect, restrictTo, optionalAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
    forgotPasswordLimiter,
    resetPasswordLimiter,
    changePasswordLimiter,
    verificationLimiter,
    twoFactorLimiter,
    refreshLimiter,
} from '../../middleware/rateLimiters.js';
import {
    register,
    login,
    logout,
    refresh,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    getMe,
    updateProfile,
    changeEmail,
    changePassword,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    authenticateTwoFactor,
    getAllUsers,
    updateUserRole,
    updateUserStatus,
} from './auth.controller.js';
import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema,
    changeEmailSchema,
    changePasswordSchema,
    verifyEmailSchema,
    twoFactorCodeSchema,
    twoFactorDisableSchema,
    twoFactorAuthenticateSchema,
    updateRoleSchema,
    updateStatusSchema,
} from './auth.schema.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', optionalAuth, logout);
router.post('/refresh', refreshLimiter, refresh);

router.get('/me', protect, getMe);

router.patch('/me', protect, validate(updateProfileSchema), updateProfile);
router.patch('/me/email', protect, verificationLimiter, validate(changeEmailSchema), changeEmail);
router.patch(
    '/me/password',
    protect,
    changePasswordLimiter,
    validate(changePasswordSchema),
    changePassword,
);

router.post('/verify-email', verificationLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', protect, verificationLimiter, resendVerification);

router.post('/2fa/authenticate', twoFactorLimiter, validate(twoFactorAuthenticateSchema), authenticateTwoFactor);
router.post('/2fa/setup', protect, setupTwoFactor);
router.post('/2fa/enable', protect, validate(twoFactorCodeSchema), enableTwoFactor);
router.post('/2fa/disable', protect, validate(twoFactorDisableSchema), disableTwoFactor);

// Public and unauthenticated by design, so both are rate-limited and neither
// reveals whether the address has an account.
router.post(
    '/forgot-password',
    forgotPasswordLimiter,
    validate(forgotPasswordSchema),
    forgotPassword,
);
router.post(
    '/reset-password',
    resetPasswordLimiter,
    validate(resetPasswordSchema),
    resetPassword,
);
router.get('/users', protect, restrictTo('admin'), getAllUsers);

router.patch('/users/:id/role', protect, restrictTo('admin'), validate(updateRoleSchema), updateUserRole);
router.patch(
    '/users/:id/status',
    protect,
    restrictTo('admin'),
    validate(updateStatusSchema),
    updateUserStatus,
);

export default router;
