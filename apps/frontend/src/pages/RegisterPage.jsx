import RegisterForm from "../features/auth/RegisterForm.jsx";

export default function RegisterPage() {
  return (
    <div className='px-6 py-16'>
      <h1 className='font-display font-bold text-2xl text-brand-dark text-center mb-8'>
        Create your account
      </h1>
      <RegisterForm />
    </div>
  );
}
