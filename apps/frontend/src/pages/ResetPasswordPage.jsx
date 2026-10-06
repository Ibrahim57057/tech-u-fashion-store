import ResetPasswordForm from "../features/auth/ResetPasswordForm.jsx";

export default function ResetPasswordPage() {
  return (
    <div className='px-4 sm:px-6 py-16'>
      <h1 className='font-display font-bold text-2xl text-brand-dark text-center mb-8'>
        Choose a new password
      </h1>
      <ResetPasswordForm />
    </div>
  );
}
