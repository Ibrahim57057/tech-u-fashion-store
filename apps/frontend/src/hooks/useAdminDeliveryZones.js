import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient.js';

// Shares the ['delivery-zones'] cache key with the public useDeliveryZones
// hook, so a fee edited here shows up in checkout without a refetch.
export function useAdminDeliveryZones() {
    const { data, isLoading } = useQuery({
        queryKey: ['delivery-zones'],
        queryFn: () => apiFetch('/delivery-zones'),
    });

    return { data: data ?? [], isLoading };
}

export function useSaveDeliveryZone() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) =>
            apiFetch(id ? `/delivery-zones/${id}` : '/delivery-zones', {
                method: id ? 'PATCH' : 'POST',
                body: data,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
        },
    });
}