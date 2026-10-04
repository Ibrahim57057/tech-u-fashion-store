import { Link } from "react-router-dom";

/**
 * Dropdown panel shown when hovering a desktop nav link. Own open/close
 * state lives here, driven by mouse enter/leave — this is genuinely
 * local, transient UI state, not something any other component needs.
 */
export default function MegaMenu({ category, open }) {
  if (!open) return null;

  return (
    <div className='absolute left-0 right-0 top-full bg-white border-b border-neutral-200 shadow-lg'>
      <div className='max-w-7xl mx-auto px-6 py-8 grid grid-cols-[200px_1fr] gap-8'>
        <img
          src={category.image}
          alt={category.name}
          className='w-full h-40 object-cover rounded-card'
        />
        <div className='grid grid-cols-3 gap-4'>
          {category.subcategories.map((sub) => (
            <Link
              key={sub}
              to={`/products?category=${category.slug}&sub=${sub.toLowerCase()}`}
              className='text-sm text-neutral-600 hover:text-brand-accent transition-colors'>
              {sub}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
