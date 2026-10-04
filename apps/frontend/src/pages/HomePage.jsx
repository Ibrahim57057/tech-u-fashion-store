import { useProducts } from "../hooks/useProducts.js";
import ProductCard from "../features/catalog/ProductCard.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import FadeIn from "../components/ui/FadeIn.jsx";
import SplitText from "../components/ui/SplitText.jsx";
import { usePageSEO } from "../hooks/usePageSEO.js";


export default function HomePage() {
    usePageSEO({
      title: "Home",
      description: "Sneakers and streetwear, delivered across Nigeria.",
    });
  const { data: products, isLoading } = useProducts();

  return (
    <div>
      <section className='bg-brand-dark text-white px-6 py-16 text-center'>
        <h1 className='font-display font-extrabold text-3xl md:text-5xl'>
          <SplitText text='Step into TECH-U' accent='TECH-U' />
        </h1>
        <FadeIn delay={0.4} loop>
          <p className='mt-3 text-neutral-300'>
            Sneakers and streetwear, delivered across Nigeria.
          </p>
        </FadeIn>
      </section>

      <section className='px-6 py-10 max-w-6xl mx-auto'>
        <h2 className='font-display font-bold text-xl text-brand-dark mb-4'>
          New arrivals
        </h2>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-72 w-full' />
            ))}
          {products?.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
