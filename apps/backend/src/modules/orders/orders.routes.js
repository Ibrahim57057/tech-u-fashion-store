import { Router } from 'express';
import {
    createOrder,
    getMyOrders,
    getMyOrder,
    getAllOrders,
    updateOrderStatus,
} from './orders.controller.js';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { orderLimiter } from '../../middleware/rateLimiters.js';
import { createOrderSchema, updateOrderStatusSchema } from './orders.schema.js';

const router = Router();

// Browsing the catalogue and filling a cart stay open to anyone, but placing
// an order requires an account: protect (not optionalAuth) is what makes the
// order belong to a real user, so it can be tracked, returned and paid for.
// Without this, anyone could place orders that no customer could later see.
//
// orderLimiter sits after protect so it can key on the account rather than the
// IP — see middleware/rateLimiters.js.
router.post('/', protect, orderLimiter, validate(createOrderSchema), createOrder);
router.get('/', protect, getMyOrders);

router.get('/admin', protect, restrictTo('staff', 'admin'), getAllOrders);
router.patch(
    '/:id/status',
    protect,
    restrictTo('staff', 'admin'),
    validate(updateOrderStatusSchema),
    updateOrderStatus,
);

router.get('/:orderNumber', protect, getMyOrder);

export default router;