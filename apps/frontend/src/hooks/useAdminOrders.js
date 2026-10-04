import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchWithMeta } from '../lib/apiClient.js';

export function useAdminOrders(page = 1, status = '', search = '') {
    const params = new URLSearchParams({ page, limit: 20 });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    return useQuery({
        queryKey: ['admin', 'orders', page, status, search],
        // WithMeta: this table paginates, so it needs meta.total/meta.limit.
        queryFn: () => apiFetchWithMeta(`/orders/admin?${params.toString()}`),
    });
}
export function useUpdateOrderStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, note }) =>
            apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: { status, note } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        },
    });
}