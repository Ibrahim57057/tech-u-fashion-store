import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/**
 * Step one of the reset: ask for the address, send the link, stop.
 *
 * The success copy is the backend's own message, verbatim. It has to stay
 * vague — "if an account exists" — because telling someone their address has
 * no account here is exactly the enumeration the API refuses to provide, and
 * a form that shows a more helpful answer would undo that.
 */
export default function ForgotPasswordForm() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [sentMessage, setSentMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError(null);

    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }
    if (!EMAIL_SHAPE.test(email.trim())) {
      setErrors({ email: "Enter a valid email address" });
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      setSentMessage(await forgotPassword({ email: email.trim() }));
    } catch (err) {
      setServerError(err.fieldErrors?.email ?? err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (sentMessage) {
    return (
      <div className='space-y-6 max-w-sm mx-auto text-center'>
        <p className='text-sm text-neutral-600 leading-relaxed'>{sentMessage}</p>
        <p className='text-sm text-neutral-500'>
          Nothing after a few minutes? Check spam, then{" "}
          <button
            type='button'
            onClick={() => {
              setSentMessage(null);
              setServerError(null);
            }}
            className='text-brand-accent2 hover:underline'>
            try again
          </button>
          .
        </p>
        <p className='text-sm text-neutral-500'>
          <Link to='/login' className='text-brand-accent2 hover:underline'>
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    // noValidate: our own messages, one set, on every browser.
    <form onSubmit={handleSubmit} noValidate className='space-y-4 max-w-sm mx-auto'>
      <Input
        label='Email'
        type='email'
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setErrors({});
        }}
        autoComplete='email'
        placeholder='you@example.com'
        error={errors.email}
      />

      {serverError && <p className='text-sm text-danger text-center'>{serverError}</p>}

      <Button type='submit' className='w-full' disabled={submitting}>
        {submitting ? "Sending…" : "Send reset link"}
      </Button>
      <p className='text-sm text-center text-neutral-500'>
        <Link to='/login' className='text-brand-accent2 hover:underline'>
          Back to log in
        </Link>
      </p>
    </form>
  );
}
