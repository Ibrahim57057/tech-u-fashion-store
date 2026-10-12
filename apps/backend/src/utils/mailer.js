import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env.js';

/**
 * One mail transport for the whole app, chosen once at import.
 *
 * Two senders are supported and the transport is picked from configuration,
 * so switching provider is an environment change, not a code change:
 *
 *   - SMTP_* + MAIL_FROM  -> Nodemailer (Gmail app passwords, Brevo,
 *                            SMTP2GO, any server that speaks SMTP)
 *   - RESEND_API_KEY only  -> Resend
 *
 * Resend's `onboarding@resend.dev` sender is a sandbox: until a domain is
 * verified, that address can only deliver to the account owner's own inbox,
 * which is exactly why reset links "worked" for one Gmail and no other.
 * SMTP moves the sending account somewhere that may mail anyone.
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

/** True when at least one sender is configured. Callers skip gracefully. */
export const mailerConfigured = Boolean(transport);

/**
 * The From line. Required over SMTP (a server like Gmail refuses to send
 * from an address it does not own), and confusing to leave blank even when a
 * provider would accept it.
 */
export const FROM_ADDRESS =
    env.mailFrom ||
    (transport?.kind === 'resend' ? 'TECH-U Fashion Store <onboarding@resend.dev>' : '');

/**
 * Sends one message through whichever transport is configured.
 * Returns false when nothing is configured, so the caller's `return;`
 * guard needs no knowledge of the provider.
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