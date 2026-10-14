import VerifyEmailForm from "../features/auth/VerifyEmailForm.jsx";

export default function VerifyEmailPage() {
  return (
    <div className='px-4 sm:px-6 py-16'>
      <h1 className='font-display font-bold text-2xl text-brand-dark text-center mb-8'>
        Confirm your email
      </h1>
      <VerifyEmailForm />
    </div>
  );
}
