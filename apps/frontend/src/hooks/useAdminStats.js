import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient.js';
import { useAuth } from './useAuth.js';
import { isAdmin } from '../features/admin/permissions.js';

export function useAdminStats() {
    const { user } = useAuth();
    const adminOnly = isAdmin(user);

    const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => apiFetch('/admin/stats') });

    // Top products is admin-only on the API (it carries per-product revenue),
    // so a staff session must not fire a request the server will refuse —
    // disabled queries never leave the ground, and isLoading stays false.
    const topProducts = useQuery({
        queryKey: ['admin', 'top-products'],
        queryFn: () => apiFetch('/admin/top-products'),
        enabled: adminOnly,
    });

    return {
        stats: stats.data,
        topProducts: topProducts.data,
        adminOnly,
        isLoading: stats.isLoading || topProducts.isLoading,
    };
}

export function useRevenueByDay() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['admin', 'revenue-by-day'],
        queryFn: () => apiFetch('/admin/revenue-by-day'),
        enabled: isAdmin(user),
    });
}
