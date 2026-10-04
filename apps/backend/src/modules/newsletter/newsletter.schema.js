import { z } from 'zod';
import { emailField } from '../../utils/emailSchema.js';

export const subscribeSchema = z.object({
    email: emailField,
    name: z.string().trim().max(80).optional(),
    source: z.string().trim().max(40).optional(),
});

export const unsubscribeSchema = z.object({
    email: emailField,
});