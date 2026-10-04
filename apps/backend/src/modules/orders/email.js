import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { formatNaira } from './formatNaira.js';

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

/**
 * Escapes a value for interpolation into the HTML body.
 *
 * Every field below is customer-supplied and lands inside an HTML email:
 * a product name an admin typed, but more importantly the shipping address and
 * full name, which come straight off the checkout form with no character
 * restrictions. Unescaped, a name like `<img src=x onerror=...>` is live markup
 * in the customer's mail client. This is not XSS against our own origin —
 * it is markup injection into a third-party renderer, which is exactly the
 * situation people report phishing through.
 *
 * The five characters below are the ones that can break out of HTML text or
 * an attribute value; nothing else is meaningful here because every
 * interpolation is in element content, never in an attribute or a URL.
 */
function escapeHtml(value) {
    return String(value ?? '').replace(
        /[&<>"']/g,
        (char) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[char],
    );
}

/**
 * Sends an order confirmation. If Resend isn't configured (no key in
 * .env), this quietly does nothing instead of crashing the order flow
 * — a missing email should never stop a real order from completing.
 */
export async function sendOrderConfirmationEmail(order) {
    if (!resend || !order.contact.email) return;

    const itemsHtml = order.items
        .map(
            (item) =>
                `<tr>
          <td style="padding:8px 0;">${escapeHtml(item.name)} (${escapeHtml(item.size)}, ${escapeHtml(item.color)}) × ${escapeHtml(item.qty)}</td>
          <td style="padding:8px 0; text-align:right;">${escapeHtml(formatNaira(item.price * item.qty))}</td>
        </tr>`,
        )
        .join('');

    try {
        await resend.emails.send({
            from: 'TECH-U Fashion Store <onboarding@resend.dev>',
            to: order.contact.email,
            subject: `Order confirmed — ${order.orderNumber}`,
            html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Thanks for your order, ${escapeHtml(order.contact.fullName)}!</h2>
          <p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> has been confirmed.</p>
          <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
            ${itemsHtml}
          </table>
          <p style="border-top: 1px solid #eee; padding-top: 8px;">
            <strong>Total: ${escapeHtml(formatNaira(order.total))}</strong>
          </p>
          <p>Delivering to: ${escapeHtml(order.shipping.address)} (${escapeHtml(order.shipping.zoneName)})</p>
          <p style="color: #888; font-size: 13px;">TECH-U Fashion Store</p>
        </div>
      `,
        });
    } catch (err) {
        // A failed email should never break the order. Log it, move on.
        console.error('Failed to send order confirmation email:', err.message);
    }
}