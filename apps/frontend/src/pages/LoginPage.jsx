import LoginForm from "../features/auth/LoginForm.jsx";

export default function LoginPage() {
  return (
    <div className='px-6 py-16'>
      <h1 className='font-display font-bold text-2xl text-brand-dark text-center mb-8'>
        Welcome back
      </h1>
      <LoginForm />
    </div>
  );
}
