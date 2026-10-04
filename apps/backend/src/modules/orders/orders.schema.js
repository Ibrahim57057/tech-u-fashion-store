import mongoose from 'mongoose';
import { z } from 'zod';
import { PAYMENT_METHOD } from '../../utils/constants.js';
import { ORDER_STATUS, ORDER_STATUS_TRANSITIONS } from '../../utils/constants.js';

const objectId = z
    .string()
    .refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

const phone = z
    .string()
    .regex(/^(\+234|0)[7-9][01]\d{8}$/, 'Enter a valid Nigerian phone number');

export const createOrderSchema = z
    .object({
        contact: z.object({
            fullName: z.string().min(2, 'Full name is required'),
            phone,
            email: z.union([z.email(), z.literal('')]).optional(),
        }),
        shipping: z.object({
            address: z.string().min(5, 'Enter a fuller address'),
            zoneId: objectId,
        }),
        items: z
            .array(
                z.object({
                    productId: objectId,
                    variantId: objectId,
                    qty: z.number().int().min(1).max(10),
                }),
            )
            .min(1, 'Your cart is empty')
            // Per-item qty is capped above, but the array length was not, so
            // one request could carry thousands of line items — and each one
            // becomes a variant lookup, a stock check and a statusHistory
            // entry. 50 is far beyond any real cart.
            .max(50, 'Your cart has too many items'),
        paymentMethod: z.enum(Object.values(PAYMENT_METHOD)),
    })
    .refine(
        (data) => data.paymentMethod !== PAYMENT_METHOD.ONLINE || !!data.contact.email,
        { message: 'Email is required to pay online', path: ['contact', 'email'] },
    );


export const updateOrderStatusSchema = z.object({
  status: z.enum(Object.values(ORDER_STATUS)),
  note: z.string().optional(),
});