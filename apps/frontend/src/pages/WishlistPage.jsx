import { useWishlist } from "../hooks/useWishlist.js";
import { useProducts } from "../hooks/useProducts.js";
import ProductGrid from "../features/catalog/ProductGrid.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";

export default function WishlistPage() {
  const { productIds } = useWishlist();
  const { data: products, isLoading } = useProducts();

  // Derived, not stored — the wishlist only ever keeps ids; the actual
  // product objects are looked up fresh from the product list every
  // render, so there's a single source of truth for product data.
  const wishlistedProducts = products?.filter((p) => productIds.includes(p.id));

  return (
    <div className='px-6 py-10 max-w-7xl mx-auto'>
      <h1 className='font-display font-bold text-2xl text-brand-dark mb-6'>
        Your wishlist
      </h1>

      {!isLoading && wishlistedProducts?.length === 0 ? (
        <EmptyState
          title='Your wishlist is empty'
          message='Tap the heart on any product to save it here.'
          actionLabel='Start shopping'
          actionTo='/products'
        />
      ) : (
        <ProductGrid
          products={wishlistedProducts}
          isLoading={isLoading}
          columns={4}
        />
      )}
    </div>
  );
}
