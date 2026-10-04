import crypto from 'node:crypto';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, to avoid misreading

/**
 * Produces something like TU-260927-K7QF.
 *
 * The random suffix comes from crypto.randomInt, not Math.random.
 * Math.random() is a fast non-cryptographic PRNG whose output is predictable
 * from a handful of observed values, so anyone able to watch a few order
 * numbers could predict the next one and place orders against them — and the
 * order number is the customer-facing identifier used for lookups and payment
 * references. 32^4 (~1M) combinations also makes a collision far likelier than
 * it looks under a busy day, which matters because orderNumber is unique.
 *
 * 6 characters (~1B combinations) keeps collisions negligible while staying
 * short enough to read out over the phone. Existing 4-character numbers in the
 * database keep working: this only affects newly generated ones.
 */
export function generateOrderNumber() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    // Rejection sampling: taking a raw random byte mod 32 would bias the first
    // 16 characters of the alphabet, because 256 is not a multiple of 32.
    const alphabetLength = CHARS.length;
    const limit = Math.floor(256 / alphabetLength) * alphabetLength;

    let suffix = '';
    while (suffix.length < 6) {
        for (const byte of crypto.randomBytes(6)) {
            if (suffix.length === 6) break;
            if (byte < limit) {
                suffix += CHARS[byte % alphabetLength];
            }
        }
    }

    return `TU-${yy}${mm}${dd}-${suffix}`;
}