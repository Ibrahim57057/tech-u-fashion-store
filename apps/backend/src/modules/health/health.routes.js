import { Router } from 'express';
import mongoose from 'mongoose';
import { mailerConfigured, FROM_ADDRESS, MAIL_TRANSPORT } from '../../utils/mailer.js';
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
                transport: MAIL_TRANSPORT,
                from: FROM_ADDRESS,
                // Host and presence flags only — never the credentials.
                smtp: env.smtpHost
                    ? {
                          host: env.smtpHost,
                          userSet: Boolean(env.smtpUser),
                          passSet: Boolean(env.smtpPass),
                          secure: env.smtpSecure,
                          port: env.smtpPort,
                      }
                    : null,
            },
        },
    });
});

export default router;