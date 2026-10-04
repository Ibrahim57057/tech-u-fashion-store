import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { useProducts } from "../hooks/useProducts.js";

export default function SearchBar({ onNavigate }) {
  const { data: products } = useProducts();
  const [query, setQuery] = useState("");

  // Recalculated only when query or the product list actually changes —
  // a real, meaningful use of useMemo, since this runs on every
  // keystroke otherwise.
  const suggestions = useMemo(() => {
    if (!query.trim() || !products) return [];
    const lower = query.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(lower))
      .slice(0, 5);
  }, [query, products]);

  return (
    <div className='relative'>
      <div className='relative'>
        <SearchIcon className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400' />
        <input
          type='search'
          placeholder='Search products…'
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className='w-full border border-neutral-300 rounded-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent'
        />
      </div>

      {suggestions.length > 0 && (
        <div className='absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-card shadow-lg z-10 overflow-hidden'>
          {suggestions.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.slug}`}
              onClick={onNavigate}
              className='flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 text-sm'>
              <img
                src={product.images[0]}
                alt=''
                className='w-8 h-8 rounded object-cover'
              />
              <span className='text-brand-dark'>{product.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
