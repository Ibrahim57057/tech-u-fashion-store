import { describe, it, expect } from 'vitest';
import { sniffImageMime } from './upload.js';

// Minimal but real headers. Magic-byte sniffing only reads the first dozen
// bytes, so these are the only parts that matter.
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(16),
]);
const gif = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(16)]);
const webp = Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    Buffer.alloc(4),
    Buffer.from('WEBP', 'latin1'),
    Buffer.alloc(16),
]);

describe('sniffImageMime', () => {
    it('recognises the formats we accept', () => {
        expect(sniffImageMime(jpeg)).toBe('image/jpeg');
        expect(sniffImageMime(png)).toBe('image/png');
        expect(sniffImageMime(gif)).toBe('image/gif');
        expect(sniffImageMime(webp)).toBe('image/webp');
    });

    // The whole point: the browser's Content-Type header is attacker-supplied,
    // so a script with a declared image/png must be caught by its bytes.
    it('rejects a script disguised as an image', () => {
        const script = Buffer.from('<script>alert(document.cookie)</script>', 'utf8');

        expect(sniffImageMime(script)).toBeNull();
    });

    it('rejects an HTML document', () => {
        const html = Buffer.from('<!DOCTYPE html><html><body>hi</body></html>', 'utf8');

        expect(sniffImageMime(html)).toBeNull();
    });

    // SVG can carry <script>. Once Cloudinary serves it from our own domain
    // that is stored XSS on a trusted origin, so it must never pass.
    it('rejects SVG', () => {
        const svg = Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
            'utf8',
        );

        expect(sniffImageMime(svg)).toBeNull();
    });

    it('rejects a PDF', () => {
        const pdf = Buffer.from('%PDF-1.7\n...', 'latin1');

        expect(sniffImageMime(pdf)).toBeNull();
    });

    it('rejects an ELF binary', () => {
        const elf = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0, 0, 0, 0, 0]);

        expect(sniffImageMime(elf)).toBeNull();
    });

    // Truncated past the header check, so it cannot be classified.
    it('rejects truncated input', () => {
        expect(sniffImageMime(Buffer.alloc(4))).toBeNull();
        expect(sniffImageMime(Buffer.alloc(0))).toBeNull();
        expect(sniffImageMime(undefined)).toBeNull();
    });
});