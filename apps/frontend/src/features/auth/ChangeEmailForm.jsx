import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

/**
 * Starts moving the account to a new email address.
 *
 * The new address is only held as pending: it becomes the login identifier
 * once the confirmation link sent to it is followed. Until then the current
 * one keeps working, so a typo here cannot lock anyone out.
 */
export default function ChangeEmailForm() {
  const { user, changeEmail } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
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

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError(null);

    const next = {};
    if (!form.email) next.email = "Enter the new email address";
    if (!form.password) next.password = "Enter your password to confirm";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await changeEmail({ email: form.email.trim(), password: form.password });
      setForm({ email: "", password: "" });
      showToast("Confirmation link sent to the new address");
    } catch (err) {
      const fields = Object.fromEntries(
        Object.entries(err.fieldErrors ?? {}).filter(([key]) => key),
      );
      if (Object.keys(fields).length > 0) {
        setErrors((prev) => ({ ...prev, ...fields }));
      } else {
        setServerError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className='space-y-3 max-w-sm'>
      <p className='text-sm text-neutral-600'>
        Current email: <span className='text-brand-dark'>{user.email}</span>
      </p>

      {user.pendingEmail && (
        <p className='text-sm text-neutral-600 rounded-card bg-amber-50 border border-amber-200 px-3 py-2'>
          Waiting for <span className='text-brand-dark'>{user.pendingEmail}</span> to
          confirm the change. Until then you keep signing in with{" "}
          {user.email}.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className='space-y-4'>
        <Input
          label='New email'
          type='email'
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          autoComplete='email'
          error={errors.email}
        />
        <Input
          label='Current password'
          type='password'
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          autoComplete='current-password'
          error={errors.password}
        />
        <p className='text-xs text-neutral-500'>
          We send a confirmation link to the new address. Nothing changes until
          it is confirmed.
        </p>

        {serverError && <p className='text-sm text-danger'>{serverError}</p>}

        <Button type='submit' disabled={submitting}>
          {submitting ? "Sending…" : "Send confirmation link"}
        </Button>
      </form>
    </div>
  );
}
