import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";

/**
 * Nudge to confirm the address, with a resend button.
 *
 * Confirmation is deliberately not required to shop — mail delivery has been
 * unreliable enough that gating on it would cost real orders — so this is a
 * reminder rather than a wall.
 */
export default function VerifyEmailBanner() {
  const { user, resendVerification } = useAuth();
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      await resendVerification();
      showToast("Confirmation email sent");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className='mb-4 rounded-card border border-amber-200 bg-amber-50 px-4 py-3'>
      <p className='text-sm text-brand-dark'>
        {user.pendingEmail
          ? `Please confirm ${user.pendingEmail} to finish changing your email.`
          : "Your email is not confirmed yet."}
      </p>
      <button
        type='button'
        onClick={resend}
        disabled={sending}
        className='mt-1 text-sm text-brand-accent2 hover:underline disabled:opacity-50'>
        {sending ? "Sending…" : "Resend confirmation email"}
      </button>
    </div>
  );
}
