import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

const EMPTY = { currentPassword: "", password: "", confirmPassword: "" };

export default function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY);
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

  function validate() {
    const next = {};
    if (!form.currentPassword) next.currentPassword = "Your current password is required";
    if (!form.password || form.password.length < 8)
      next.password = "Password must be at least 8 characters";
    if (!form.confirmPassword) next.confirmPassword = "Confirm your new password";
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
      await changePassword(form);
      // Wiped on success so the typed passwords do not linger in the fields
      // and in memory once the change has gone through.
      setForm(EMPTY);
      showToast("Password changed");
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
    <form onSubmit={handleSubmit} noValidate className='space-y-4 max-w-sm'>
      <Input
        label='Current password'
        type='password'
        value={form.currentPassword}
        onChange={(e) => update("currentPassword", e.target.value)}
        autoComplete='current-password'
        error={errors.currentPassword}
      />
      <Input
        label='New password'
        type='password'
        value={form.password}
        onChange={(e) => update("password", e.target.value)}
        autoComplete='new-password'
        error={errors.password}
      />
      <Input
        label='Confirm new password'
        type='password'
        value={form.confirmPassword}
        onChange={(e) => update("confirmPassword", e.target.value)}
        autoComplete='new-password'
        error={errors.confirmPassword}
      />

      {serverError && <p className='text-sm text-danger'>{serverError}</p>}

      <Button type='submit' disabled={submitting}>
        {submitting ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
