import { useState } from "react";
import { Download } from "lucide-react";
import {
  useAdminOrders,
  useUpdateOrderStatus,
} from "../../hooks/useAdminOrders.js";
import Select from "../../components/ui/Select.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import { formatNaira } from "../../lib/formatNaira.js";

// Every status an admin can move an order TO from its current one.
// Mirrors ORDER_STATUS_TRANSITIONS on the backend — if the backend
// rejects a move, the person just sees the error message, nothing
// breaks, this is only here to keep the dropdown's options sensible.
const nextStatusOptions = {
  pending_payment: ["confirmed", "cancelled"],
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["delivered", "failed_delivery"],
  delivered: [],
  cancelled: [],
  failed_delivery: [],
};

const statusStyles = {
  pending_payment: "warning",
  pending_confirmation: "warning",
  confirmed: "neutral",
  packed: "neutral",
  shipped: "neutral",
  delivered: "success",
  cancelled: "danger",
  failed_delivery: "danger",
};

const filterOptions = [
  { value: "", label: "All statuses" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminOrders(page, statusFilter, search);
  const { mutate: updateStatus } = useUpdateOrderStatus();

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  function exportCsv() {
    if (!data?.data.length) return;
    const rows = data.data.map((o) => [
      o.orderNumber,
      o.contact.fullName,
      o.contact.phone,
      o.status,
      (o.total / 100).toFixed(2),
      new Date(o.createdAt).toISOString(),
    ]);
    const header = [
      "Order Number",
      "Customer",
      "Phone",
      "Status",
      "Total (NGN)",
      "Date",
    ];
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* flex-wrap, not a single row: title + search + filter + button is
          ~540px of minimum width and a phone gives this 272px. Without
          wrapping the controls pushed past the admin panel's edge. */}
      <div className='flex flex-wrap items-center gap-3 mb-6'>
        <h1 className='font-display font-bold text-2xl text-brand-dark'>
          Orders
        </h1>
        <input
          type='search'
          placeholder='Search order number…'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className='border border-neutral-300 rounded-card px-3 py-1.5 text-sm w-full sm:w-56'
        />
        <Select
          options={filterOptions}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1); // a new filter should always start back at page 1
          }}
          className='w-full sm:w-56'
        />
        <Button size='sm' variant='outline' onClick={exportCsv}>
          <Download className='w-4 h-4 mr-2' />
          Export CSV
        </Button>
      </div>

      <div className='bg-white rounded-card border border-neutral-200 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead className='bg-neutral-50 text-left text-neutral-500'>
            <tr>
              <th className='p-3'>Order</th>
              <th className='p-3'>Customer</th>
              <th className='p-3'>Total</th>
              <th className='p-3'>Status</th>
              <th className='p-3'>Move to</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-neutral-100'>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className='p-3'>
                    <Skeleton className='h-8 w-full' />
                  </td>
                </tr>
              ))}

            {data?.data.map((order) => {
              const options = nextStatusOptions[order.status] || [];
              return (
                <tr key={order._id}>
                  <td className='p-3'>
                    <p className='font-medium text-brand-dark'>
                      {order.orderNumber}
                    </p>
                    <p className='text-xs text-neutral-500'>
                      {new Date(order.createdAt).toLocaleDateString("en-NG")}
                    </p>
                  </td>
                  <td className='p-3 text-neutral-600'>
                    {order.contact.fullName}
                  </td>
                  <td className='p-3 text-neutral-600'>
                    {formatNaira(order.total)}
                  </td>
                  <td className='p-3'>
                    <Badge variant={statusStyles[order.status] || "neutral"}>
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className='p-3'>
                    {options.length > 0 ? (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            updateStatus({
                              id: order._id,
                              status: e.target.value,
                            });
                          }
                        }}
                        value=''
                        className='border border-neutral-300 rounded-card text-sm px-2 py-1'>
                        <option value=''>Choose…</option>
                        {options.map((status) => (
                          <option key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className='text-xs text-neutral-400'>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
