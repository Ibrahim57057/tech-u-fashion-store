import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";
import { useDeliveryZones } from "../hooks/useDeliveryZones.js";
import { apiFetch } from "../lib/apiClient.js";
import Input from "../components/ui/Input.jsx";
import Select from "../components/ui/Select.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { formatNaira } from "../lib/formatNaira.js";

const PHONE_REGEX = /^(\+234|0)[7-9][01]\d{8}$/;

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { data: zones, isLoading: zonesLoading } = useDeliveryZones();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    zoneId: "",
    paymentMethod: "online",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [placing, setPlacing] = useState(false);

  // Until the customer picks a zone, default to the first one.
  const zoneId = form.zoneId || zones?.[0]?.id;
  const selectedZone = zones?.find((z) => z.id === zoneId);

  const zoneOptions = useMemo(
    () => (zones || []).map((z) => ({ value: z.id, label: z.name })),
    [zones],
  );

  // Derived, never stored, so it can't drift out of sync.
  const grandTotal = total + (selectedZone?.fee || 0);

  function validate() {
    const next = {};
    if (!form.fullName) next.fullName = 'Full name is required';
    if (!PHONE_REGEX.test(form.phone)) next.phone = 'Enter a valid Nigerian phone number';
    if (form.address.length < 5) next.address = 'Enter a fuller address';
    if (form.paymentMethod === 'online' && !form.email) {
      next.email = 'Email is required to pay online';
    }
    if (form.paymentMethod === 'pay_on_delivery' && !selectedZone?.codAllowed) {
      next.paymentMethod = 'Pay on delivery is not available in this area';
    }
    return next;
  }
  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setServerError(null);
    setPlacing(true);

    try {
      // We send WHAT and HOW MANY, never prices or totals: the server
      // works those out itself.
      const order = await apiFetch('/orders', {
        method: 'POST',
        body: {
          contact: { fullName: form.fullName, phone: form.phone, email: form.email },
          shipping: { address: form.address, zoneId },
          items: items.map((i) => ({
            productId: i.product.id,
            variantId: i.variantId,
            qty: i.qty,
          })),
          paymentMethod: form.paymentMethod,
        },
      });

      if (form.paymentMethod === 'online') {
        // Hand off to Paystack. The cart clears only once payment is
        // actually confirmed, on the callback page — not here.
        const { authorizationUrl } = await apiFetch('/payments/initialize', {
          method: 'POST',
          body: { orderNumber: order.orderNumber },
        });
        window.location.href = authorizationUrl;
        return;
      }

      // Pay on delivery: the order itself is the confirmation.
      clearCart();
      navigate('/order-confirmation', {
        state: { orderNumber: order.orderNumber, total: order.total },
      });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title='Your cart is empty'
        message='Add something before checking out.'
        actionLabel='Start shopping'
        actionTo='/products'
      />
    );
  }

  if (zonesLoading)
    return (
      <p className='p-6 text-center text-neutral-500'>Loading checkout…</p>
    );

  return (
    <div className='px-6 py-10 max-w-lg mx-auto'>
      <h1 className='font-display font-bold text-2xl text-brand-dark mb-6'>
        Checkout
      </h1>

      <form onSubmit={handleSubmit} className='space-y-6'>
        <section className='space-y-3'>
          <h2 className='font-body font-semibold text-brand-dark text-sm'>
            Contact & delivery
          </h2>
          <Input
            label='Full name'
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            error={errors.fullName}
          />
          <Input
            label='Phone number'
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={errors.phone}
          />
          <Input
            label={form.paymentMethod === 'online' ? 'Email' : 'Email (optional)'}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <Input
            label='Delivery address'
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            error={errors.address}
          />
          <Select
            label='Delivery zone'
            options={zoneOptions}
            value={zoneId}
            onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
          />
          {selectedZone && (
            <p className='text-xs text-neutral-500'>
              {formatNaira(selectedZone.fee)} delivery · arrives in{" "}
              {selectedZone.etaDays} days
            </p>
          )}
        </section>

        <section className='space-y-2'>
          <h2 className='font-body font-semibold text-brand-dark text-sm'>
            Payment method
          </h2>
          <PaymentOption
            value='online'
            current={form.paymentMethod}
            onChange={(v) => setForm({ ...form, paymentMethod: v })}
            label='Card, bank transfer or USSD'
          />
          <PaymentOption
            value='pay_on_delivery'
            current={form.paymentMethod}
            onChange={(v) => setForm({ ...form, paymentMethod: v })}
            label='Pay on delivery'
            disabled={!selectedZone?.codAllowed}
          />
          {errors.paymentMethod && (
            <p className='text-sm text-danger'>{errors.paymentMethod}</p>
          )}
        </section>

        <section className='border-t border-neutral-200 pt-4 space-y-1'>
          <Row label='Subtotal' value={formatNaira(total)} />
          <Row label='Delivery' value={formatNaira(selectedZone?.fee || 0)} />
          <Row label='Total' value={formatNaira(grandTotal)} bold />
        </section>

        {serverError && (
          <p className='text-sm text-danger text-center'>{serverError}</p>
        )}

        <Button type='submit' className='w-full' disabled={placing}>
          {placing ? "Placing order…" : "Place order"}
        </Button>
      </form>
    </div>
  );
}

function PaymentOption({ value, current, onChange, label, disabled }) {
  return (
    <label
      className={`flex items-center gap-2 border rounded-card px-3 py-2 text-sm ${
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer hover:border-brand-dark"
      } ${current === value ? "border-brand-accent bg-orange-50" : "border-neutral-300"}`}>
      <input
        type='radio'
        name='paymentMethod'
        value={value}
        checked={current === value}
        disabled={disabled}
        onChange={() => onChange(value)}
        className='accent-brand-accent'
      />
      {label}
    </label>
  );
}

function Row({ label, value, bold }) {
  return (
    <div
      className={`flex justify-between text-sm ${
        bold
          ? "font-display font-bold text-brand-dark text-base"
          : "text-neutral-600"
      }`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
