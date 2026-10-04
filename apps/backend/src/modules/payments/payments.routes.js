import { Router } from 'express';
import { initializePayment, verifyPayment, paystackWebhook } from './payments.controller.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { paymentLimiter } from '../../middleware/rateLimiters.js';
import { initializePaymentSchema } from './payments.schema.js';

const router = Router();

// A payment must belong to a signed-in customer, same as the order it pays
// for. The webhook stays public: Paystack calls it server-to-server and cannot
// present a session cookie, and it is the path that settles the payment even
// if the customer's session has expired.
//
// paymentLimiter sits after protect so it can key on the account rather than
// the IP — see middleware/rateLimiters.js.
router.post('/initialize', protect, paymentLimiter, validate(initializePaymentSchema), initializePayment);
// verify is also protected: it returns order numbers and totals, and its
// :reference is guessable. The controller additionally confirms the order
// belongs to the caller.
router.get('/verify/:reference', protect, verifyPayment);
router.post('/webhook', paystackWebhook);

export default router;