import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient.js';

export function useAdminStats() {
    const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => apiFetch('/admin/stats') });
    const topProducts = useQuery({
        queryKey: ['admin', 'top-products'],
        queryFn: () => apiFetch('/admin/top-products'),
    });
    return { stats: stats.data, topProducts: topProducts.data, isLoading: stats.isLoading || topProducts.isLoading };
}

export function useRevenueByDay() {
    return useQuery({
        queryKey: ['admin', 'revenue-by-day'],
        queryFn: () => apiFetch('/admin/revenue-by-day'),
    });
}