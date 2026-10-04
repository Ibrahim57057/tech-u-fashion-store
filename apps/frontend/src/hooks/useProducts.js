import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiFetchWithMeta } from '../lib/apiClient.js';

/**
 * All filtering happens on the server, before it paginates. Doing it in the
 * browser instead is what made the categories look empty — the newest 20
 * products were all clothing, so sneakers found nothing to show, and the
 * "N items" count described the whole catalogue rather than the selection.
 *
 * The server also returns meta.filters: the sizes, colours and brands that
 * actually exist, so the sidebar never drifts from the data.
 *
 * Passing no filters returns the whole catalogue in one page, which is what
 * HomePage, SearchBar, WishlistPage and ProductDetailPage (related items)
 * want — they need everything to search through.
 */
export function useProducts({
    category,
    sizes,
    colors,
    brands,
    sort,
    search,
    limit = 100,
} = {}) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    // Comma-separated, which the server understands.
    if (sizes?.length) params.set('size', sizes.join(','));
    if (colors?.length) params.set('color', colors.join(','));
    if (brands?.length) params.set('brand', brands.join(','));

    // Arrays are flattened to strings for the cache key: React Query hashes
    // the key, and a fresh [] on every render would defeat the cache.
    const { data, isLoading } = useQuery({
        queryKey: [
            'products',
            category ?? 'all',
            sizes?.join('|') ?? '',
            colors?.join('|') ?? '',
            brands?.join('|') ?? '',
            sort ?? 'default',
            search ?? '',
            limit,
        ],
        queryFn: () => apiFetchWithMeta(`/products?${params.toString()}`),
    });

    // Hand callers the array, not the envelope, so every existing
    // consumer (HomePage, SearchBar, Wishlist, ProductDetail) keeps
    // working against `products.map(...)` unchanged.
    return { data: data?.data, meta: data?.meta, isLoading };
}

export function useProduct(slug) {
    const { data, isLoading } = useQuery({
        queryKey: ['product', slug],
        queryFn: () => apiFetch(`/products/${slug}`),
        enabled: !!slug, // don't fetch until we actually have a slug
    });
    return { data, isLoading };
}