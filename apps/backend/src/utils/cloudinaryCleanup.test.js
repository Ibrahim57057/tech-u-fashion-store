import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publicIdFromUrl } from './cloudinaryCleanup.js';

const destroy = vi.fn();
// Path as the module under test resolves it, not as the test file sits.
vi.mock('../config/cloudinary.js', () => ({
    default: { uploader: { destroy: (...args) => destroy(...args) } },
}));

const { destroyCloudinaryAsset, destroyCloudinaryAssets } = await import(
    './cloudinaryCleanup.js'
);

beforeEach(() => {
    destroy.mockReset();
    destroy.mockResolvedValue({ result: 'ok' });
});

describe('publicIdFromUrl', () => {
    it('recovers the folder and name from an upload URL', () => {
        expect(
            publicIdFromUrl(
                'https://res.cloudinary.com/demo/image/upload/v1699999999/techu-products/abc123.jpg',
            ),
        ).toBe('techu-products/abc123');
    });

    it('handles a URL with no version segment', () => {
        expect(
            publicIdFromUrl('https://res.cloudinary.com/demo/image/upload/techu-products/abc123.png'),
        ).toBe('techu-products/abc123');
    });

    it('strips the file extension', () => {
        expect(
            publicIdFromUrl('https://res.cloudinary.com/demo/image/upload/techu-products/x.webp'),
        ).toBe('techu-products/x');
    });

    // The security-relevant case: a hand-entered external URL must never
    // resolve to an id we would then ask Cloudinary to delete.
    it('returns null for a non-Cloudinary URL', () => {
        expect(publicIdFromUrl('https://example.com/photo.jpg')).toBeNull();
    });

    // The security-relevant case. My first version of this regex only looked for
    // the `/image/upload/` path segment, which any host can fake — so a URL
    // like this resolved to a real public id and the server would happily ask
    // Cloudinary to delete it. The hostname has to be checked, not just the path.
    it('returns null when another host fakes the Cloudinary path', () => {
        expect(
            publicIdFromUrl('https://evil.test/image/upload/techu-products/x.jpg'),
        ).toBeNull();
        expect(
            publicIdFromUrl('https://res.cloudinary.com.attacker.test/image/upload/techu-products/x.jpg'),
        ).toBeNull();
        expect(
            publicIdFromUrl('http://res.cloudinary.com/image/upload/techu-products/x.jpg'),
        ).toBeNull();
    });

    it('returns null for junk input', () => {
        expect(publicIdFromUrl(undefined)).toBeNull();
        expect(publicIdFromUrl(null)).toBeNull();
        expect(publicIdFromUrl('')).toBeNull();
        expect(publicIdFromUrl(42)).toBeNull();
    });
});

describe('destroyCloudinaryAsset', () => {
    it('deletes an asset we uploaded', async () => {
        const url = 'https://res.cloudinary.com/demo/image/upload/v1/techu-products/a.jpg';

        await expect(destroyCloudinaryAsset(url)).resolves.toBe(true);
        expect(destroy).toHaveBeenCalledWith('techu-products/a');
    });

    it('does not call Cloudinary for a foreign URL', async () => {
        await expect(destroyCloudinaryAsset('https://example.com/x.jpg')).resolves.toBe(false);
        expect(destroy).not.toHaveBeenCalled();
    });

    // A cleanup problem must not surface as a failed product edit.
    it('swallows a Cloudinary error rather than throwing', async () => {
        destroy.mockRejectedValueOnce(new Error('API rate limit exceeded'));
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(
            destroyCloudinaryAsset(
                'https://res.cloudinary.com/demo/image/upload/techu-products/a.jpg',
            ),
        ).resolves.toBe(false);

        spy.mockRestore();
    });
});

describe('destroyCloudinaryAssets', () => {
    it('deletes each removed asset and reports them', async () => {
        const urls = [
            'https://res.cloudinary.com/demo/image/upload/v1/techu-products/a.jpg',
            'https://res.cloudinary.com/demo/image/upload/v1/techu-products/b.jpg',
        ];

        await expect(destroyCloudinaryAssets(urls)).resolves.toEqual({
            removed: urls,
            failed: [],
        });
        expect(destroy).toHaveBeenCalledTimes(2);
    });

    // One bad URL must not stop the others being cleaned up.
    it('keeps going past a foreign URL', async () => {
        const ours = 'https://res.cloudinary.com/demo/image/upload/v1/techu-products/a.jpg';

        const result = await destroyCloudinaryAssets(['https://example.com/x.jpg', ours]);

        expect(result.removed).toEqual([ours]);
        expect(result.failed).toEqual([]);
        expect(destroy).toHaveBeenCalledTimes(1);
    });

    it('separates assets Cloudinary rejected from foreign URLs', async () => {
        destroy.mockRejectedValueOnce(new Error('not found'));

        const result = await destroyCloudinaryAssets([
            'https://res.cloudinary.com/demo/image/upload/v1/techu-products/a.jpg',
            'https://example.com/x.jpg',
        ]);

        expect(result.removed).toEqual([]);
        expect(result.failed).toEqual([
            'https://res.cloudinary.com/demo/image/upload/v1/techu-products/a.jpg',
        ]);
    });

    it('handles an empty list', async () => {
        await expect(destroyCloudinaryAssets([])).resolves.toEqual({ removed: [], failed: [] });
        expect(destroy).not.toHaveBeenCalled();
    });
});