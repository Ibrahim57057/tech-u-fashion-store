import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "../hooks/useCart.js";
import { formatNaira } from "../lib/formatNaira.js";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";

export default function CartPage() {
  const { items, total, updateQty, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className='px-6 py-16 max-w-6xl mx-auto text-center'>
        <h1 className='font-display font-bold text-2xl text-brand-dark'>
          Your cart is empty
        </h1>
        <p className='mt-2 text-neutral-500'>
          Browse the latest drops and add something you like.
        </p>
        <Link to='/products' className='inline-block mt-6'>
          <Button>Shop products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className='px-6 py-10 max-w-6xl mx-auto'>
      <h1 className='font-display font-bold text-2xl text-brand-dark mb-6'>
        Your cart
      </h1>

      <div className='grid md:grid-cols-3 gap-6 items-start'>
        <div className='md:col-span-2 flex flex-col gap-4'>
          {items.map((item) => (
            <Card key={item.variantId} className='p-4 flex gap-4'>
              <img
                src={item.image}
                alt={item.name}
                className='w-24 h-24 object-cover rounded-card'
              />
              <div className='flex-1'>
                <p className='font-display font-semibold text-brand-dark'>
                  {item.name}
                </p>
                <p className='text-sm text-neutral-500'>
                  {[item.size, item.color].filter(Boolean).join(' · ')}
                </p>
                <p className='mt-1 font-body font-semibold text-brand-dark'>
                  {formatNaira(item.price)}
                </p>
              </div>
              <div className='flex flex-col items-end justify-between gap-2'>
                <button
                  onClick={() => removeItem(item.variantId)}
                  className='text-neutral-400 hover:text-danger'
                  aria-label={`Remove ${item.name}`}>
                  <Trash2 className='w-5 h-5' />
                </button>
                <div className='flex items-center gap-3'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() =>
                      updateQty(item.variantId, Math.max(1, item.qty - 1))
                    }>
                    <Minus className='w-4 h-4' />
                  </Button>
                  <span className='font-body font-medium text-brand-dark w-6 text-center'>
                    {item.qty}
                  </span>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => updateQty(item.variantId, item.qty + 1)}>
                    <Plus className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className='p-4 flex flex-col gap-3'>
          <h2 className='font-display font-semibold text-brand-dark'>
            Order summary
          </h2>
          <div className='flex items-center justify-between font-body text-neutral-600'>
            <span>Subtotal</span>
            <span>{formatNaira(total)}</span>
          </div>
          <div className='flex items-center justify-between font-display font-bold text-brand-dark border-t border-neutral-200 pt-3'>
            <span>Total</span>
            <span>{formatNaira(total)}</span>
          </div>
          <Button className='w-full mt-2'>Checkout</Button>
        </Card>
      </div>
    </div>
  );
}
