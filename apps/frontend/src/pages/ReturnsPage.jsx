import { useState } from "react";
import { Link } from "react-router-dom";
import FadeIn from "../components/ui/FadeIn.jsx";
import Breadcrumbs from "../layout/Breadcrumbs.jsx";
import Button from "../components/ui/Button.jsx";
import Select from "../components/ui/Select.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useMyOrders } from "../hooks/useMyOrders.js";
import { useMyReturns, useCreateReturn } from "../hooks/useReturns.js";
import { usePageSEO } from "../hooks/usePageSEO.js";

const RETURN_STATUS_STYLES = {
  requested: "bg-amber-100 text-warning",
  approved: "bg-blue-100 text-brand-accent2",
  rejected: "bg-red-100 text-danger",
  completed: "bg-green-100 text-success",
};

/**
 * Returns & exchanges. Explains the policy, and for logged-in customers
 * actually submits a request to POST /returns against a delivered order.
 */
export default function ReturnsPage() {
  usePageSEO({
    title: "Returns & exchanges",
    description:
      "Start a return or exchange with TECH-U Fashion Store within 7 days of delivery.",
  });

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  // A deliberately large page: this list is used to populate the "which order
  // are you returning?" picker, filtered down to delivered ones. Truncating it
  // to one page would hide an older order the customer is entitled to return.
  const { data: orders, isLoading: ordersLoading } = useMyOrders(
    isAuthenticated,
    { limit: 100 },
  );
  const { data: returns, isLoading: returnsLoading } =
    useMyReturns(isAuthenticated);
  const { mutate: createReturn, isPending, error } = useCreateReturn();

  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  // The backend only accepts DELIVERED orders, so offer only those, minus
  // any that already have a return in flight.
  const alreadyRequested = new Set((returns ?? []).map((r) => r.order));
  const returnableOrders = (orders ?? []).filter(
    (o) => o.status === "delivered" && !alreadyRequested.has(o.id ?? o._id),
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!orderId || reason.trim().length < 5) return;

    createReturn(
      { orderId, reason: reason.trim() },
      {
        onSuccess: () => {
          setOrderId("");
          setReason("");
          setDone(true);
        },
      },
    );
  }

  return (
    <div className='px-4 sm:px-6 py-12 max-w-3xl mx-auto'>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Returns & exchanges" },
        ]}
      />

      <FadeIn>
        <h1 className='font-display font-bold text-3xl text-brand-dark mb-4'>
          Returns & exchanges
        </h1>
        <p className='text-neutral-600 mb-8'>
          Changed your mind? Send the item back within 7 days of delivery and
          we'll refund it.
        </p>

        <section className='mb-10'>
          <h2 className='font-display font-semibold text-lg text-brand-dark mb-3'>
            How it works
          </h2>
          <ol className='space-y-3 text-neutral-600 list-decimal list-inside'>
            <li>Request a return below using your order number.</li>
            <li>
              We review it and confirm — usually within 1 working day.
            </li>
            <li>
              We'll arrange pickup, or you can drop the parcel off with our
              courier.
            </li>
            <li>
              Your refund lands 3–5 working days after we receive the item.
            </li>
          </ol>
        </section>

        <section className='mb-10'>
          <h2 className='font-display font-semibold text-lg text-brand-dark mb-3'>
            What can be returned
          </h2>
          <ul className='list-disc list-inside space-y-1 text-neutral-600'>
            <li>Unworn and unwashed, with tags still attached</li>
            <li>In the original packaging</li>
            <li>Requested within 7 days of delivery</li>
          </ul>
          <p className='text-sm text-neutral-500 mt-3'>
            For hygiene reasons we can't accept returns of underwear, socks or
            pierced jewellery. Sale items are final.
          </p>
        </section>

        {!authLoading && !isAuthenticated && (
          <div className='border border-neutral-200 rounded-card p-6 text-center'>
            <p className='text-neutral-600 mb-4'>
              Sign in to request a return or exchange.
            </p>
            <div className='flex gap-3 justify-center'>
              <Link to='/login'>
                <Button>Log in</Button>
              </Link>
              <Link to='/account'>
                <Button variant='outline'>My orders</Button>
              </Link>
            </div>
          </div>
        )}

        {isAuthenticated && (
          <section className='mb-10'>
            <h2 className='font-display font-semibold text-lg text-brand-dark mb-3'>
              Request a return
            </h2>

            {done ? (
              <div className='border border-neutral-200 rounded-card p-6'>
                <p className='text-success font-medium mb-4'>
                  Request received — we&apos;ll confirm it by email shortly.
                </p>
                <Button
                  variant='outline'
                  onClick={() => setDone(false)}>
                  Request another
                </Button>
              </div>
            ) : ordersLoading || returnsLoading ? (
              <p className='text-sm text-neutral-500'>Loading your orders…</p>
            ) : returnableOrders.length === 0 ? (
              <p className='text-sm text-neutral-500 border border-neutral-200 rounded-card p-4'>
                You have no delivered orders eligible for a return right now.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className='space-y-4'>
                <Select
                  label='Order'
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  options={[
                    { value: '', label: 'Choose an order…' },
                    ...returnableOrders.map((o) => ({
                      value: o.id ?? o._id,
                      label: `${o.orderNumber} — ${new Date(
                        o.createdAt,
                      ).toLocaleDateString("en-NG")}`,
                    })),
                  ]}
                />
                <div>
                  <label className='block text-sm font-medium text-brand-dark mb-1'>
                    Reason
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder='Tell us why you&apos;d like to return it'
                    className='w-full border border-neutral-300 rounded-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent'
                  />
                </div>

                {error && <p className='text-sm text-danger'>{error.message}</p>}

                <Button
                  type='submit'
                  disabled={isPending || !orderId || reason.trim().length < 5}>
                  {isPending ? "Submitting…" : "Submit request"}
                </Button>
              </form>
            )}
          </section>
        )}

        {isAuthenticated && (returns?.length ?? 0) > 0 && (
          <section>
            <h2 className='font-display font-semibold text-lg text-brand-dark mb-3'>
              Your return requests
            </h2>
            <div className='space-y-3'>
              {returns.map((r) => (
                <div
                  key={r._id}
                  className='border border-neutral-200 rounded-card p-4 flex flex-wrap items-center justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-medium text-brand-dark'>
                      {r.order?.orderNumber ?? 'Order'}
                    </p>
                    <p className='text-xs text-neutral-500 break-words'>
                      {r.reason}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap shrink-0 ${
                      RETURN_STATUS_STYLES[r.status] ?? "bg-neutral-100 text-neutral-600"
                    }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </FadeIn>
    </div>
  );
}