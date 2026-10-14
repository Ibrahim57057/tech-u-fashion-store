import { env } from '../../config/env.js';
import { escapeHtml } from '../../utils/html.js';
import { sendMail, mailerConfigured } from '../../utils/mailer.js';

/**
 * Emails a link that confirms an address — used both when an account is first
 * created and when a signed-in customer asks to move the account to a new
 * address. `rawToken` is the only plaintext copy; the database keeps its hash.
 */
export async function sendVerificationEmail({ to, name, rawToken }) {
    const url = `${env.clientUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
    const recipientName = escapeHtml(name || 'there');

    if (!mailerConfigured) {
        console.warn(`[verify-email] no mail transport configured. Verify link for ${to}: ${url}`);
        return { skipped: true };
    }

    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:22px;color:#111111;">Confirm your email</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333333;">Hi ${recipientName},</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#333333;">
        Confirm this address for your TECH-U Fashion Store account.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(url)}"
           style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;">
          Confirm email
        </a>
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#555555;">
        This link expires in 24 hours. If the button does not work, copy and paste this into your browser:
      </p>
      <p style="margin:8px 0 0;font-size:13px;word-break:break-all;color:#444444;">${escapeHtml(url)}</p>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#777777;">
        You can ignore this email if you did not ask for it.
      </p>
    </div>
  </body>
</html>`;

    try {
        await sendMail({
            to,
            subject: 'Confirm your TECH-U Fashion Store email',
            html,
            text: `Hi ${name || 'there'},\n\nConfirm this address for your TECH-U Fashion Store account:\n\n${url}\n\nThis link expires in 24 hours.\n`,
        });
    } catch (error) {
        console.error(`[verify-email] failed to email ${to}:`, error.message);
        return { sent: false };
    }

    return { sent: true };
}
