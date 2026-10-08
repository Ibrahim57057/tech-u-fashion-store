import { Router } from 'express';
import { getStats, getTopProducts, getRevenueByDay } from './admin.controller.js';
import { protect, restrictTo } from '../../middleware/auth.js';

const router = Router();

router.use(protect);

// Staff run fulfilment, not the books: the order/stock/customer counts are
// what their dashboard needs, so they share /stats with admins. Revenue —
// the chart, the total and the per-product figures — stays admin-only, which
// is why the other two are not under the same restrictTo as this one.
router.get('/stats', restrictTo('staff', 'admin'), getStats);
router.get('/top-products', restrictTo('admin'), getTopProducts);
router.get('/revenue-by-day', restrictTo('admin'), getRevenueByDay);

export default router;