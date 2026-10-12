import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env.js';

/**
 * Resolves the app-wide mail transport from configuration, so switching
 * providers is an environment change rather than a code change:
 *
 * - SMTP_HOST/USER/PASS -> Nodemailer (Gmail, Brevo, SMTP2GO, ...)
 * - otherwise RESEND_API_KEY -> Resend
 *
 * Resend's unverified `onboarding@resend.dev` sender can only deliver to the
 * account owner's inbox, hence the preference for SMTP in production.
 */
function buildTransport() {
    if (env.smtpHost && env.smtpUser && env.smtpPass) {
        return {
            kind: 'smtp',
            client: nodemailer.createTransport({
                host: env.smtpHost,
                port: env.smtpPort,
                secure: env.smtpSecure,
                auth: { user: env.smtpUser, pass: env.smtpPass },
            }),
        };
    }

    if (env.resendApiKey) {
        return { kind: 'resend', client: new Resend(env.resendApiKey) };
    }

    return null;
}

const transport = buildTransport();

/** Which transport is actually in use: 'smtp', 'resend' or 'none'. */
export const MAIL_TRANSPORT = transport?.kind ?? 'none';

// SMTP needs all three of host, user and password. A partially filled set is
// almost always a dashboard typo, and silently falling back to Resend would
// look like "mail only works for my own address" — so say it at boot.
if (transport?.kind === 'smtp') {
    console.log(`[mailer] sending via SMTP (${env.smtpHost})`);
} else if (env.smtpHost || env.smtpUser || env.smtpPass) {
    console.warn(
        '[mailer] SMTP_HOST/USER/PASS are incomplete — falling back to Resend ' +
            `(transport=${transport?.kind ?? 'none'})`,
    );
} else if (transport?.kind === 'resend') {
    console.log('[mailer] sending via Resend');
} else {
    console.warn('[mailer] no mail transport configured');
}

/** Whether any mail transport is configured. */
export const mailerConfigured = Boolean(transport);

/** From address for outbound mail. Required explicitly over SMTP. */
export const FROM_ADDRESS =
    env.mailFrom ||
    (transport?.kind === 'resend' ? 'TECH-U Fashion Store <onboarding@resend.dev>' : '');

/**
 * Sends a message through the configured transport.
 * Returns false when no transport is configured.
 */
export async function sendMail({ to, subject, html, text = '' }) {
    if (!transport) return false;
    if (transport.kind === 'resend') {
        await transport.client.emails.send({ from: FROM_ADDRESS, to, subject, html, text });
        return true;
    }
    await transport.client.sendMail({ from: FROM_ADDRESS, to, subject, html, text });
    return true;
}