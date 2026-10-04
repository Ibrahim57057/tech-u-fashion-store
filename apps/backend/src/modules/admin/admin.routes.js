import { Router } from 'express';
import { getStats, getTopProducts, getRevenueByDay } from './admin.controller.js';
import { protect, restrictTo } from '../../middleware/auth.js';

const router = Router();

router.use(protect, restrictTo('admin'));

router.get('/stats', getStats);
router.get('/top-products', getTopProducts);
router.get('/revenue-by-day', getRevenueByDay);

export default router;