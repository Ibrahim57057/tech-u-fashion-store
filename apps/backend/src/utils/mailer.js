import { Resend } from 'resend';
import { env } from '../config/env.js';

/**
 * One Resend client for the whole app, built once at import.
 *
 * The order and password-reset emails each need a client, and two copies of
 * `env.resendApiKey ? new Resend(...) : null` is two places to forget the
 * "no key means no email" guard. A missing key is normal in development, so
 * this is null rather than an error — callers check and skip.
 */
export const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

/**
 * Verified on the Resend account while the domain is unverified. Replace with
 * a domain you control before sending at volume: onboarding@resend.dev can
 * only deliver to addresses on the Resend account itself.
 */
export const FROM_ADDRESS = 'TECH-U Fashion Store <onboarding@resend.dev>';
