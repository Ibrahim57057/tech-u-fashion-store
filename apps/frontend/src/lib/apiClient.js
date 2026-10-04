const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1').replace(/\/+$/, '');

/**
 * The API root, for the one request that cannot use `request()`: image
 * uploads, which need multipart form data rather than JSON.
 *
 * Exported so no caller has to hardcode localhost — that hardcoding meant
 * image uploads kept pointing at a developer's laptop in any deployed build.
 */
export const API_BASE_URL = BASE_URL;

async function request(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        credentials: 'include', // send/receive the httpOnly login cookie
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
        const details = json?.error?.details; // per-field Zod issues, when present
        const error = new Error(
            details?.[0]?.message ||
                json?.error?.message ||
                `Request failed (${res.status})`,
        );
        // Form pages need to know WHICH field failed, not just the first
        // message — key them by the path the backend reported.
        const fields = Object.fromEntries((details ?? []).map((d) => [d.path, d.message]));
        error.fields = fields;
        // Both names are set because form pages use both spellings; the alias
        // keeps either working without touching every call site.
        error.fieldErrors = fields;
        error.status = res.status;
        throw error;
    }

    return json;
}

/**
 * The one way the frontend talks to the backend. Returns the `data`
 * part of a successful response, and throws an Error whose message is
 * the first thing worth showing the user if anything goes wrong.
 */
export async function apiFetch(path, options) {
    const json = await request(path, options);
    return json.data;
}

/**
 * Same request, but hands back the whole envelope. Paginated endpoints
 * put the page count in `meta`, which apiFetch drops — callers that
 * render a <Pagination> need this one instead.
 */
export async function apiFetchWithMeta(path, options) {
    return request(path, options);
}