import mongoose from 'mongoose';

const deliveryZoneSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        fee: { type: Number, required: true, min: 0 }, // kobo, like every other price
        etaDays: { type: String, required: true }, // e.g. "1-2"
        codAllowed: { type: Boolean, default: false }, // pay on delivery available here?
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, toJSON: { virtuals: true } },
);

const DeliveryZone = mongoose.model('DeliveryZone', deliveryZoneSchema);
export default DeliveryZone;