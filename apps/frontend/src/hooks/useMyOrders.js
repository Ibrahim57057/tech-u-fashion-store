import { useQuery } from '@tanstack/react-query';
import { apiFetchWithMeta } from '../lib/apiClient.js';

/**
 * The logged-in customer's real orders. `enabled` stops the request
 * from firing while logged out, where it would just return a 401.
 *
 * apiFetchWithMeta because the endpoint is paginated — the account page needs
 * `meta.total` for the pager, and apiFetch returns only the `data` array.
 */
export function useMyOrders(enabled = true, { page = 1, limit = 20 } = {}) {
    const { data, isLoading } = useQuery({
        queryKey: ['my-orders', page],
        queryFn: () => apiFetchWithMeta(`/orders?page=${page}&limit=${limit}`),
        enabled,
        placeholderData: (previous) => previous,
    });
    return { data: data?.data, meta: data?.meta, isLoading };
}