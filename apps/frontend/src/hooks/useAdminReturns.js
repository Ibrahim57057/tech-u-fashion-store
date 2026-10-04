import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetchWithMeta, apiFetch } from '../lib/apiClient.js';

// Paginated on the server; apiFetchWithMeta keeps the `meta.total` the pager
// needs, which apiFetch's `data`-only return would drop.
export function useAdminReturns({ page = 1, limit = 20 } = {}) {
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'returns', page],
        queryFn: () => apiFetchWithMeta(`/returns/admin?page=${page}&limit=${limit}`),
        placeholderData: (previous) => previous,
    });
    return { returns: data?.data ?? [], total: data?.meta?.total ?? 0, isLoading };
}

export function useUpdateReturn() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, adminNote }) =>
            apiFetch(`/returns/${id}`, { method: 'PATCH', body: { status, adminNote } }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] }),
    });
}