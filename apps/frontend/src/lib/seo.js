/**
 * Sets the document title and Open Graph meta tags for the current
 * page. Since this is a React SPA (not server-rendered), these tags
 * update dynamically as the user navigates — good enough for the
 * browser tab title and, importantly, for search engines that execute
 * JavaScript when indexing. Real server-side rendering of these tags
 * (for social previews to work without JS) would require a different
 * architecture — noted honestly, not solved here.
 */
export function setPageSEO({ title, description, image }) {
    document.title = title ? `${title} | TECH-U Fashion Store` : 'TECH-U Fashion Store';

    setMetaTag('description', description);
    setMetaTag('og:title', title, 'property');
    setMetaTag('og:description', description, 'property');
    setMetaTag('og:image', image, 'property');
    setMetaTag('og:type', 'website', 'property');
}

function setMetaTag(name, content, attr = 'name') {
    const existing = document.querySelector(`meta[${attr}="${name}"]`);

    if (!content) {
        // Removing beats leaving stale data behind: a leftover og:image
        // from the last product would produce a wrong social preview.
        existing?.remove();
        return;
    }

    const tag = existing ?? document.createElement('meta');
    if (!existing) {
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
}