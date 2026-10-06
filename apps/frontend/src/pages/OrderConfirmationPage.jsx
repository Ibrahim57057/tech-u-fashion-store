import { useLocation, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import Button from "../components/ui/Button.jsx";
import { formatNaira } from "../lib/formatNaira.js";

export default function OrderConfirmationPage() {
  const location = useLocation();
  const { orderNumber, total } = location.state || {};

  if (!orderNumber) {
    return (
      <div className='px-4 sm:px-6 py-16 text-center'>
        <p className='text-neutral-500'>No recent order found.</p>
        <Link to='/' className='text-brand-accent2 hover:underline text-sm'>
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className='px-4 sm:px-6 py-16 max-w-md mx-auto text-center'>
      <CheckCircle className='w-14 h-14 text-success mx-auto mb-4' />
      <h1 className='font-display font-bold text-2xl text-brand-dark mb-2'>
        Order placed!
      </h1>
      <p className='text-neutral-600 mb-1'>
        Order{" "}
        <span className='font-semibold text-brand-dark'>{orderNumber}</span>
      </p>
      <p className='text-neutral-600 mb-8'>Total: {formatNaira(total)}</p>
      <Link to='/account'>
        <Button className='w-full'>View my orders</Button>
      </Link>
    </div>
  );
}
