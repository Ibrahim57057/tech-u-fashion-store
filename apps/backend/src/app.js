import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js';
import { sanitizeRequest } from './middleware/sanitize.js';

import healthRouter from './modules/health/health.routes.js';
import catalogRouter from './modules/catalog/catalog.routes.js';
import categoryRouter from './modules/catalog/category.routes.js';
import authRouter from './modules/auth/auth.routes.js';
import deliveryRouter from './modules/orders/delivery.routes.js';
import ordersRouter from './modules/orders/orders.routes.js';
import paymentsRouter from './modules/payments/payments.routes.js';
import wishlistRouter from './modules/wishlist/wishlist.routes.js';
import returnsRouter from './modules/returns/returns.routes.js';
import newsletterRouter from './modules/newsletter/newsletter.routes.js';
import contactRouter from './modules/contact/contact.routes.js';
import adminRouter from './modules/admin/admin.routes.js';

export function createApp() {
    const app = express();

    // One proxy hop (Heroku/Render/Cloudflare/nginx in front of the app).
    // Without this every request appears to come from the proxy's own IP,
    // which turns the per-IP rate limiters below into a single global bucket
    // — anyone could lock every customer out of logging in with ten requests.
    // Express also needs this to read X-Forwarded-Proto correctly, which is
    // what makes `secure: true` cookies work behind TLS termination.
    app.set('trust proxy', 1);

    app.use(helmet());
    app.use(
        cors({
            // Reflecting the request origin is required anyway for
            // credentialed requests, so decide per request:
            //  - production: only the origins named in CLIENT_URL
            //  - development: any localhost/127.0.0.1 port. Vite quietly
            //    moves to 5174 (or 4174 for a preview build) when the port
            //    you asked for is busy, and a fixed-origin list then blocked
            //    every API call - a blank catalogue with only a CORS error
            //    in the console to explain it.
            origin(origin, callback) {
                if (!origin) return callback(null, true); // curl, server-to-server, same-origin
                if (env.clientUrls.includes(origin.replace(/\/+$/, ''))) {
                    return callback(null, true);
                }
                if (env.nodeEnv !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
                    return callback(null, true);
                }
                // callback(null, false) rather than callback(new Error(...)): the browser
                // blocks the response either way, but this way the request is
                // simply answered without CORS headers instead of logging an
                // error and returning a 500.
                return callback(null, false);
            },
            credentials: true,
        }),
    );

    // Keep the untouched request bytes in req.rawBody. The Paystack
    // webhook signature is calculated over these exact bytes, and
    // re-serialising the parsed JSON could change them.
    app.use(
        express.json({
            limit: '1mb',
            verify: (req, res, buf) => {
                req.rawBody = buf;
            },
        }),
    );

    app.use(cookieParser());
    app.use(sanitizeRequest);

    // 10 login/register attempts per 15 minutes per IP. Under NODE_ENV=test the
    // budget is effectively removed, because the suite deliberately fires
    // many auth requests in a row and would otherwise rate-limit its own
    // regression tests. Production and dev keep the real limit.
    const AUTH_MAX = env.nodeEnv === 'test' ? 100_000 : 10;
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: AUTH_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: { message: 'Too many attempts, please try again later.' } },
    });
    app.use('/api/v1/auth/login', authLimiter);
    app.use('/api/v1/auth/register', authLimiter);
    app.use('/api/v1/auth', authRouter);

    app.use('/api/v1/health', healthRouter);
    app.use('/api/v1/products', catalogRouter);
    app.use('/api/v1/categories', categoryRouter);
    app.use('/api/v1/delivery-zones', deliveryRouter);
    app.use('/api/v1/orders', ordersRouter);
    app.use('/api/v1/payments', paymentsRouter);
    app.use('/api/v1/wishlist', wishlistRouter);
    app.use('/api/v1/returns', returnsRouter);
    app.use('/api/v1/admin', adminRouter);

    // The footer newsletter form and the contact form are on every page,
    // so they get their own limiter rather than sharing the login one
    // (10 per 15 min would lock out someone just browsing the shop).
    // Mounted BEFORE the routers so it actually wraps them.
    const formLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: env.nodeEnv === 'test' ? 100_000 : 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: { message: 'Too many attempts, please try again later.' } },
    });
    app.use('/api/v1/newsletter', formLimiter);
    app.use('/api/v1/contact', formLimiter);

    app.use('/api/v1/newsletter', newsletterRouter);
    app.use('/api/v1/contact', contactRouter);

    app.use(notFoundHandler);
    app.use(globalErrorHandler);

    return app;
}