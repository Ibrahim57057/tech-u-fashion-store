import crypto from 'node:crypto';
import Order from '../orders/order.model.js';
import Payment from './payment.model.js';
import { paystackRequest } from './paystack.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';
import { env } from '../../config/env.js';
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../../utils/constants.js';
import { sendOrderConfirmationEmail } from '../orders/email.js';

/**
 * The single place a payment gets settled. Both the customer returning
 * from Paystack (verify) and Paystack's own webhook call this, so the
 * logic exists once. It asks Paystack directly what happened, so we
 * never rely on what the browser claims.
 *
 * Safe to call any number of times for the same reference: only the
 * first successful call changes anything.
 */
async function settleByReference(reference) {
    const payment = await Payment.findOne({ reference });
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status !== PAYMENT_STATUS.PENDING) return payment; // already settled

    const gateway = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);

    if (gateway.status === 'success') {
        // Never confirm an order if the amount paid isn't the amount owed.
        if (gateway.amount !== payment.amount || gateway.currency !== 'NGN') {
            await Payment.updateOne(
                { _id: payment._id, status: PAYMENT_STATUS.PENDING },
                { status: PAYMENT_STATUS.FAILED, note: 'Amount or currency mismatch' },
            );
            throw new AppError('Payment amount mismatch', 400);
        }

        // The status filter makes this atomic: if the webhook and the
        // customer's return hit us at the same instant, only one wins.
        const settled = await Payment.findOneAndUpdate(
            { _id: payment._id, status: PAYMENT_STATUS.PENDING },
            { status: PAYMENT_STATUS.SUCCESS, paidAt: new Date(gateway.paid_at || Date.now()) },
            { returnDocument: 'after' },
        );
        if (!settled) return Payment.findById(payment._id);

        const confirmed = await Order.findOneAndUpdate(
            { _id: payment.order, status: ORDER_STATUS.PENDING_PAYMENT },
            {
                status: ORDER_STATUS.CONFIRMED,
                $push: { statusHistory: { status: ORDER_STATUS.CONFIRMED, note: 'Payment received' } },
            },
            { returnDocument: 'after' },
        );

        if (confirmed) {
            sendOrderConfirmationEmail(confirmed);
        }
        if (!confirmed) {
            // Money arrived but the order was no longer awaiting payment
            // (for example the customer paid twice). Needs a manual refund.
            console.warn(`PAYMENT NEEDS REVIEW: ${reference} succeeded but its order was not pending.`);
            await Payment.updateOne({ _id: payment._id }, { note: 'Paid but order not pending: review/refund' });
        }
        return settled;
    }

    if (gateway.status === 'failed') {
        return Payment.findOneAndUpdate(
            { _id: payment._id, status: PAYMENT_STATUS.PENDING },
            { status: PAYMENT_STATUS.FAILED, note: gateway.gateway_response },
            { returnDocument: 'after' },
        );
    }

    // abandoned / ongoing / pending: leave it pending, the customer may still finish.
    return payment;
}

/** POST /api/v1/payments/initialize  { orderNumber } */
export const initializePayment = catchAsync(async (req, res, next) => {
    const { orderNumber } = req.body;

    const order = await Order.findOne({ orderNumber });

    // Same message whether the order doesn't exist or isn't yours, so
    // nobody can probe which order numbers are real.
    //
    // Deliberately requires a positive owner match. An earlier version read
    // this as "no recorded owner means no restriction", which quietly handed
    // any signed-in customer the right to start a payment against an order
    // placed before orders were tied to an account. An order we cannot prove
    // belongs to the caller is treated as not theirs.
    const isOwner =
        Boolean(order) &&
        Boolean(order.user) &&
        Boolean(req.user) &&
        order.user.equals(req.user._id);

    if (!isOwner) {
        return next(new AppError('Order not found', 404));
    }
    if (
        order.paymentMethod !== PAYMENT_METHOD.ONLINE ||
        order.status !== ORDER_STATUS.PENDING_PAYMENT
    ) {
        return next(new AppError('This order is not awaiting online payment', 400));
    }
    if (!order.contact.email) {
        return next(new AppError('An email address is required to pay online', 400));
    }

    // A fresh reference per attempt, so a customer can retry after an
    // abandoned payment.
    const reference = `${order.orderNumber}-${Date.now()}`;

    // Record the attempt BEFORE calling Paystack, so a customer who pays
    // always has a record for us to settle against.
    const payment = await Payment.create({ order: order._id, reference, amount: order.total });

    let gateway;
    try {
        gateway = await paystackRequest('/transaction/initialize', {
            method: 'POST',
            body: {
                email: order.contact.email,
                amount: order.total, // kobo, straight from the server-calculated total
                currency: 'NGN',
                reference,
                callback_url: `${env.clientUrl}/payment/callback`,
                metadata: { orderNumber: order.orderNumber },
            },
        });
    } catch (err) {
        payment.status = PAYMENT_STATUS.FAILED;
        payment.note = 'Could not start payment';
        await payment.save();
        throw err;
    }

    res.json({
        success: true,
        data: { authorizationUrl: gateway.authorization_url, reference },
    });
});

/**
 * GET /api/v1/payments/verify/:reference — called when the customer returns from Paystack.
 *
 * Now authenticated. It used to be open to anyone, and a reference is only
 * `<orderNumber>-<timestamp>`, so references were enumerable: walking the
 * nearby timestamps for a guessed order number disclosed another customer's
 * order number, total and payment state. The customer is always signed in at
 * this point — they placed the order in the same session.
 *
 * The webhook remains the unauthenticated path, so settlement still happens if
 * the customer's cookie has expired while they were away.
 */
export const verifyPayment = catchAsync(async (req, res, next) => {
    const payment = await settleByReference(req.params.reference);

    const order = await Order.findById(payment.order).select('orderNumber total status user');

    // Same generic 404 as everywhere else, so a valid-but-foreign reference is
    // indistinguishable from one that does not exist.
    if (!order?.user || !order.user.equals(req.user._id)) {
        return next(new AppError('Payment not found', 404));
    }

    res.json({
        success: true,
        data: {
            paymentStatus: payment.status,
            orderStatus: order.status,
            orderNumber: order.orderNumber,
            total: order.total,
        },
    });
});

/** POST /api/v1/payments/webhook — Paystack calls this itself, server to server. */
export const paystackWebhook = catchAsync(async (req, res) => {
    // With no key configured the "expected" signature would be computable
    // by anyone, so refuse outright.
    if (!env.paystackSecretKey) throw new AppError('Payments are not configured', 500);

    const signature = req.get('x-paystack-signature') || '';
    const expected = crypto
        .createHmac('sha512', env.paystackSecretKey)
        .update(req.rawBody || '')
        .digest('hex');

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ success: false, error: { message: 'Invalid signature' } });
    }

    const event = req.body;
    if (event.event === 'charge.success' && event.data?.reference) {
        try {
            await settleByReference(event.data.reference);
        } catch (err) {
            // A reference we don't know about isn't worth a retry storm.
            if (err.statusCode !== 404) throw err;
        }
    }

    res.sendStatus(200);
});