import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
/**
 * Split out of AdminDashboardPage and loaded lazily, so recharts only
 * loads for someone who is actually looking at the admin dashboard.
 */
export default function RevenueChart({ revenueByDay }) {
  if (!revenueByDay?.length) {
    return (
      <p className='text-sm text-neutral-500'>
        No revenue in the last 14 days.
      </p>
    );
  }

  return (
    <ResponsiveContainer width='100%' height='100%'>
      <LineChart
        data={revenueByDay.map((d) => ({
          date: d._id.slice(5),
          // Stored in kobo; divide down to naira before charting so the
          // axis and tooltip read in real money.
          revenue: d.revenue / 100,
        }))}>
        <XAxis dataKey='date' tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => `₦${value.toLocaleString("en-NG")}`}
        />
        <Line
          type='monotone'
          dataKey='revenue'
          stroke='#FF5A1F'
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}