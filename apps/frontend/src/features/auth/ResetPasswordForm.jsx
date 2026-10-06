import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

/**
 * Step two of the reset, reached from the emailed link at
 * /reset-password?token=…
 *
 * On success the customer lands on the storefront front page already signed
 * in: the backend issues a fresh cookie with the new password, so sending
 * them to /login would make them type the credential they just set for no
 * reason. It also ends every other session they had open — see the
 * passwordChangedAt check in the backend's `protect`.
 */
export default function ResetPasswordForm() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  // A link opened by hand, or one mangled in transit, has no token. Saying so
  // and offering a fresh link beats submitting and getting a 400.
  if (!token) {
    return (
      <div className='space-y-6 max-w-sm mx-auto text-center'>
        <p className='text-sm text-neutral-600 leading-relaxed'>
          This password reset link is incomplete. Please request a new one.
        </p>
        <Link to='/forgot-password' className='inline-block text-sm text-brand-accent2 hover:underline'>
          Send me a new link
        </Link>
      </div>
    );
  }

  function validate() {
    const next = {};
    if (!form.password || form.password.length < 8)
      next.password = "Password must be at least 8 characters";
    if (!form.confirmPassword) next.confirmPassword = "Confirm your password";
    else if (form.confirmPassword !== form.password)
      next.confirmPassword = "Passwords do not match";
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await resetPassword({
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      navigate("/", { replace: true });
    } catch (err) {
      // "This reset link is invalid or has expired" is the common case here
      // — the link aged out while it sat in the mailbox. It cannot be fixed
      // by editing a field, so it belongs on the banner, not under an input.
      if (err.fieldErrors?.confirmPassword || err.fieldErrors?.password) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      } else {
        setServerError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className='space-y-4 max-w-sm mx-auto'>
      <Input
        label='New password'
        type='password'
        value={form.password}
        onChange={(e) => update("password", e.target.value)}
        autoComplete='new-password'
        error={errors.password}
      />
      <Input
        label='Confirm password'
        type='password'
        value={form.confirmPassword}
        onChange={(e) => update("confirmPassword", e.target.value)}
        autoComplete='new-password'
        error={errors.confirmPassword}
      />

      {serverError && (
        <div className='text-sm text-danger text-center space-y-2'>
          <p>{serverError}</p>
          <Link to='/forgot-password' className='text-brand-accent2 hover:underline'>
            Request a new link
          </Link>
        </div>
      )}

      <Button type='submit' className='w-full' disabled={submitting}>
        {submitting ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}
