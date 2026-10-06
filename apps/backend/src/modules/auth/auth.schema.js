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

export const updateRoleSchema = z.object({
    role: z.enum(['customer', 'staff', 'admin']),
});

// Strict, so a stray `isActive: "false"` string cannot be stored as a truthy
// value that silently keeps the account active.
export const updateStatusSchema = z.object({
    isActive: z.boolean(),
});