import { Router } from 'express';
import mongoose from 'mongoose';
import { mailerConfigured, FROM_ADDRESS } from '../../utils/mailer.js';
import { env } from '../../config/env.js';

const router = Router();

/**
 * GET /api/v1/health
 * Confirms the server is running and reports whether it's connected
 * to MongoDB. The first thing to check after starting the server or
 * after any deploy.
 */
router.get('/', (req, res) => {
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
        success: true,
        data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbStates[mongoose.connection.readyState] || 'unknown',
            mail: {
                configured: mailerConfigured,
                transport: env.smtpHost ? 'smtp' : env.resendApiKey ? 'resend' : 'none',
                host: env.smtpHost || null,
                from: FROM_ADDRESS,
            },
        },
    });
});

export default router;