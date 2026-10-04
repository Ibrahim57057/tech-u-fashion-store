/**
 * Where to send someone after they log in or register.
 *
 * RequireAuth passes the page the customer was trying to reach as `?from=`, so
 * an interrupted checkout resumes where it left off instead of dumping them on
 * the account page. That makes this value attacker-controlled: a crafted
 * /login?from=... must never redirect a freshly authenticated customer off-site.
 *
 * The two bypasses this has to close:
 *  - `//evil.example.com` is protocol-relative, so the browser treats the rest
 *    as a host rather than a path.
 *  - `/\evil.example.com` looks like a path, but browsers normalise backslashes
 *    to forward slashes before parsing, so it resolves to the same absolute
 *    URL. Checking only for "//" let this through.
 *
 * Anything else — a bare word, an absolute URL, or a value carrying control
 * characters — falls back to the account page.
 */

// Control characters, plus DEL. Written as escapes so this file stays plain
// text: an inline range of literal control bytes makes the file binary to
// diffs, editors and linters.
//
/* eslint-disable no-control-regex -- matching control characters is the
   entire point of this file; they are exactly what is being rejected. */
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
/* eslint-enable no-control-regex */

export function safeDestination(raw, fallback = '/account') {
  if (typeof raw !== 'string' || raw === '') return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (CONTROL_CHARS.test(raw)) return fallback;
  return raw;
}

export default safeDestination;