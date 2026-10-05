import { lazy, Suspense } from "react";
import {
  ShoppingBag,
  Calendar,
  Clock,
  AlertTriangle,
  Users,
} from "lucide-react";
import { useAdminStats, useRevenueByDay } from "../../hooks/useAdminStats.js";
import StatCard from "../../features/admin/StatCard.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import { formatNaira } from "../../lib/formatNaira.js";

// recharts pulls in d3 and the rest of its stack, which more than
// doubles the app bundle. Lazy-loading it means the storefront never
// downloads the chart library — only the admin dashboard does, and only
// once this page is actually opened. Both the featured revenue card
// (its sparkline) and the 14-day chart use recharts, so both are
// lazy-loaded the same way.
const RevenueChart = lazy(() => import("./RevenueChart.jsx"));
const RevenueCard = lazy(() => import("../../features/admin/RevenueCard.jsx"));

export default function AdminDashboardPage() {
  const { stats, topProducts, isLoading } = useAdminStats();
  const { data: revenueByDay } = useRevenueByDay();

  if (!isLoading && !stats) {
    return (
      <p className='text-sm text-danger'>
        Could not load dashboard data. Try logging in again.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className='h-20' />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className='font-display font-bold text-2xl text-brand-dark mb-6'>
        Dashboard
      </h1>

      <div className='mb-6'>
        <Suspense fallback={<Skeleton className='h-36 w-full' />}>
          <RevenueCard
            totalRevenue={stats.totalRevenue}
            revenueByDay={revenueByDay}
          />
        </Suspense>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-10'>
        <StatCard
          label='Total orders'
          value={stats.totalOrders}
          icon={ShoppingBag}
        />
        <StatCard
          label='Orders today'
          value={stats.ordersToday}
          icon={Calendar}
        />
        <StatCard
          label='Pending payment'
          value={stats.pendingOrders}
          icon={Clock}
        />
        <StatCard
          label='Low stock items'
          value={stats.lowStockProducts}
          icon={AlertTriangle}
        />
        <StatCard label='Customers' value={stats.totalCustomers} icon={Users} />
      </div>

      <h2 className='font-display font-semibold text-lg text-brand-dark mb-4'>
        Top products
      </h2>
      <div className='bg-white rounded-card border border-neutral-200 divide-y divide-neutral-100'>
        {topProducts.length === 0 && (
          <p className='p-4 text-sm text-neutral-500'>No sales yet.</p>
        )}
        {topProducts.map((product) => (
          <div
            key={product._id}
            className='flex items-center justify-between p-4'>
            <p className='text-sm text-brand-dark'>{product.name}</p>
            <div className='text-right'>
              <p className='text-sm font-semibold text-brand-dark'>
                {product.unitsSold} sold
              </p>
              <p className='text-xs text-neutral-500'>
                {formatNaira(product.revenue)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <h2 className='font-display font-semibold text-lg text-brand-dark mb-4 mt-10'>
        Revenue, last 14 days
      </h2>
      <div className='bg-white rounded-card border border-neutral-200 p-4 h-64'>
        <Suspense
          fallback={<p className='text-sm text-neutral-500'>Loading chart…</p>}>
          <RevenueChart revenueByDay={revenueByDay} />
        </Suspense>
      </div>
    </div>
  );
}
