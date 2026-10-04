import { Link } from "react-router-dom";
import Button from "../components/ui/Button.jsx";

export default function NotFoundPage() {
  return (
    <div className='px-6 py-24 text-center'>
      <h1 className='font-display font-extrabold text-6xl text-brand-dark mb-2'>
        404
      </h1>
      <p className='text-neutral-500 mb-6'>
        This page doesn't exist, or has moved.
      </p>
      <Link to='/'>
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
