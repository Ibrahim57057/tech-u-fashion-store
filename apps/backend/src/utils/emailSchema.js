import { z } from 'zod';
import { isValidEmailFormat, INVALID_EMAIL_MESSAGE } from './emailValidation.js';

/**
 * The email field, defined once so every form that takes an address agrees.
 *
 * `.trim().toLowerCase()` is not cosmetic. Addresses get pasted with a
 * trailing space, and without it Zod rejected " tester@gmail.com " with a
 * bare "Validation failed" before the controller ever got a chance to look
 * the account up — so a stray space read as "that address doesn't exist".
 * Normalising at the schema boundary also guarantees the controller always
 * receives the canonical casing.
 *
 * The heavier rules stay in the controller, which has the async work to do:
 * the typo-domain blocklist, the DNS check and the duplicate lookup.
 */
export const emailField = z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidEmailFormat, { error: INVALID_EMAIL_MESSAGE });