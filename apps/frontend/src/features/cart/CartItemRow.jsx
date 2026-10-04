import { Trash2 } from "lucide-react";
import { formatNaira } from "../../lib/formatNaira.js";

export default function CartItemRow({ item, onRemove, onQtyChange }) {
  return (
    <div className='flex gap-3 py-4 border-b border-neutral-100'>
      <img
        src={item.product.images[0]}
        alt={item.product.name}
        className='w-16 h-16 rounded-card object-cover shrink-0'
      />
      <div className='flex-1 min-w-0'>
        <p className='font-medium text-brand-dark text-sm truncate'>
          {item.product.name}
        </p>
        <p className='text-xs text-neutral-500'>
          {item.size} · {item.color}
        </p>
        <div className='flex items-center justify-between mt-2'>
          <input
            type='number'
            min='1'
            value={item.qty}
            onChange={(e) =>
              onQtyChange(item.variantId, Math.max(1, Number(e.target.value)))
            }
            className='w-14 border border-neutral-300 rounded px-2 py-1 text-sm'
          />
          <p className='font-semibold text-sm text-brand-dark'>
            {formatNaira(item.price * item.qty)}
          </p>
        </div>
      </div>
      <button
        onClick={() => onRemove(item.variantId)}
        aria-label={`Remove ${item.product.name}`}
        className='text-neutral-400 hover:text-danger shrink-0'>
        <Trash2 className='w-4 h-4' />
      </button>
    </div>
  );
}
