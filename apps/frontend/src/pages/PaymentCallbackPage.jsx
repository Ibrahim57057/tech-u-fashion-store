import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/apiClient.js";
import Button from "../components/ui/Button.jsx";
import { formatNaira } from "../lib/formatNaira.js";

/**
 * Paystack redirects here after checkout, with ?reference=... in the
 * URL. This page asks OUR backend to verify that reference, which asks
 * Paystack directly. We never trust the URL alone: a customer could
 * land here without ever having paid.
 */
export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState("checking"); // checking | success | failed
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [signedOut, setSignedOut] = useState(false);

  // A missing ?reference is known synchronously from the URL, so it is
  // handled below at render time. The effect only owns the part that
  // genuinely has to wait on the network.
  useEffect(() => {
    if (!reference) return;

    apiFetch(`/payments/verify/${encodeURIComponent(reference)}`)
      .then((data) => {
        setResult(data);
        setStatus(data.paymentStatus === "success" ? "success" : "failed");
      })
      .catch((err) => {
        setStatus("failed");
        setError(err.message);
        // Verification is now account-scoped, so an expired session shows up
        // as a 401. The payment itself is unaffected — the Paystack webhook
        // settles it regardless — but we should offer a way back in rather
        // than telling someone to contact support.
        if (err.status === 401) setSignedOut(true);
      });
  }, [reference]);

  const missingReference = !reference;
  const failureMessage =
    error ||
    (missingReference
      ? "No payment reference was provided."
      : "We could not confirm this payment. If you were charged, contact support with your reference.");

  if (!missingReference && status === "checking") {
    return (
      <div className='px-6 py-24 text-center'>
        <Loader2 className='w-10 h-10 text-brand-accent mx-auto mb-4 animate-spin' />
        <p className='text-neutral-600'>Confirming your payment…</p>
      </div>
    );
  }

  if (!missingReference && status === "success") {
    return (
      <div className='px-6 py-16 max-w-md mx-auto text-center'>
        <CheckCircle className='w-14 h-14 text-success mx-auto mb-4' />
        <h1 className='font-display font-bold text-2xl text-brand-dark mb-2'>
          Payment received
        </h1>
        <p className='text-neutral-600 mb-1'>
          Order{" "}
          <span className='font-semibold text-brand-dark'>
            {result.orderNumber}
          </span>
        </p>
        <p className='text-neutral-600 mb-8'>
          Total: {formatNaira(result.total)}
        </p>
        <Link to='/account'>
          <Button className='w-full'>View my orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className='px-6 py-16 max-w-md mx-auto text-center'>
      <XCircle className='w-14 h-14 text-danger mx-auto mb-4' />
      <h1 className='font-display font-bold text-2xl text-brand-dark mb-2'>
        Payment not confirmed
      </h1>
      <p className='text-neutral-600 mb-8'>
        {signedOut
          ? "Your session expired while you were away. Sign back in and we will re-check this payment."
          : failureMessage}
      </p>
      {signedOut ? (
        <Link
          to={`/login?from=${encodeURIComponent(
            `/payment/callback?reference=${reference ?? ""}`,
          )}`}
        >
          <Button className='w-full'>Sign in</Button>
        </Link>
      ) : (
        <Button className='w-full' onClick={() => navigate("/checkout")}>
          Try again
        </Button>
      )}
    </div>
  );
}
