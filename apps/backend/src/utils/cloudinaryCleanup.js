import cloudinary from '../config/cloudinary.js';

/**
 * Derives the Cloudinary public id from a delivery URL.
 *
 * Upload returns only `secure_url`, so the id has to be recovered from it to
 * delete anything later. Both URL forms are accepted:
 *   https://res.cloudinary.com/<cloud>/image/upload/v1234/techu-products/abc.jpg
 *   .../techu-products/abc.jpg
 *
 * The `upload/` segment and any transformation/version segment is dropped —
 * Cloudinary wants `folder/name`, not `folder/name/v1` or the resized
 * derivative. Returns null for anything that is not one of our Cloudinary
 * uploads, which is the important case: the caller must not attempt to delete
 * an arbitrary URL someone else put in the array.
 */
export function publicIdFromUrl(url) {
    if (typeof url !== 'string' || !url) return null;

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }

    // The hostname has to be checked, not just the path. `/image/upload/` is a
    // plain string that any host can put in its own URL, and matching on the
    // path alone would let a hand-entered link make this server ask Cloudinary
    // to delete an asset it does not own. Protocol-relative and plain-HTTP forms
    // are rejected too.
    if (parsed.protocol !== 'https:') return null;
    if (parsed.hostname !== 'res.cloudinary.com') return null;

    // /image/upload/<version>/<public_id>  or  /image/upload/<public_id>
    const match = parsed.pathname.match(/^\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (!match) return null;

    const publicId = decodeURIComponent(match[1]).replace(/\//g, '/').trim();
    return publicId || null;
}

/**
 * Deletes one uploaded asset from Cloudinary.
 *
 * Only meaningful for URLs we produced; anything else is ignored so a
 * hand-entered external URL in the images array cannot be used to make the
 * server issue a delete against a stranger's asset.
 *
 * Never throws. A cleanup failure must not fail the caller's request — the
 * product state change has already been saved, and returning a 500 there would
 * leave the admin thinking the edit rolled back when it did not. The orphaned
 * asset is recoverable; silently failing the request is not.
 *
 * @returns {Promise<boolean>} true if Cloudinary confirmed the deletion.
 */
export async function destroyCloudinaryAsset(url) {
    const publicId = publicIdFromUrl(url);
    if (!publicId) return false;

    try {
        await cloudinary.uploader.destroy(publicId);
        return true;
    } catch (err) {
        console.error('[cloudinary] cleanup failed for', publicId, '-', err.message);
        return false;
    }
}

/**
 * Deletes several assets, one at a time and never throwing.
 * @returns {Promise<{removed: string[], failed: string[]}>}
 */
export async function destroyCloudinaryAssets(urls = []) {
    const removed = [];
    const failed = [];

    for (const url of urls) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await destroyCloudinaryAsset(url);
        if (ok) removed.push(url);
        else if (publicIdFromUrl(url)) failed.push(url);
    }

    return { removed, failed };
}