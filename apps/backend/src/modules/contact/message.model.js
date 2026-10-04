import mongoose from 'mongoose';

const MESSAGE_STATUS = ['new', 'read', 'replied'];

const messageSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        // Captured so we can tell whether the form was actually used.
        subject: { type: String, trim: true, default: 'General enquiry' },
        message: { type: String, required: true, trim: true },
        status: { type: String, enum: MESSAGE_STATUS, default: 'new', index: true },
        // null for anonymous visitors, set when they were logged in.
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true },
);

const Message = mongoose.model('Message', messageSchema);
export { MESSAGE_STATUS };
export default Message;