import ProductCard from "./ProductCard.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import FadeIn from "../../components/ui/FadeIn.jsx";

/**
 * The shared "loading skeletons, or real product cards" grid, used by
 * HomePage's sections and ProductListingPage. One place to fix a bug
 * or change the layout, instead of three.
 */
export default function ProductGrid({
  products,
  isLoading,
  skeletonCount = 4,
  columns = 4,
}) {
  const colClass = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  }[columns];

  return (
    <div className={`grid grid-cols-2 ${colClass} gap-4`}>
      {isLoading &&
        Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className='h-72 w-full' />
        ))}
      {products?.map((product, index) => (
        <FadeIn key={product.id} delay={index * 0.05}>
          <ProductCard product={product} />
        </FadeIn>
      ))}
    </div>
  );
}
