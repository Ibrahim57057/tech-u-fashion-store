import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../../utils/constants.js';

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    // Unique, so the same payment can never be recorded twice.
    reference: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 }, // kobo
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    paidAt: { type: Date },
    note: { type: String },
  },
  { timestamps: true },
);

// reference is already unique (which builds its own index). The compound index
// below covers the other real access pattern: finding a given order's payment
// attempts newest-first, which is how the order page shows whether an
// abandoned attempt still needs settling.
paymentSchema.index({ order: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;