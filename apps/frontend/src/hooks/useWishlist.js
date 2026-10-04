import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient.js';
import { useAuth } from './useAuth.js';

/**
 * Backed by the real backend now. Logged-out visitors simply see an
 * empty, read-only wishlist rather than an error, since the wishlist
 * page and heart icons should still render for them.
 */
export function useWishlist() {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const { data: products } = useQuery({
        queryKey: ['wishlist'],
        queryFn: () => apiFetch('/wishlist'),
        enabled: isAuthenticated,
        staleTime: 30_000,
    });

    const items = products ?? [];
    const productIds = items.map((p) => p.id);

    // The toggle endpoint only returns the id list, so refetch for the
    // full product details the heart icons and wishlist page render.
    const { mutate } = useMutation({
        mutationFn: (productId) =>
            apiFetch(`/wishlist/${productId}`, { method: 'POST' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
    });

    function isWishlisted(productId) {
        return productIds.includes(productId);
    }

    return {
        products: items,
        productIds,
        // No-op while logged out, so the heart icon never throws.
        toggle: isAuthenticated ? mutate : () => {},
        isWishlisted,
    };
}