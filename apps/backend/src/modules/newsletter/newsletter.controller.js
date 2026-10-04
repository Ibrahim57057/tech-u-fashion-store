import Subscriber from './subscriber.model.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
    assertValidEmail,
    normalizeEmail,
    toCanonicalEmail,
    isDuplicateKeyError,
} from '../../utils/emailValidation.js';

/**
 * POST /api/v1/newsletter/subscribe
 *
 * Idempotent on purpose: someone who clicks twice, or an address that was
 * unsubscribed and comes back, should both succeed rather than throw a
 * duplicate-key error the visitor can't act on. Re-subscribing clears
 * unsubscribedAt.
 *
 * "The same person" is judged on the canonical address, so signing up as
 * John.Doe@gmail.com when johndoe+shop@gmail.com is already on the list
 * correctly reports them as already subscribed instead of quietly creating a
 * second row for one inbox.
 */
export const subscribe = catchAsync(async (req, res, next) => {
    const { name, source } = req.body;

    // Rejects malformed addresses, known typo domains like gamil.com, and
    // domains that accept no mail at all.
    const email = await assertValidEmail(req.body.email);
    const canonical = toCanonicalEmail(email);

    const existing = await Subscriber.findOne({ canonicalEmail: canonical });

    if (existing) {
        if (existing.unsubscribedAt) {
            existing.unsubscribedAt = null;
            if (name) existing.name = name;
            await existing.save();
        }
        return res.json({
            success: true,
            data: { email: existing.email, alreadySubscribed: true },
            message: "You're already on the list.",
        });
    }

    try {
        const subscriber = await Subscriber.create({ email, name, source });

        res.status(201).json({
            success: true,
            data: { email: subscriber.email, alreadySubscribed: false },
            message: 'Subscribed.',
        });
    } catch (err) {
        // Two simultaneous submissions from one person: the loser gets the
        // same friendly answer the second click would have produced.
        if (isDuplicateKeyError(err)) {
            return next(new AppError('That email address is already on the list', 409));
        }
        throw err;
    }
});

/** POST /api/v1/newsletter/unsubscribe — soft delete, so the history survives. */
export const unsubscribe = catchAsync(async (req, res, next) => {
    const subscriber = await Subscriber.findOneAndUpdate(
        { canonicalEmail: toCanonicalEmail(normalizeEmail(req.body.email)) },
        { unsubscribedAt: new Date() },
        { returnDocument: 'after' },
    );

    if (!subscriber) return next(new AppError('That address is not on the list', 404));

    res.json({ success: true, data: { email: subscriber.email }, message: 'Unsubscribed.' });
});

/** GET /api/v1/newsletter/subscribers — admin only. */
export const getSubscribers = catchAsync(async (req, res) => {
    // Paginated, and the active count comes from the database. Counting the
    // returned array in JS made the figure describe one page rather than the
    // whole list, and meant every page load shipped the entire subscriber
    // table to the browser.
    const page = Math.max(1, Number(req.safeQuery.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.safeQuery.limit) || 20), 100);

    const [subscribers, total, active] = await Promise.all([
        Subscriber.find().sort('-createdAt').skip((page - 1) * limit).limit(limit),
        Subscriber.countDocuments(),
        Subscriber.countDocuments({ unsubscribedAt: null }),
    ]);

    res.json({ success: true, data: subscribers, meta: { total, active, page, limit } });
});