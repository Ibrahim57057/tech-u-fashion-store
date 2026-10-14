import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

/**
 * Handles /verify-email?token=… — the link in the confirmation email.
 *
 * Both signup confirmation and an email change land here. The request fires
 * once on mount; a ref guards it so React's development double-invoke (or a
 * re-render) does not consume the single-use token twice and turn a success
 * into "this link has already been used".
 */
export default function VerifyEmailForm() {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState(token ? "verifying" : "missing");
  const [message, setMessage] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    verifyEmail({ token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setMessage(err.message);
        setStatus("error");
      });
  }, [token, verifyEmail]);

  if (status === "verifying") {
    return (
      <p className='text-sm text-neutral-600 text-center'>
        Confirming your email…
      </p>
    );
  }

  if (status === "missing") {
    return (
      <div className='space-y-6 max-w-sm mx-auto text-center'>
        <p className='text-sm text-neutral-600 leading-relaxed'>
          This confirmation link is incomplete. Open the link from your email
          again, or log in and request a new one.
        </p>
        <Link to='/login' className='inline-block text-sm text-brand-accent2 hover:underline'>
          Go to login
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className='space-y-6 max-w-sm mx-auto text-center'>
        <p className='text-sm text-neutral-600 leading-relaxed'>
          Your email address is confirmed. Thanks for verifying your account.
        </p>
        <Link
          to='/'
          className='inline-flex w-full items-center justify-center rounded-card bg-brand-accent px-4 py-2 font-medium text-white hover:bg-orange-600'>
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className='space-y-6 max-w-sm mx-auto text-center'>
      <p className='text-sm text-danger leading-relaxed'>{message}</p>
      <p className='text-sm text-neutral-600 leading-relaxed'>
        Log in and choose “Resend confirmation email” to get a fresh link.
      </p>
      <Link to='/login' className='inline-block text-sm text-brand-accent2 hover:underline'>
        Go to login
      </Link>
    </div>
  );
}
