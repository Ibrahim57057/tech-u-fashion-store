import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { canAccessAdmin } from "../features/admin/permissions.js";
import { useMyOrders } from "../hooks/useMyOrders.js";
import Button from "../components/ui/Button.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import { formatNaira } from "../lib/formatNaira.js";

const ORDERS_PER_PAGE = 10;

export default function AccountPage() {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const { data: orders, meta: ordersMeta, isLoading: ordersLoading } =
    useMyOrders(isAuthenticated, { page, limit: ORDERS_PER_PAGE });
  const navigate = useNavigate();

  const orderPages = Math.max(1, Math.ceil((ordersMeta?.total ?? 0) / ORDERS_PER_PAGE));

  // Wait for the session check to finish before deciding to redirect.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || !isAuthenticated) return null;

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className='px-4 sm:px-6 py-10 max-w-3xl mx-auto'>
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h1 className='font-display font-bold text-2xl text-brand-dark'>
            Hi, {user.name}
          </h1>
          <p className='text-sm text-neutral-500'>{user.email}</p>
        </div>
        <Button variant='outline' size='sm' onClick={handleLogout}>
          Log out
        </Button>
      </div>

      {/* A named entry point to the admin area. The header icon is easy to
          miss, which is how "the admin panel has disappeared" gets reported
          by people who are, in fact, correctly signed in. */}
      {canAccessAdmin(user) && (
        <Link
          to='/admin'
          className='mb-8 inline-flex items-center gap-2 rounded-card border border-neutral-300 px-4 py-2 font-body text-sm text-brand-dark hover:border-brand-accent2'>
          <Shield className='w-4 h-4 text-brand-accent2' />
          Open admin panel
        </Link>
      )}

      <h2 className='font-display font-semibold text-lg text-brand-dark mb-4'>
        Order history
      </h2>

      {ordersLoading && (
        <div className='space-y-3'>
          <Skeleton className='h-16 w-full' />
          <Skeleton className='h-16 w-full' />
        </div>
      )}

      {!ordersLoading && orders?.length === 0 && (
        <EmptyState
          title='No orders yet'
          message="Once you place an order, it'll show up here."
          actionLabel='Start shopping'
          actionTo='/products'
        />
      )}

      <div className='space-y-3'>
        {orders?.map((order) => (
          // _id, not id: the endpoint uses .lean(), and lean results have no
          // `id` virtual — keying on it gave every row the same undefined key.
          <OrderRow key={order._id} order={order} />
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={orderPages}
        onPageChange={setPage}
      />
    </div>
  );
}

// One entry per status in the backend's ORDER_STATUS list.
const statusStyles = {
  pending_payment: "bg-amber-100 text-warning",
  pending_confirmation: "bg-amber-100 text-warning",
  confirmed: "bg-blue-100 text-brand-accent2",
  packed: "bg-blue-100 text-brand-accent2",
  shipped: "bg-blue-100 text-brand-accent2",
  delivered: "bg-green-100 text-success",
  cancelled: "bg-red-100 text-danger",
  failed_delivery: "bg-red-100 text-danger",
};

function OrderRow({ order }) {
  return (
    <div className='border border-neutral-200 rounded-card p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='min-w-0'>
          <p className='font-medium text-brand-dark text-sm truncate'>
            {order.orderNumber}
          </p>
          <p className='text-xs text-neutral-500'>
            {new Date(order.createdAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap shrink-0 ${
            statusStyles[order.status] || "bg-neutral-100 text-neutral-600"
          }`}>
          {order.status.replace(/_/g, " ")}
        </span>
      </div>
      <div className='flex items-center justify-between mt-3 text-sm'>
        <p className='text-neutral-500'>
          {order.items.reduce((sum, i) => sum + i.qty, 0)} item(s)
        </p>
        <p className='font-semibold text-brand-dark'>
          {formatNaira(order.total)}
        </p>
      </div>
    </div>
  );
}
