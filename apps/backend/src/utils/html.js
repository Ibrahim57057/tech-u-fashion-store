/**
 * Escapes a value for interpolation into an HTML email body.
 *
 * Every value we put in an email is attacker-influenceable at some point: a
 * product name an admin typed, a shipping address or full name straight off
 * the checkout form with no character restrictions, an order number we
 * generated. Unescaped, a name like `<img src=x onerror=...>` is live markup
 * in the customer's mail client. That is not XSS against our own origin — it
 * is markup injection into a third-party renderer, which is exactly the shape
 * of phishing that gets reported as "your site emailed me a link".
 *
 * The five characters below are the ones that can break out of HTML text or
 * an attribute value; nothing else is meaningful here because every
 * interpolation we do is in element content, never in an attribute or a URL.
 *
 * Shared by the order and password-reset emails so the escaping rule cannot
 * drift between them — a second copy of this would eventually be written
 * without one of the five.
 */
export function escapeHtml(value) {
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
