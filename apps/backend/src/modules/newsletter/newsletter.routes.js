import { Router } from 'express';
import {
    subscribe,
    unsubscribe,
    getSubscribers,
} from './newsletter.controller.js';
import { protect, restrictTo } from '../../middleware/auth.js';
import { newsletterLimiter } from '../../middleware/rateLimiters.js';
import { validate } from '../../middleware/validate.js';
import { subscribeSchema, unsubscribeSchema } from './newsletter.schema.js';

const router = Router();

// Public: the footer form is on every page, for logged-out visitors too.
router.post('/subscribe', newsletterLimiter, validate(subscribeSchema), subscribe);
router.post('/unsubscribe', newsletterLimiter, validate(unsubscribeSchema), unsubscribe);

router.get('/subscribers', protect, restrictTo('admin'), getSubscribers);

export default router;