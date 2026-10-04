import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchWithMeta } from '../lib/apiClient.js';

export function useAdminProducts(page = 1, search = '') {
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);

    return useQuery({
        queryKey: ['admin', 'products', page, search],
        // WithMeta: this table paginates, so it needs meta.total/meta.limit.
        queryFn: () => apiFetchWithMeta(`/products?${params.toString()}`),
    });
}

export function useAdminProduct(id) {
    return useQuery({
        queryKey: ['admin', 'product', id],
        queryFn: () => apiFetch(`/products/by-id/${id}`),
        enabled: !!id,
    });
}

export function useSaveProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) =>
            apiFetch(id ? `/products/${id}` : '/products', { method: id ? 'PATCH' : 'POST', body: data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        },
    });
}

export function useBulkDeactivate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (ids) => apiFetch('/products/bulk-deactivate', { method: 'PATCH', body: { ids } }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
    });
}