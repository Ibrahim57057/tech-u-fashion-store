import { z } from 'zod';
import { emailField } from '../../utils/emailSchema.js';

export const createMessageSchema = z.object({
    name: z.string().trim().min(2, 'Tell us your name').max(80),
    email: emailField,
    subject: z.string().trim().max(120).optional(),
    message: z.string().trim().min(10, 'Please write a little more so we can help').max(2000),
});

export const updateMessageSchema = z.object({
    status: z.enum(['new', 'read', 'replied']),
});