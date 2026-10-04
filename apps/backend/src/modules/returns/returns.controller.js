import Return from './return.model.js';
import Order from '../orders/order.model.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';
import { ORDER_STATUS } from '../../utils/constants.js';

/** POST /api/v1/returns — a customer requesting a return on their own delivered order. */
export const createReturn = catchAsync(async (req, res, next) => {
    const { orderId, reason, photoUrl } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return next(new AppError('Order not found', 404));

    if (order.status !== ORDER_STATUS.DELIVERED) {
        return next(new AppError('Only delivered orders can be returned', 400));
    }

    const existing = await Return.findOne({ order: orderId });
    if (existing) return next(new AppError('A return request already exists for this order', 409));

    const returnRequest = await Return.create({
        order: orderId,
        user: req.user._id,
        reason,
        photoUrl: photoUrl || undefined,
    });

    res.status(201).json({ success: true, data: returnRequest });
});

/** GET /api/v1/returns — the logged-in customer's own return requests. */
export const getMyReturns = catchAsync(async (req, res) => {
    const returns = await Return.find({ user: req.user._id }).populate('order', 'orderNumber total');
    res.json({ success: true, data: returns });
});

/**
 * GET /api/v1/returns/admin — every return request, for the admin panel.
 *
 * Paginated: this previously loaded every return request ever made, each one
 * populated with its order and user, in a single response.
 */
export const getAllReturns = catchAsync(async (req, res) => {
    const page = Math.max(1, Number(req.safeQuery.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.safeQuery.limit) || 20), 100);

    const filter = {};
    if (req.safeQuery.status) filter.status = req.safeQuery.status;

    const [returns, total] = await Promise.all([
        Return.find(filter)
            .populate('order', 'orderNumber total')
            .populate('user', 'name email')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(limit),
        Return.countDocuments(filter),
    ]);

    res.json({ success: true, data: returns, meta: { total, page, limit } });
});

/** PATCH /api/v1/returns/:id — admin approves, rejects, or completes a request. */
export const updateReturn = catchAsync(async (req, res, next) => {
    const { status, adminNote } = req.body;

    const returnRequest = await Return.findByIdAndUpdate(
        req.params.id,
        { status, adminNote },
        { returnDocument: 'after', runValidators: true },
    );

    if (!returnRequest) return next(new AppError('Return request not found', 404));

    res.json({ success: true, data: returnRequest });
});