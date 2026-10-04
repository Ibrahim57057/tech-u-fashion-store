import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchWithMeta } from '../lib/apiClient.js';

// apiFetchWithMeta rather than apiFetch: the endpoint is paginated, and the
// Users page needs the page count that apiFetch's `data` return drops.
export function useAdminUsers({ page = 1, limit = 20 } = {}) {
    return useQuery({
        queryKey: ['admin', 'users', page, limit],
        queryFn: () => apiFetchWithMeta(`/auth/users?page=${page}&limit=${limit}`),
    });
}

export function useUpdateUserRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, role }) => apiFetch(`/auth/users/${id}/role`, { method: 'PATCH', body: { role } }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    });
}

// Suspend / reinstate. There is no delete-user action anywhere in the app,
// deliberately: Order.user is a real reference, so removing the row would
// orphan every order that customer ever placed.
export function useUpdateUserStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, isActive }) =>
            apiFetch(`/auth/users/${id}/status`, { method: 'PATCH', body: { isActive } }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    });
}