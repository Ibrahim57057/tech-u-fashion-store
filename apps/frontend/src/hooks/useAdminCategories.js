import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient.js';

export function useAdminCategories() {
    const { data } = useQuery({ queryKey: ['categories'], queryFn: () => apiFetch('/categories') });
    return { data };
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data) => apiFetch('/categories', { method: 'POST', body: data }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => apiFetch(`/categories/${id}`, { method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    });
}