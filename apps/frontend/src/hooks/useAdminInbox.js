import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetchWithMeta, apiFetch } from '../lib/apiClient.js';

/**
 * The contact-form inbox. Uses the meta variant for the unread count.
 *
 * Paginated on the server: `unread` is now a countDocuments() result covering
 * the whole inbox, not a count of the rows on this page.
 */
export function useAdminMessages({ page = 1, limit = 20 } = {}) {
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'messages', page],
        queryFn: () => apiFetchWithMeta(`/contact/admin?page=${page}&limit=${limit}`),
        placeholderData: (previous) => previous,
    });
    return {
        messages: data?.data ?? [],
        unread: data?.meta?.unread ?? 0,
        total: data?.meta?.total ?? 0,
        isLoading,
    };
}

export function useUpdateMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }) =>
            apiFetch(`/contact/admin/${id}`, { method: 'PATCH', body: { status } }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] }),
    });
}

/** Newsletter subscribers, including soft-unsubscribed ones. */
export function useAdminSubscribers({ page = 1, limit = 20 } = {}) {
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'subscribers', page],
        queryFn: () => apiFetchWithMeta(`/newsletter/subscribers?page=${page}&limit=${limit}`),
        placeholderData: (previous) => previous,
    });
    return {
        subscribers: data?.data ?? [],
        active: data?.meta?.active ?? 0,
        total: data?.meta?.total ?? 0,
        isLoading,
    };
}