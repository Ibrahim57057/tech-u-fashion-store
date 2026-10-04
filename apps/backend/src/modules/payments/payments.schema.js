import { z } from 'zod';

export const initializePaymentSchema = z.object({
    orderNumber: z.string().min(1, 'Order number is required'),
});