import mongoose from 'mongoose';
import { z } from 'zod';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

export const createReturnSchema = z.object({
    orderId: objectId,
    reason: z.string().min(5, 'Give a short reason'),
    photoUrl: z.union([z.url(), z.literal('')]).optional(),
});

export const updateReturnSchema = z.object({
    status: z.enum(['approved', 'rejected', 'completed']),
    adminNote: z.string().optional(),
});