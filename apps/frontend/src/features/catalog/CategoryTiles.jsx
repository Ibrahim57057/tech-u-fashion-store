import { Link } from "react-router-dom";
import { categories } from "../../lib/mockCategories.js";
import FadeIn from "../../components/ui/FadeIn.jsx";

export default function CategoryTiles() {
  return (
    <section className='px-4 sm:px-6 py-10 max-w-7xl mx-auto'>
      <h2 className='font-display font-bold text-xl text-brand-dark mb-4'>
        Shop by category
      </h2>
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        {categories.map((category, index) => (
          <FadeIn key={category.id} delay={index * 0.1}>
            <Link
              to={`/products?category=${category.slug}`}
              className='relative block h-48 rounded-card overflow-hidden group'>
              <img
                src={category.image}
                alt={category.name}
                className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-105'
              />
              <div className='absolute inset-0 bg-black/30 flex items-end p-4'>
                <h3 className='font-display font-bold text-white text-lg'>
                  {category.name}
                </h3>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
