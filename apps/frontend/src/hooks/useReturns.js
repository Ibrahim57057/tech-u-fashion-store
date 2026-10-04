import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient.js';

/** The logged-in customer's return requests. */
export function useMyReturns(enabled = true) {
    const { data, isLoading } = useQuery({
        queryKey: ['my-returns'],
        queryFn: () => apiFetch('/returns'),
        enabled,
    });
    return { data, isLoading };
}

/**
 * POST /returns only accepts DELIVERED orders and rejects duplicates, so
 * the caller should pick from a list the backend already filtered.
 * On success we refetch, since the returned object doesn't carry the
 * status the backend will have assigned.
 */
export function useCreateReturn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, reason }) =>
            apiFetch('/returns', {
                method: 'POST',
                body: { orderId, reason },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-returns'] });
            queryClient.invalidateQueries({ queryKey: ['my-orders'] });
        },
    });
}