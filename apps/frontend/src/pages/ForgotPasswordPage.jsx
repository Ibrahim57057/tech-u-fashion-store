import ForgotPasswordForm from "../features/auth/ForgotPasswordForm.jsx";

export default function ForgotPasswordPage() {
  return (
    <div className='px-4 sm:px-6 py-16'>
      <h1 className='font-display font-bold text-2xl text-brand-dark text-center mb-8'>
        Forgot your password?
      </h1>
      <p className='text-sm text-neutral-500 text-center mb-8 max-w-sm mx-auto'>
        Enter the email you signed up with and we&apos;ll send you a link to set a new one.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
