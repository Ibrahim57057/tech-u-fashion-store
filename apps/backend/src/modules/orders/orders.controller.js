import mongoose from 'mongoose';
import Order from './order.model.js';
import DeliveryZone from './deliveryZone.model.js';
import Product from '../catalog/product.model.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';
import { ORDER_STATUS, ORDER_STATUS_TRANSITIONS, PAYMENT_METHOD } from '../../utils/constants.js';
import { sendOrderConfirmationEmail } from './email.js';
import { ApiFeatures } from '../../utils/apiFeatures.js';

/**
 * POST /api/v1/orders
 * Requires a session (see orders.routes.js). Browsing stays open to guests,
 * but buying requires an account.
 */
export const createOrder = catchAsync(async (req, res, next) => {
    const { contact, shipping, items, paymentMethod } = req.body;

    const zone = await DeliveryZone.findOne({ _id: shipping.zoneId, isActive: true });
    if (!zone) return next(new AppError('Delivery zone not found', 404));

    if (paymentMethod === PAYMENT_METHOD.PAY_ON_DELIVERY && !zone.codAllowed) {
        return next(new AppError('Pay on delivery is not available in this area', 400));
    }

    const initialStatus =
        paymentMethod === PAYMENT_METHOD.PAY_ON_DELIVERY
            ? ORDER_STATUS.PENDING_CONFIRMATION
            : ORDER_STATUS.PENDING_PAYMENT;

    const session = await mongoose.startSession();
    let order;

    try {
        // Everything inside runs as ONE unit: if any item is out of stock,
        // every stock change made so far is automatically rolled back.
        await session.withTransaction(async () => {
            const orderItems = [];
            let subtotal = 0;

            for (const line of items) {
                // One atomic step: "find this product WHERE this variant has
                // enough stock, AND subtract the quantity." If two customers
                // race for the last pair, only one of these updates matches.
                const product = await Product.findOneAndUpdate(
                    {
                        _id: line.productId,
                        isActive: true,
                        variants: { $elemMatch: { _id: line.variantId, stock: { $gte: line.qty } } },
                    },
                    { $inc: { 'variants.$.stock': -line.qty } },
                    { returnDocument: 'after', session },
                );

                if (!product) {
                    throw new AppError('One or more items are out of stock or unavailable', 409);
                }

                const variant = product.variants.id(line.variantId);

                orderItems.push({
                    product: product._id,
                    variantId: variant._id,
                    name: product.name,
                    size: variant.size,
                    color: variant.color,
                    image: product.images[0],
                    price: product.priceFrom, // the SERVER's price, never the browser's
                    qty: line.qty,
                });
                subtotal += product.priceFrom * line.qty;
            }

            [order] = await Order.create(
                [
                    {
                        // Always set now: protect guarantees req.user, and an
                        // order without an owner cannot be listed, returned or
                        // reconciled against a payment.
                        user: req.user._id,
                        contact: { ...contact, email: contact.email || req.user.email },
                        shipping: { address: shipping.address, zoneName: zone.name },
                        items: orderItems,
                        subtotal,
                        deliveryFee: zone.fee,
                        total: subtotal + zone.fee,
                        paymentMethod,
                        status: initialStatus,
                        statusHistory: [{ status: initialStatus }],
                    },
                ],
                { session },
            );
        });
    } finally {
        await session.endSession();
    }

    if (order.paymentMethod === PAYMENT_METHOD.PAY_ON_DELIVERY) {
        sendOrderConfirmationEmail(order); // fire and forget, doesn't block the response
    }

    res.status(201).json({ success: true, data: order });
});
/** GET /api/v1/orders — the logged-in customer's own orders. */
export const getMyOrders = catchAsync(async (req, res) => {
    // Paginated. Every order embeds its full item list and status history, so
    // an account with a long order history returned all of it at once.
    // `.lean()` also fits here specifically because these documents are only
    // ever serialised — nothing here relies on the toJSON virtuals or on
    // document methods, and skipping hydration is a measurable win at this size.
    const page = Math.max(1, Number(req.safeQuery.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.safeQuery.limit) || 20), 100);

    const filter = { user: req.user._id };
    if (req.safeQuery.status) filter.status = req.safeQuery.status;

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .select('orderNumber status total paymentMethod createdAt items.qty')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Order.countDocuments(filter),
    ]);

    res.json({ success: true, data: orders, meta: { total, page, limit } });
});

/** GET /api/v1/orders/:orderNumber — one of the customer's own orders. */
export const getMyOrder = catchAsync(async (req, res, next) => {
    const order = await Order.findOne({
        orderNumber: req.params.orderNumber,
        user: req.user._id,
    });
    if (!order) return next(new AppError('Order not found', 404));
    res.json({ success: true, data: order });
});

/** GET /api/v1/orders/admin — every order, for the admin panel. */
export const getAllOrders = catchAsync(async (req, res) => {
    const { search, ...restQuery } = req.safeQuery;
    const baseFilter = {};
    if (search) {
        // Escaped and anchored. Unescaped, `?search=` reached Mongo's regex
        // engine verbatim: `.*` scanned the whole collection and a nested
        // quantifier like `(a+)+$` risked catastrophic backtracking. An order
        // number is a fixed prefix followed by digits, so matching from the
        // start is also all the admin search box ever needs — and it lets the
        // unique index on orderNumber serve the query instead of a full scan.
        const term = String(search).slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        baseFilter.orderNumber = { $regex: `^${term}`, $options: 'i' };
    }

    const features = new ApiFeatures(Order.find(baseFilter), restQuery).filter().sort().paginate();
    const orders = await features.query;
    const total = await Order.countDocuments(baseFilter);

    res.json({
        success: true,
        data: orders,
        meta: { total, page: features.page, limit: features.limit },
    });
});
/** PATCH /api/v1/orders/:id/status — admin moves an order forward. */
export const updateOrderStatus = catchAsync(async (req, res, next) => {
    const { status: nextStatus, note } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order not found', 404));

    const allowed = ORDER_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(nextStatus)) {
        return next(
            new AppError(`Cannot move an order from "${order.status}" to "${nextStatus}"`, 400),
        );
    }

    order.status = nextStatus;
    order.statusHistory.push({ status: nextStatus, note });
    await order.save();

    res.json({ success: true, data: order });
});