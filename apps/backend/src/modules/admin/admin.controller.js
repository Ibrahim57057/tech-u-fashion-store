import Order from '../orders/order.model.js';
import Product from '../catalog/product.model.js';
import User from '../auth/user.model.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { ORDER_STATUS } from '../../utils/constants.js';

/** GET /api/v1/admin/stats — a quick snapshot of the business. */
export const getStats = catchAsync(async (req, res) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalOrders, ordersToday, totalRevenueAgg, pendingCount, lowStockCount, customerCount] =
        await Promise.all([
            Order.countDocuments(),
            Order.countDocuments({ createdAt: { $gte: startOfToday } }),
            Order.aggregate([
                { $match: { status: { $in: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKED, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED] } } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            Order.countDocuments({ status: { $in: [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PENDING_CONFIRMATION] } }),
            Product.countDocuments({ isActive: true, 'variants.stock': { $lte: 3 } }),
            User.countDocuments({ role: 'customer' }),
        ]);

    res.json({
        success: true,
        data: {
            totalOrders,
            ordersToday,
            totalRevenue: totalRevenueAgg[0]?.total || 0,
            pendingOrders: pendingCount,
            lowStockProducts: lowStockCount,
            totalCustomers: customerCount,
        },
    });
});

/** GET /api/v1/admin/top-products — best sellers by units sold. */
export const getTopProducts = catchAsync(async (req, res) => {
    const top = await Order.aggregate([
        { $match: { status: { $ne: ORDER_STATUS.CANCELLED } } },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.product',
                name: { $first: '$items.name' },
                unitsSold: { $sum: '$items.qty' },
                revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
            },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 5 },
    ]);

    res.json({ success: true, data: top });
});

/** GET /api/v1/admin/revenue-by-day — last 14 days, for the dashboard chart. */
export const getRevenueByDay = catchAsync(async (req, res) => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const result = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: fourteenDaysAgo },
                status: { $in: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKED, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED] },
            },
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                revenue: { $sum: '$total' },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, data: result });
});