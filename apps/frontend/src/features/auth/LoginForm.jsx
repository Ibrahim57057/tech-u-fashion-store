import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import { safeDestination } from '../../lib/safeDestination.js';

/**
 * Where to go after a successful login. RequireAuth sends the page the
 * customer was trying to reach as ?from=, so a checkout interrupted by the
 * login wall resumes instead of dumping them on the account page.
 *
 * Only same-site paths are honoured: an attacker must not be able to craft
 * /login?from=https://evil.example.com and have us redirect there after a
 * real login. See lib/safeDestination.js for the exact rules.
 */

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!form.email) next.email = 'Email is required';
    if (!form.password) next.password = 'Password is required';
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setServerError(null);
    setSubmitting(true);
    try {
      await login(form);
      navigate(safeDestination(searchParams.get('from')), { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        error={errors.email}
      />
      <Input
        label="Password"
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        error={errors.password}
      />

      {serverError && <p className="text-sm text-danger text-center">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </Button>
      <p className="text-sm text-center text-neutral-500">
        No account?{' '}
        <Link
          to={{
            pathname: '/register',
            // Carry the interrupted checkout through registration too, not
            // just through login.
            search: from ? `?from=${encodeURIComponent(from)}` : '',
          }}
          className="text-brand-accent2 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}