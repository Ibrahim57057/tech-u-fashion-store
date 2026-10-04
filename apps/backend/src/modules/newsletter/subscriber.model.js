import mongoose from 'mongoose';
import { normalizeEmail, toCanonicalEmail } from '../../utils/emailValidation.js';

const subscriberSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true, // one row per address; re-subscribing is a no-op
            lowercase: true,
            trim: true,
            index: true,
        },
        // Collapses the Gmail spellings that reach one inbox (dots and "+"
        // tags are noise there), so one person cannot quietly sign up twice.
        canonicalEmail: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        // Kept for the marketing list even if the person never logs in.
        name: { type: String, trim: true },
        source: { type: String, default: 'footer' }, // where they signed up
        unsubscribedAt: { type: Date, default: null }, // soft delete, keeps history
    },
    { timestamps: true },
);

subscriberSchema.pre('validate', function () {
    if (this.isModified('email') || !this.canonicalEmail) {
        this.email = normalizeEmail(this.email);
        this.canonicalEmail = toCanonicalEmail(this.email);
    }
});

const Subscriber = mongoose.model('Subscriber', subscriberSchema);
export default Subscriber;