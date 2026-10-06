import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { formatNaira } from "../../lib/formatNaira.js";

/**
 * Computes a simple week-over-week trend from the last 14 days of
 * revenue-by-day data: the most recent 7 days against the 7 before
 * that. No extra backend call needed, this is derived from data the
 * dashboard already fetches.
 */
function computeTrend(revenueByDay) {
  if (!revenueByDay || revenueByDay.length < 2) return null;

  const sorted = [...revenueByDay].sort((a, b) => a._id.localeCompare(b._id));
  const last7 = sorted.slice(-7).reduce((sum, d) => sum + d.revenue, 0);
  const prev7 = sorted.slice(-14, -7).reduce((sum, d) => sum + d.revenue, 0);

  if (prev7 === 0) return null; // nothing to compare against yet
  const change = ((last7 - prev7) / prev7) * 100;
  return { change, isUp: change >= 0 };
}

export default function RevenueCard({ totalRevenue, revenueByDay }) {
  const trend = computeTrend(revenueByDay);
  const sparklineData = (revenueByDay || []).map((d) => ({ value: d.revenue }));

  return (
    <div className='relative overflow-hidden rounded-card bg-gradient-to-br from-brand-dark to-neutral-800 text-white p-4 sm:p-6'>
      {/* Stacks below sm. Side by side, the sparkline's fixed w-28 and an
          unbreakable naira figure had to share 224px, so the revenue total
          was the thing that got clipped by overflow-hidden. */}
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2 mb-2'>
            <div className='bg-white/10 p-2 rounded-card'>
              <Wallet className='w-5 h-5 text-brand-accent' />
            </div>
            <p className='text-sm text-neutral-300'>Total revenue</p>
          </div>
          <p className='font-display font-bold text-2xl sm:text-3xl md:text-4xl break-words'>
            {formatNaira(totalRevenue)}
          </p>

          {trend && (
            <div
              className={`inline-flex items-center gap-1 mt-3 text-xs px-2 py-1 rounded-full ${
                trend.isUp
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}>
              {trend.isUp ? (
                <TrendingUp className='w-3 h-3' />
              ) : (
                <TrendingDown className='w-3 h-3' />
              )}
              {Math.abs(trend.change).toFixed(1)}% vs previous 7 days
            </div>
          )}
        </div>

        {sparklineData.length > 1 && (
          <div className='w-28 h-16 shrink-0'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id='sparkFill' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='#FF5A1F' stopOpacity={0.5} />
                    <stop offset='100%' stopColor='#FF5A1F' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type='monotone'
                  dataKey='value'
                  stroke='#FF5A1F'
                  strokeWidth={2}
                  fill='url(#sparkFill)'
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
