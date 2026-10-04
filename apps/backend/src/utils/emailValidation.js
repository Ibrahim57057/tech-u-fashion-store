import { promises as dns } from 'node:dns';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Shared email rules for registration, login and the newsletter list.
 *
 * Three separate jobs, deliberately kept apart:
 *
 *  1. Formatting      — is this string shaped like an address at all?
 *  2. Typos          — gamil.com, gmial.com and friends are REAL domains
 *                      with working mail servers, so no amount of format or
 *                      DNS checking can catch them. They need a blocklist.
 *  3. One person, one account — Gmail treats dots and everything after a
 *                      "+" as noise, so j.doe@gmail.com, jdoe@gmail.com and
 *                      jdoe+shop@gmail.com are three different strings that
 *                      all reach the same inbox. `canonicalEmail` collapses
 *                      them so the unique index can do its job.
 *
 * What this cannot do: confirm that a mailbox actually exists. Only the
 * mailbox owner can be sure of that. Probing real mail servers is unreliable
 * (Gmail rejects it outright) and doing it properly needs a paid verification
 * service. So "unregistered" here means "not a real deliverable address", not
 * "an inbox that received our mail" — see assertEmailUsable below for the
 * honest limit.
 */

export const INVALID_EMAIL_MESSAGE = 'Enter a valid email address';
export const UNREGISTERED_EMAIL_MESSAGE = 'Invalid or unregistered email address';

// RFC 5321 caps: 254 for the whole address, 64 for the part before the @.
const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;

// Unquoted local part. Dots are allowed but not doubled and not at the edges,
// which is what stops "john..doe@x.com" and ".john@x.com".
const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

/**
 * Domains people actually type by mistake. gamil.com in particular is owned
 * and has live MX records, so it sails through every other check while
 * silently sending mail nowhere useful.
 */
const TYPO_DOMAINS = {
    'gamil.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gnail.com': 'gmail.com',
    'gmall.com': 'gmail.com',
    'gmsil.com': 'gmail.com',
    'gamil.co': 'gmail.com',
    'gmai.co': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmail.cm': 'gmail.com',
    'gmail.con': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'hotnail.com': 'hotmail.com',
    'yahho.com': 'yahoo.com',
    'yahooo.com': 'yahoo.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
};

/** Gmail treats these two as the same service. */
const GOOGLE_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Trim + lowercase. Both models lowercase on save, so anything that compares
 * or looks up an address has to do the same or "A@Gmail.com" will miss the
 * stored "a@gmail.com" and fall through into a duplicate-key crash.
 */
export function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function splitEmail(email) {
    const at = email.lastIndexOf('@');
    if (at < 1) return null;
    return { local: email.slice(0, at), domain: email.slice(at + 1) };
}

/** Pure shape check. No DNS, no database. */
export function isValidEmailFormat(value) {
    const email = normalizeEmail(value);
    if (!email || email.length > MAX_EMAIL_LENGTH) return false;

    const parts = splitEmail(email);
    if (!parts) return false;

    const { local, domain } = parts;
    if (!local || local.length > MAX_LOCAL_LENGTH) return false;
    if (!LOCAL_PART.test(local)) return false;

    if (!domain || domain.length > 253) return false;
    if (domain.includes('..')) return false;
    if (!domain.includes('.')) return false;

    const labels = domain.split('.');
    // A bare "localhost" or "intranet" is not a public mailbox.
    if (labels.length < 2) return false;
    if (!labels.every((label) => DOMAIN_LABEL.test(label))) return false;

    // The TLD has to be letters — this rejects "user@example.c" and
    // "user@example.123" without needing a list of every TLD in the world.
    const tld = labels[labels.length - 1];
    return /^[A-Za-z]{2,}$/.test(tld);
}

/** The correction to suggest for a known typo domain, if we recognise it. */
export function getTypoSuggestion(value) {
    const parts = splitEmail(normalizeEmail(value));
    if (!parts) return null;
    return TYPO_DOMAINS[parts.domain] ?? null;
}

/**
 * The identity of the mailbox behind the address.
 *
 * For Gmail this strips dots and anything after "+", because all three of
 * these reach one inbox:
 *   john.doe@gmail.com
 *   johndoe@gmail.com
 *   johndoe+newsletter@gmail.com
 *
 * Everywhere else we only drop the "+tag", since a.plus+tag@outlook.com is
 * still the same person.
 */
export function toCanonicalEmail(value) {
    const parts = splitEmail(normalizeEmail(value));
    if (!parts) return normalizeEmail(value);

    let { local } = parts;
    const { domain } = parts;

    const plus = local.indexOf('+');
    if (plus !== -1) local = local.slice(0, plus);

    if (GOOGLE_DOMAINS.has(domain)) local = local.replace(/\./g, '');

    // A tag-only local part ("+shop@gmail.com") reduces to nothing; keep the
    // normalized original so we never produce an address with an empty local.
    return local ? `${local}@${domain}` : normalizeEmail(value);
}

/**
 * Does this domain accept mail at all?
 *
 * `exists` false means the domain genuinely does not resolve. `uncertain`
 * true means the lookup itself failed for an infrastructural reason (timeout,
 * SERVFAIL, no DNS in this environment) and the caller must NOT block the
 * signup over it — turning a DNS hiccup into "your email is invalid" would
 * reject real customers.
 */
export async function domainAcceptsMail(domain) {
    try {
        const records = await dns.resolveMx(domain);
        return { exists: records.length > 0, uncertain: false };
    } catch (err) {
        if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
            return { exists: false, uncertain: false };
        }
        return { exists: true, uncertain: true };
    }
}

/**
 * Is the DNS check on by default?
 *
 * Set EMAIL_VERIFY_DNS=false to turn it off wholesale. The test suite does
 * this so it never depends on a live DNS round-trip; the handful of tests
 * that are specifically about DNS call assertValidEmail with
 * `verifyDomain: true` explicitly.
 */
function dnsCheckEnabledByDefault() {
    return process.env.EMAIL_VERIFY_DNS !== 'false';
}

/**
 * The single entry point for "is this address acceptable?".
 * Throws AppError so the caller's existing error handling deals with it.
 *
 * @param {string} value          raw address from the request
 * @param {object} [options]
 * @param {boolean} [options.verifyDomain] run the DNS check
 */
export async function assertValidEmail(value, { verifyDomain } = {}) {
    const email = normalizeEmail(value);

    if (!isValidEmailFormat(email)) {
        throw new AppError(INVALID_EMAIL_MESSAGE, 422);
    }

    const suggestion = getTypoSuggestion(email);
    if (suggestion) {
        const parts = splitEmail(email);
        throw new AppError(
            `That does not look like a real address. Did you mean ${parts.local}@${suggestion}?`,
            422,
        );
    }

    const shouldVerify = verifyDomain ?? dnsCheckEnabledByDefault();
    if (shouldVerify) {
        const { exists, uncertain } = await domainAcceptsMail(splitEmail(email).domain);
        if (!exists && !uncertain) {
            throw new AppError(UNREGISTERED_EMAIL_MESSAGE, 422);
        }
    }

    return email;
}

/**
 * Translates MongoDB's duplicate-key error into our own 409.
 *
 * Without this, two people submitting the same address at the same moment
 * both pass the "does it exist?" check and the loser gets an ugly 500 instead
 * of being told the address is taken.
 */
export function isDuplicateKeyError(err) {
    return err?.code === 11000 || err?.code === 11001;
}

export const DUPLICATE_EMAIL_MESSAGE = 'An account with this email address already exists';