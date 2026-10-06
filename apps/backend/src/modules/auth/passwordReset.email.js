import { env } from '../../config/env.js';
import { escapeHtml } from '../../utils/html.js';
import { resend, FROM_ADDRESS } from '../../utils/mailer.js';

/**
 * Sends the "reset your password" link.
 *
 * The URL is built from env.clientUrl, the same origin CORS is locked to, so
 * the link lands on the storefront the user actually came from rather than
 * whatever host Render happens to expose the app on today.
 *
 * `rawToken` is the only place the unhashed token appears — the database
 * stores just its SHA-256. It is passed straight into the link and never
 * logged.
 */
export async function sendPasswordResetEmail({ to, name, rawToken }) {
    const resetUrl = `${env.clientUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const recipientName = escapeHtml(name || 'there');

    // No key means local development. Printing the link is the only way to
    // walk the flow without a Resend account, and it is unreachable in
    // production because NODE_ENV=production refuses to start without a key.
    if (!resend) {
        console.warn(`[password-reset] RESEND_API_KEY not set. Reset link for ${to}: ${resetUrl}`);
        return { skipped: true };
    }

    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:22px;color:#111111;">Reset your password</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333333;">
        Hi ${recipientName},
      </p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333333;">
        We received a request to reset the password for your TECH-U Fashion Store account.
        Choose a new password below.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(resetUrl)}"
           style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;">
          Choose a new password
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#555555;">
        This link expires in 15 minutes and can be used once.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#555555;">
        If the button does not work, copy and paste this into your browser:
      </p>
      <p style="margin:8px 0 0;font-size:13px;word-break:break-all;color:#444444;">
        ${escapeHtml(resetUrl)}
      </p>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#777777;">
        You can ignore this email if you did not ask for a change. Your password will stay as it is.
      </p>
    </div>
  </body>
</html>`;

    try {
        await resend.emails.send({
            from: FROM_ADDRESS,
            to,
            subject: 'Reset your TECH-U Fashion Store password',
            html,
            text: `Hi ${name || 'there'},\n\nChoose a new password for your TECH-U Fashion Store account:\n\n${resetUrl}\n\nThis link expires in 15 minutes and can be used once.\n\nIf you did not ask for a change, you can ignore this email.\n`,
        });
    } catch (error) {
        // Never let a mail provider failure turn into a 500 for the customer:
        // the API returns the generic success either way, and this surfaces in
        // the server log with the reason.
        console.error(`[password-reset] failed to email ${to}:`, error.message);
        return { sent: false };
    }

    return { sent: true };
}
