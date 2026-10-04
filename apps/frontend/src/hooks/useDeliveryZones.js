import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient.js';

export function useDeliveryZones() {
    const { data, isLoading } = useQuery({
        queryKey: ['delivery-zones'],
        queryFn: () => apiFetch('/delivery-zones'),
    });
    return { data, isLoading };
}