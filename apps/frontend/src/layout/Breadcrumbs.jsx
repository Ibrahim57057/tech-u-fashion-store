import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * items: [{ label: 'Home', to: '/' }, { label: 'Sneakers', to: '/products?category=sneakers' }, { label: 'Air Runner' }]
 * The last item has no `to` — it's the current page, shown as plain text, not a link.
 */
export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label='Breadcrumb' className='text-sm text-neutral-500 mb-4'>
      <ol className='flex flex-wrap items-center gap-1'>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className='flex items-center gap-1'>
              {isLast || !item.to ? (
                <span className='text-brand-dark font-medium'>
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className='hover:text-brand-accent transition-colors'>
                  {item.label}
                </Link>
              )}
              {!isLast && <ChevronRight className='w-3.5 h-3.5' />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
