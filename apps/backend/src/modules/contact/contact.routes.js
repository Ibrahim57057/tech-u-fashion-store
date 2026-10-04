import { Router } from 'express';
import {
    createMessage,
    getMessages,
    updateMessage,
} from './contact.controller.js';
import { protect, restrictTo, optionalAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createMessageSchema, updateMessageSchema } from './contact.schema.js';

const router = Router();

router.post('/', optionalAuth, validate(createMessageSchema), createMessage);

router.get('/admin', protect, restrictTo('admin'), getMessages);
router.patch('/admin/:id', protect, restrictTo('admin'), validate(updateMessageSchema), updateMessage);

export default router;