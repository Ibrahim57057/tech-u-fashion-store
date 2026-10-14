import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

// Mirrors the rule the backend enforces for phone. Name length and the
// authoritative checks live server-side; this is only here to save a round trip
// on obvious mistakes.
const PHONE_SHAPE = /^(\+234|0)[7-9][01]\d{8}$/;

export default function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: user.name ?? "",
    phone: user.phone ?? "",
  });
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
    if (!form.name || form.name.trim().length < 2) next.name = "Name is too short";
    if (!form.phone) next.phone = "Phone number is required";
    else if (!PHONE_SHAPE.test(form.phone.trim()))
      next.phone = "Enter a valid Nigerian phone number";
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
      await updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
      showToast("Profile updated");
    } catch (err) {
      // Keyed by field when the backend reported which one failed; anything
      // else (or an unnamed schema issue) falls back to the banner.
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
        label='Full name'
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        autoComplete='name'
        error={errors.name}
      />
      <Input
        label='Phone number'
        value={form.phone}
        onChange={(e) => update("phone", e.target.value)}
        autoComplete='tel'
        error={errors.phone}
      />
      {/* Read-only here on purpose: it is the login identifier and changing it
          is its own verified flow, offered in the section below. */}
      <Input
        label='Email'
        value={user.email}
        disabled
        readOnly
        autoComplete='email'
      />
      <p className='-mt-2 text-xs text-neutral-500'>
        To change the email on your account, use the “Change email” section
        below.
      </p>

      {serverError && <p className='text-sm text-danger'>{serverError}</p>}

      <Button type='submit' disabled={submitting}>
        {submitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
