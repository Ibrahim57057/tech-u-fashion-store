import mongoose from 'mongoose';

const RETURN_STATUS = ['requested', 'approved', 'rejected', 'completed'];

const returnSchema = new mongoose.Schema(
    {
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        reason: { type: String, required: true, trim: true },
        photoUrl: { type: String },
        status: { type: String, enum: RETURN_STATUS, default: 'requested' },
        adminNote: { type: String }, // why it was approved/rejected
    },
    { timestamps: true },
);

const Return = mongoose.model('Return', returnSchema);
export { RETURN_STATUS };
export default Return;