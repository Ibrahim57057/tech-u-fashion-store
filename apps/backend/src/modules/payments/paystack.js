import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';

const BASE_URL = 'https://api.paystack.co';

/** The only place that talks to Paystack. Returns Paystack's `data` object. */
export async function paystackRequest(path, { method = 'GET', body } = {}) {
    if (!env.paystackSecretKey) {
        throw new AppError('Payments are not configured', 500);
    }

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${env.paystackSecretKey}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.status) {
        console.error('Paystack error:', json);
        throw new AppError(json?.message || 'Payment provider error', 502);
    }

    return json.data;
}