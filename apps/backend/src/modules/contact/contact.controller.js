import Message from './message.model.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * POST /api/v1/contact
 *
 * Optional auth: a logged-in visitor's message is linked to their account
 * so the team can see the order history, but anyone can send one without
 * an account.
 */
export const createMessage = catchAsync(async (req, res) => {
    const { name, email, subject, message } = req.body;

    const saved = await Message.create({
        name,
        email,
        subject: subject || undefined, // fall back to the schema default
        message,
        user: req.user?._id ?? null,
    });

    res.status(201).json({
        success: true,
        data: { _id: saved._id, name: saved.name, email: saved.email },
        message: "Message received — we'll reply by email.",
    });
});

/**
 * GET /api/v1/contact/admin — admin inbox.
 *
 * Paginated, and the unread count now comes from the database instead of from
 * filtering the array that was just returned. Counting in JS meant the unread
 * badge could only ever be correct for the page on screen; `countDocuments`
 * with the same filter is both correct and cheaper once there are more messages
 * than fit on one page.
 */
export const getMessages = catchAsync(async (req, res) => {
    const page = Math.max(1, Number(req.safeQuery.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.safeQuery.limit) || 20), 100);
    const filter = {};
    if (req.safeQuery.status) filter.status = req.safeQuery.status;

    const [messages, total, unread] = await Promise.all([
        Message.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
        Message.countDocuments(filter),
        Message.countDocuments({ status: 'new' }),
    ]);

    res.json({ success: true, data: messages, meta: { total, unread, page, limit } });
});

/** PATCH /api/v1/contact/admin/:id — mark as read/replied. */
export const updateMessage = catchAsync(async (req, res, next) => {
    const message = await Message.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { returnDocument: 'after', runValidators: true },
    );

    if (!message) return next(new AppError('Message not found', 404));

    res.json({ success: true, data: message });
});