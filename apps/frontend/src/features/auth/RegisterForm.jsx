import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { safeDestination } from "../../lib/safeDestination.js";

/**
 * Where to go after registering. RequireAuth passes the page the customer was
 * trying to reach as ?from= so an interrupted checkout resumes. Only
 * same-site paths are honoured, so a crafted link cannot bounce someone to
 * another site after they register.
 */

// Deliberately only a quick shape check. The authoritative rules (typo
// domains like gamil.com, domains that accept no mail, accounts that already
// exist) live in the backend — duplicating that blocklist here would mean
// maintaining it twice and letting the two drift apart.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear the message for the field being edited. Leaving it up means the
    // customer fixes the mistake and the error is still standing there
    // claiming otherwise until they submit again.
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate() {
    const next = {};
    if (!form.name) next.name = "Name is required";
    if (!form.email) next.email = "Email is required";
    else if (!EMAIL_SHAPE.test(form.email.trim()))
      next.email = "Enter a valid email address";
    if (!form.phone) next.phone = "Phone number is required";
    if (!form.password || form.password.length < 8)
      next.password = "Password must be at least 8 characters";
    if (!form.confirmPassword) next.confirmPassword = "Confirm your password";
    else if (form.confirmPassword !== form.password)
      next.confirmPassword = "Passwords do not match";
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // Cleared up front, not after validation: otherwise a previous "that
    // email is already taken" banner sits there while the user fixes the
    // field, claiming something that is no longer true.
    setServerError(null);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      // confirmPassword is a browser-side check only, so it is not sent —
      // the register schema has no such field.
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      navigate(safeDestination(from), { replace: true });
    } catch (err) {
      // Per-field messages (including "that email is already taken" and the
      // gamil.com typo warning) land under the right input. Anything else
      // falls back to the banner.
      if (err.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        const handled = Object.keys(err.fieldErrors);
        if (handled.length) setServerError(null);
      } else {
        setServerError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // noValidate: keep type='email' for mobile keyboards, but let our own
    // validate() own the messages. Browsers differ wildly on their native
    // bubble, and some show nothing at all.
    <form onSubmit={handleSubmit} noValidate className='space-y-4 max-w-sm mx-auto'>
      <Input
        label='Full name'
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        autoComplete='name'
        error={errors.name}
      />
      <Input
        label='Email'
        type='email'
        value={form.email}
        onChange={(e) => update("email", e.target.value)}
        autoComplete='email'
        error={errors.email}
      />
      <Input
        label='Phone number'
        value={form.phone}
        onChange={(e) => update("phone", e.target.value)}
        autoComplete='tel'
        error={errors.phone}
      />
      <Input
        label='Password'
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
        <p className='text-sm text-danger text-center'>{serverError}</p>
      )}

      <Button type='submit' className='w-full' disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </Button>
      <p className='text-sm text-center text-neutral-500'>
        Already have an account?{" "}
        <Link
          to={{
            pathname: '/login',
            search: from ? `?from=${encodeURIComponent(from)}` : '',
          }}
          className='text-brand-accent2 hover:underline'>
          Log in
        </Link>
      </p>
    </form>
  );
}
