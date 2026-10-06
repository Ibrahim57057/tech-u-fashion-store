import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./email.js', import.meta.url), 'utf8');
const escapeSource = readFileSync(new URL('../../utils/html.js', import.meta.url), 'utf8');

describe('order confirmation email escaping', () => {
    // Every interpolation in the HTML body is customer-supplied with no
    // character restrictions — most obviously the shipping address and full
    // name off the checkout form. Unescaped, they are live markup in the
    // customer's own mail client.
    // Only the html: template literal is scanned. The subject line is plain
    // text and interpolates order.orderNumber on purpose.
    const htmlBlock = source.slice(source.indexOf('html: `'), source.lastIndexOf('`,'));
    const interpolations = [...htmlBlock.matchAll(/\$\{(?!escapeHtml)([a-zA-Z_][\w.[\]]*)\}/g)].map(
        (m) => m[1],
    );

    it('interpolates nothing into the HTML body unescaped', () => {
        // itemsHtml is pre-escaped in the map() above, so it is the one
        // legitimate exception.
        const unescaped = interpolations.filter((name) => name !== 'itemsHtml');

        expect(unescaped).toEqual([]);
    });

    it('escapes the five HTML-significant characters', () => {
        // escapeHtml now lives in utils/html.js so the password-reset email
        // cannot drift to a half-copy of it. The body is still scanned above
        // for interpolations that skip it, and this pins the import so an
        // inlined replacement would fail too.
        expect(source).toContain("from '../../utils/html.js'");
        expect(escapeSource).toContain('&amp;');
        expect(escapeSource).toContain('&lt;');
        expect(escapeSource).toContain('&gt;');
        expect(escapeSource).toContain('&quot;');
        expect(escapeSource).toContain('&#39;');
    });

    it('leaves the plain-text subject alone', () => {
        // The subject is not HTML, so escaping there would show the entities
        // to the customer.
        expect(source).toContain('subject: `Order confirmed — ${order.orderNumber}`');
    });
});