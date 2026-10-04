import { z } from 'zod';

/**
 * Delivery zones are the fee table behind the checkout shipping options, so
 * these values feed a price the server then adds to the order total.
 *
 * The field set mirrors deliveryZone.model.js exactly. An earlier draft of
 * this schema included a `state` field the model does not have, and typed
 * etaDays as a number when the model and both frontends use a string range
 * like "1-2" — which would have rejected every real payload.
 */

// Deliberately permissive on shape: the model stores free text ("1-2", "3-5")
// and both the admin form and the seed data already use that, so only
// emptiness and length are enforced.
const etaDays = z
    .string()
    .trim()
    .min(1, 'Enter a delivery estimate')
    .max(20);

export const createDeliveryZoneSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    fee: z
        .number({ message: 'Fee must be a number' })
        .int('Fee must be a whole number of kobo')
        .min(0, 'A delivery fee cannot be negative')
        .max(10_000_000, 'That fee looks wrong'),
    etaDays,
    codAllowed: z.boolean().optional(),
    isActive: z.boolean().optional(),
});

export const updateDeliveryZoneSchema = createDeliveryZoneSchema.partial();