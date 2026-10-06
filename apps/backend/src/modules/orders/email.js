import { escapeHtml } from '../../utils/html.js';
import { resend, FROM_ADDRESS } from '../../utils/mailer.js';
import { formatNaira } from './formatNaira.js';

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
            from: FROM_ADDRESS,
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