import mongoose from 'mongoose';
import { ORDER_STATUS, PAYMENT_METHOD } from '../../utils/constants.js';
import { generateOrderNumber } from '../../utils/generateOrderNumber.js';

// A snapshot of what the customer actually bought, frozen at purchase
// time. If the product's name or price changes next week, old orders
// must not change with it. We keep the product/variant ids only as
// references back to the catalog.
const orderItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        size: { type: String, required: true },
        color: { type: String, required: true },
        image: { type: String },
        price: { type: Number, required: true, min: 0 }, // kobo, per unit
        qty: { type: Number, required: true, min: 1 },
    },
    { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
    {
        status: { type: String, enum: Object.values(ORDER_STATUS), required: true },
        at: { type: Date, default: Date.now },
        note: { type: String },
    },
    { _id: false },
);

const orderSchema = new mongoose.Schema(
    {
        orderNumber: { type: String, unique: true }, // also builds the lookup index
        // Every order belongs to an account: POST /orders is behind `protect`, so
    // "my orders", returns and payment verification always have an owner.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

        contact: {
            fullName: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true },
            email: { type: String, trim: true, lowercase: true },
        },
        shipping: {
            address: { type: String, required: true, trim: true },
            zoneName: { type: String, required: true },
        },

        items: {
            type: [orderItemSchema],
            validate: {
                validator: (arr) => arr.length > 0,
                message: 'An order needs at least one item.',
            },
        },

        // All money in kobo, all calculated by the server, never trusted
        // from the browser.
        subtotal: { type: Number, required: true, min: 0 },
        deliveryFee: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },

        paymentMethod: { type: String, enum: Object.values(PAYMENT_METHOD), required: true },
        status: { type: String, enum: Object.values(ORDER_STATUS), required: true },
        statusHistory: [statusHistorySchema],
    },
    { timestamps: true },
);

// Indexes for the queries that run against orders. Each of these was a full
// collection scan:
//  - "my orders" (the account page) filters by user and sorts newest first
//  - the admin list filters by status (a status tab) and also sorts newest first
//  - orderNumber is unique and is the lookup key for /orders/:orderNumber,
//    payment initialization by orderNumber, and the payment webhook
//
// orderNumber needs no explicit index(): `unique: true` on the field above
// already creates it, and declaring both makes Mongoose warn about the
// duplicate.
orderSchema.index({ user: 1, createdAt: -1 }); // customer order history
orderSchema.index({ status: 1, createdAt: -1 }); // admin status tabs
orderSchema.index({ createdAt: -1 }); // unfiltered admin list, newest first

// Runs before validation, so the required/unique checks see a real
// orderNumber. Modern Mongoose hooks take no `next` argument.
orderSchema.pre('validate', function () {
    if (!this.orderNumber) {
        this.orderNumber = generateOrderNumber();
    }
});

const Order = mongoose.model('Order', orderSchema);
export default Order;