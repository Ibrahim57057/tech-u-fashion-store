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

export const updateRoleSchema = z.object({
    role: z.enum(['customer', 'staff', 'admin']),
});

// Strict, so a stray `isActive: "false"` string cannot be stored as a truthy
// value that silently keeps the account active.
export const updateStatusSchema = z.object({
    isActive: z.boolean(),
});