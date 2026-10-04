import { useState } from "react";
import { Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { apiFetchWithMeta } from "../lib/apiClient.js";
import { usePageSEO } from "../hooks/usePageSEO.js";

/**
 * Contact form. Submits to POST /api/v1/contact, which stores the message
 * so it shows up in the admin inbox. Zod validation on the backend owns
 * the rules; the per-field messages it returns are surfaced under the
 * matching input.
 */
export default function ContactPage() {
  usePageSEO({
    title: "Contact us",
    description:
      "Questions about an order, a return, or just want to say hi? Reach TECH-U Fashion Store.",
  });

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [submitError, setSubmitError] = useState("");

  function update(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErrors({});
    setSubmitError("");

    try {
      await apiFetchWithMeta("/contact", {
        method: "POST",
        body: {
          name: form.name,
          email: form.email,
          // Optional on the server; skip it when blank so it falls back
          // to the model default instead of sending an empty string.
          ...(form.subject.trim() ? { subject: form.subject.trim() } : {}),
          message: form.message,
        },
      });

      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setStatus("idle");

      // The backend returns Zod issues as [{ path, message }]; map them
      // onto the field they belong to so the user knows what to fix.
      const fieldErrors = err.fields ?? {};
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        setSubmitError(err.message);
      }
    }
  }

  if (status === "sent") {
    return (
      <div className='px-6 py-16 max-w-3xl mx-auto grid md:grid-cols-2 gap-10'>
        <div className='md:col-span-2'>
          <div className='border border-neutral-200 rounded-card p-8 text-center'>
            <CheckCircle2 className='w-12 h-12 text-success mx-auto mb-4' />
            <h1 className='font-display font-bold text-2xl text-brand-dark mb-2'>
              Message sent
            </h1>
            <p className='text-neutral-600 mb-6'>
              Thanks — we&apos;ve got your message and will reply by email,
              usually within one working day.
            </p>
            <Button variant='outline' onClick={() => setStatus("idle")}>
              Send another message
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='px-6 py-16 max-w-3xl mx-auto grid md:grid-cols-2 gap-10'>
      <div>
        <h1 className='font-display font-bold text-2xl text-brand-dark mb-4'>
          Get in touch
        </h1>
        <p className='text-neutral-600 mb-6'>
          Questions about an order, a return, or just want to say hi? Reach us
          any of these ways.
        </p>
        <div className='space-y-3 text-sm text-neutral-600'>
          <p className='flex items-center gap-2'>
            <Mail className='w-4 h-4 text-brand-accent2 shrink-0' /> support@techu.ng
          </p>
          <p className='flex items-center gap-2'>
            <Phone className='w-4 h-4 text-brand-accent2 shrink-0' /> +234 800 000 0000
          </p>
          <p className='flex items-center gap-2'>
            <MapPin className='w-4 h-4 text-brand-accent2 shrink-0' /> Lagos, Nigeria
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <Input
          label='Name'
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          required
        />
        <Input
          label='Email'
          type='email'
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
        />
        <Input
          label='Subject (optional)'
          value={form.subject}
          onChange={update('subject')}
          error={errors.subject}
        />
        <div>
          <label className='block text-sm font-medium text-brand-dark mb-1'>
            Message
          </label>
          <textarea
            rows={4}
            value={form.message}
            onChange={update('message')}
            required
            className='w-full border border-neutral-300 rounded-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent'
          />
          {errors.message && (
            <p className='mt-1 text-sm text-danger'>{errors.message}</p>
          )}
        </div>

        {submitError && (
          <p role='alert' className='text-sm text-danger'>
            {submitError}
          </p>
        )}

        <Button type='submit' className='w-full' disabled={status === 'sending'}>
          {status === "sending" ? "Sending…" : "Send message"}
        </Button>
      </form>
    </div>
  );
}