import { z } from 'zod';
import { emailField } from '../../utils/emailSchema.js';

export const registerSchema = z.object({
    name: z.string().min(2, 'Name is too short').max(100),
    email: emailField,
    phone: z
        .string()
        .regex(/^(\+234|0)[7-9][01]\d{8}$/, 'Enter a valid Nigerian phone number'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
    email: emailField,
    password: z.string().min(1, 'Password is required'),
});

/**
 * Step one of the reset. Only asks for the address, and the controller
 * answers identically whether or not an account exists — the response must
 * not be a way to test which addresses have accounts here.
 */
export const forgotPasswordSchema = z.object({
    email: emailField,
});

/**
 * Step two, from the emailed link.
 *
 * `token` is capped so a fuzzed value cannot be passed through to the
 * SHA-256 comparison unbounded. confirmPassword is checked here as well as in
 * the browser: client-side checks are a courtesy, not an enforcement, and the
 * API is reachable without the form.
 */
export const resetPasswordSchema = z
    .object({
        token: z.string().min(32, 'This reset link is not valid').max(128),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(1, 'Confirm your password'),
    })
    .refine((data) => data.confirmPassword === data.password, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

/**
 * Editing your own details from the account page.
 *
 * Only name and phone — the two fields a customer can change without
 * proving anything they have not already proved by being signed in. Email is
 * excluded on purpose: it is the login identifier and carries a unique index,
 * so changing it needs a re-verification flow (confirm the new address owns
 * the mailbox, keep the old one reachable meanwhile) that does not exist yet.
 * Allowing it here would silently break the account if the new address was
 * mistyped.
 *
 * Both fields are optional but at least one is required, so an empty PATCH is
 * rejected instead of quietly doing nothing.
 */
export const updateProfileSchema = z
    .object({
        name: z.string().min(2, 'Name is too short').max(100).optional(),
        phone: z
            .string()
            .regex(/^(\+234|0)[7-9][01]\d{8}$/, 'Enter a valid Nigerian phone number')
            .optional(),
    })
    .refine((data) => data.name !== undefined || data.phone !== undefined, {
        message: 'Nothing to update',
    });

/**
 * Changing the password while signed in.
 *
 * currentPassword is required so a stolen session cookie alone cannot lock the
 * real owner out of their account — the attacker would still need the old
 * password.
 */
export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Your current password is required'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(1, 'Confirm your new password'),
    })
    .refine((data) => data.confirmPassword === data.password, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

export const verifyEmailSchema = z.object({
    token: z.string().min(32, 'This link is not valid').max(128),
});

/**
 * Moving the account to a new address. The current password is required
 * because the email is the login identifier: a stolen session alone must not
 * be able to redirect the account's recovery address.
 */
export const changeEmailSchema = z.object({
    email: emailField,
    password: z.string().min(1, 'Your password is required'),
});

export const twoFactorCodeSchema = z.object({
    code: z.string().trim().min(6, 'Enter the 6-digit code').max(20),
});

export const twoFactorDisableSchema = z.object({
    password: z.string().min(1, 'Your password is required'),
    code: z.string().trim().min(6, 'Enter a code').max(20),
});

export const twoFactorAuthenticateSchema = z.object({
    ticket: z.string().min(1),
    code: z.string().trim().min(6, 'Enter the 6-digit code').max(20),
});

export const updateRoleSchema = z.object({
    role: z.enum(['customer', 'staff', 'admin']),
});

// Strict, so a stray `isActive: "false"` string cannot be stored as a truthy
// value that silently keeps the account active.
export const updateStatusSchema = z.object({
    isActive: z.boolean(),
});