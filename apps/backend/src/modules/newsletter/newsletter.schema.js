import { z } from 'zod';
import { emailField } from '../../utils/emailSchema.js';

export const subscribeSchema = z.object({
    email: emailField,
    name: z.string().trim().max(80).optional(),
    source: z.string().trim().max(40).optional(),
});

// Both fields are required: without the signed token this endpoint let
// anyone unsubscribe (and enumerate) any address. See unsubscribeToken.js.
export const unsubscribeSchema = z.object({
    email: emailField,
    token: z.string().regex(/^[0-9a-f]{64}$/i, 'Invalid unsubscribe token'),
});