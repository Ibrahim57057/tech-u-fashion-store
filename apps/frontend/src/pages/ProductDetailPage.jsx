import { useState } from "react";
import { useParams } from "react-router-dom";
import { Heart, ChevronDown, Truck } from "lucide-react";
import { useProduct, useProducts } from "../hooks/useProducts.js";
import { useCart } from "../hooks/useCart.js";
import { useWishlist } from "../hooks/useWishlist.js";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import Breadcrumbs from "../layout/Breadcrumbs.jsx";
import ProductGallery from "../features/catalog/ProductGallery.jsx";
import SizeGuideModal from "../features/catalog/SizeGuideModal.jsx";
import ProductGrid from "../features/catalog/ProductGrid.jsx";
import { formatNaira } from "../lib/formatNaira.js";
import StarRating from "../components/ui/StarRating.jsx";
import RatingInput from "../components/ui/RatingInput.jsx";
import { usePageSEO } from "../hooks/usePageSEO.js";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { data: product, isLoading } = useProduct(slug);
  const { data: allProducts } = useProducts();
  const { addItem } = useCart();
  const { toggle, isWishlisted } = useWishlist();

  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [myRating, setMyRating] = useState(0);

  // Called before the early returns below, never after them: a hook that
  // only runs on the loaded render is a conditional hook. The optional
  // chaining is what lets it sit here safely.
  usePageSEO({
    title: product?.name,
    description: product
      ? `${product.name} by ${product.brand} — ${formatNaira(product.priceFrom)}. Shop now on TECH-U.`
      : undefined,
    image: product?.images?.[0],
  });

  if (isLoading) return <p className='p-6'>Loading…</p>;
  if (!product) return <p className='p-6'>Product not found.</p>;

  const selectedVariant = product.variants.find(
    (v) => v.id === selectedVariantId,
  );
  const wishlisted = isWishlisted(product.id);
  const related = allProducts?.filter((p) => p.id !== product.id).slice(0, 4);

  function handleAddToCart() {
    if (!selectedVariant) return;
    addItem({
      variantId: selectedVariant.id,
      product,
      size: selectedVariant.size,
      color: selectedVariant.color,
      price: product.priceFrom,
      qty: quantity,
    });
  }

  return (
    <div className='px-4 sm:px-6 py-8 max-w-6xl mx-auto'>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "All products", to: "/products" },
          { label: product.name },
        ]}
      />

      <div className='grid md:grid-cols-2 gap-6 md:gap-10'>
        <ProductGallery
          images={
            selectedVariant?.images?.length > 0
              ? selectedVariant.images
              : product.images
          }
          alt={product.name}
        />

        <div className='min-w-0'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <p className='text-sm text-neutral-500 truncate'>
                {product.brand}
              </p>
              <h1 className='font-display font-bold text-2xl text-brand-dark'>
                {product.name}
              </h1>
              {product.rating?.count > 0 && (
                <div className='mt-1'>
                  <StarRating
                    average={product.rating.average}
                    count={product.rating.count}
                    size='lg'
                  />
                </div>
              )}
            </div>
            <button
              onClick={() => toggle(product.id)}
              aria-label={
                wishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
              className='p-2 hover:bg-neutral-100 rounded-full shrink-0'>
              <Heart
                className={`w-6 h-6 ${wishlisted ? "fill-brand-accent text-brand-accent" : "text-brand-dark"}`}
              />
            </button>
          </div>

          <p className='mt-2 font-semibold text-lg text-brand-dark'>
            {formatNaira(product.priceFrom)}
          </p>

          <div className='mt-6'>
            <div className='flex items-center justify-between mb-2'>
              <p className='text-sm font-medium text-brand-dark'>
                Size / colour
              </p>
              <button
                onClick={() => setSizeGuideOpen(true)}
                className='text-sm text-brand-accent2 hover:underline'>
                Size guide
              </button>
            </div>
            <div className='flex flex-wrap gap-2'>
              {product.variants.map((variant) => {
                const soldOut = variant.stock === 0;
                const selected = selectedVariantId === variant.id;
                return (
                  <button
                    key={variant.id}
                    disabled={soldOut}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={[
                      "px-3 py-2 rounded-card border text-sm transition-colors",
                      soldOut && "opacity-40 cursor-not-allowed line-through",
                      selected &&
                        !soldOut &&
                        "border-brand-accent bg-orange-50",
                      !selected &&
                        !soldOut &&
                        "border-neutral-300 hover:border-brand-dark",
                    ]
                      .filter(Boolean)
                      .join(" ")}>
                    {variant.size} · {variant.color}
                  </button>
                );
              })}
            </div>
            {selectedVariant && selectedVariant.stock <= 3 && (
              <Badge variant='warning' className='mt-2'>
                Only {selectedVariant.stock} left
              </Badge>
            )}
          </div>

          <div className='mt-6 flex items-center gap-4'>
            <QuantityStepper value={quantity} onChange={setQuantity} />
            <Button
              className='flex-1'
              disabled={!selectedVariant}
              onClick={handleAddToCart}>
              Add to cart
            </Button>
          </div>

          {/* flex-wrap: as a single flex row the text becomes an anonymous
              flex item with nowhere to wrap, so it broke into two ragged
              lines that started under the icon. */}
          <div className='mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600'>
            <Truck className='w-4 h-4 shrink-0' />
            <span>Delivery in 2–4 days · Free above ₦50,000</span>
          </div>

          <div className='mt-8 border border-neutral-200 rounded-card p-4'>
            <h2 className='font-display font-semibold text-brand-dark'>
              Rate this product
            </h2>
            <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1'>
              <RatingInput value={myRating} onChange={setMyRating} />
              <span className='text-sm text-neutral-500'>
                {myRating > 0
                  ? `You rated this ${myRating}/5`
                  : "Hover a star, then click to rate"}
              </span>
            </div>
          </div>

          <div className='mt-8 divide-y divide-neutral-200 border-t border-neutral-200'>
            <ExpandableSection title='Description'>
              Premium construction built for everyday wear. True to size — see
              our size guide if you're between sizes.
            </ExpandableSection>
            <ExpandableSection title='Materials & care'>
              Upper: synthetic/textile blend. Sole: rubber. Wipe clean with a
              damp cloth; avoid direct sunlight when drying.
            </ExpandableSection>
            <ExpandableSection title='Delivery & returns'>
              Delivered across Nigeria in 2–4 business days. Free returns and
              exchanges within 7 days of delivery.
            </ExpandableSection>
          </div>
        </div>
      </div>

      {related && related.length > 0 && (
        <section className='mt-16'>
          <h2 className='font-display font-bold text-xl text-brand-dark mb-4'>
            You might also like
          </h2>
          <ProductGrid products={related} isLoading={false} columns={4} />
        </section>
      )}

      <SizeGuideModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
      />
    </div>
  );
}

/** Local to this file — a simple +/- quantity control, only used here. */
function QuantityStepper({ value, onChange }) {
  return (
    <div className='flex items-center border border-neutral-300 rounded-card'>
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className='px-3 py-2 text-brand-dark hover:bg-neutral-100'
        aria-label='Decrease quantity'>
        −
      </button>
      <span className='px-3 text-sm w-8 text-center'>{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className='px-3 py-2 text-brand-dark hover:bg-neutral-100'
        aria-label='Increase quantity'>
        +
      </button>
    </div>
  );
}

/** Local to this file — a single accordion row. */
function ExpandableSection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className='py-3'>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className='w-full flex items-center justify-between text-left'>
        <span className='font-body font-medium text-brand-dark text-sm'>
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <p className='mt-2 text-sm text-neutral-600'>{children}</p>}
    </div>
  );
}
