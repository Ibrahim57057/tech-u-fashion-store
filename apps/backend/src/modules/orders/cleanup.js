import Order from './order.model.js';
import Product from '../catalog/product.model.js';
import { ORDER_STATUS, PAYMENT_METHOD } from '../../utils/constants.js';

const ABANDON_AFTER_MINUTES = 30;

export async function cancelAbandonedOrders() {
    const cutoff = new Date(Date.now() - ABANDON_AFTER_MINUTES * 60 * 1000);

    const stale = await Order.find({
        status: ORDER_STATUS.PENDING_PAYMENT,
        paymentMethod: PAYMENT_METHOD.ONLINE,
        createdAt: { $lt: cutoff },
    });

    for (const order of stale) {
        const cancelled = await Order.findOneAndUpdate(
            { _id: order._id, status: ORDER_STATUS.PENDING_PAYMENT },
            {
                status: ORDER_STATUS.CANCELLED,
                $push: {
                    statusHistory: { status: ORDER_STATUS.CANCELLED, note: 'Payment not completed in time' },
                },
            },
            { returnDocument: 'after' },
        );
        if (!cancelled) continue;

        for (const item of order.items) {
            await Product.updateOne(
                { _id: item.product, 'variants._id': item.variantId },
                { $inc: { 'variants.$.stock': item.qty } },
            );
        }

        console.info(`Cancelled abandoned order ${order.orderNumber}, stock returned.`);
    }

    return stale.length;
}