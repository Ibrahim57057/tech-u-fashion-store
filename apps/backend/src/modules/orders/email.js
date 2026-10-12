import { escapeHtml } from '../../utils/html.js';
import { sendMail, mailerConfigured } from '../../utils/mailer.js';
import { formatNaira } from './formatNaira.js';

/**
 * Sends an order confirmation. Skips silently when no transport is
 * configured so a missing mailer never blocks a completed order.
 */
export async function sendOrderConfirmationEmail(order) {
    if (!mailerConfigured || !order.contact.email) return;

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
        await sendMail({
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
        // A failed email must never break the order flow.
        console.error('Failed to send order confirmation email:', err.message);
    }
}