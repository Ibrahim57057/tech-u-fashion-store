import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { useProducts } from "../hooks/useProducts.js";
import { usePageSEO } from "../hooks/usePageSEO.js";
import ProductGrid from "../features/catalog/ProductGrid.jsx";
import FilterSidebar from "../features/catalog/FilterSidebar.jsx";
import Select from "../components/ui/Select.jsx";
import Breadcrumbs from "../layout/Breadcrumbs.jsx";
import Drawer from "../components/ui/Drawer.jsx";
import Button from "../components/ui/Button.jsx";

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

// "newest" is the server's default sort, so it needs no parameter.
const SORT_PARAM = {
  newest: undefined,
  "price-asc": "priceFrom",
  "price-desc": "-priceFrom",
};

export default function ProductListingPage() {
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get("category"); // e.g. "sneakers", or null

  const [filters, setFilters] = useState({ sizes: [], colors: [], brands: [] });
  const [sort, setSort] = useState("newest");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Everything — category, size, colour, brand and sort — is applied by the
  // server before it paginates. Filtering a single page of results in the
  // browser is what previously hid matching products and made the count
  // describe the whole catalogue instead of the selection.
  const { data: products, meta, isLoading } = useProducts({
    category: categorySlug,
    sizes: filters.sizes,
    colors: filters.colors,
    brands: filters.brands,
    sort: SORT_PARAM[sort],
  });

  const resultCount = meta?.total ?? 0;
  // Sizes, colours and brands come from the database, so the sidebar can't
  // go stale the way a hardcoded list did.
  const filterOptions = meta?.filters;

  // "sneakers" becomes "Sneakers" for the heading and breadcrumb.
  const pageTitle = categorySlug
    ? categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)
    : "All products";

  usePageSEO({
    title: categorySlug ? pageTitle : "Shop all products",
    description: `Browse ${pageTitle.toLowerCase()} at TECH-U.`,
  });

  const breadcrumbItems = categorySlug
    ? [
        { label: "Home", to: "/" },
        { label: "All products", to: "/products" },
        { label: pageTitle },
      ]
    : [{ label: "Home", to: "/" }, { label: "All products" }];

  return (
    <div className='px-6 py-8 max-w-7xl mx-auto'>
      <Breadcrumbs items={breadcrumbItems} />

      <div className='flex items-center justify-between mb-6'>
        <h1 className='font-display font-bold text-2xl text-brand-dark'>
          {pageTitle}
        </h1>
        <Button
          variant='outline'
          size='sm'
          className='md:hidden'
          onClick={() => setFilterDrawerOpen(true)}>
          <SlidersHorizontal className='w-4 h-4 mr-2' />
          Filters
        </Button>
      </div>

      <div className='grid md:grid-cols-[220px_1fr] gap-8'>
        <aside className='hidden md:block'>
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            options={filterOptions}
          />
        </aside>

        <div>
          <div className='flex items-center justify-between mb-4'>
            <p className='text-sm text-neutral-500'>
              {isLoading ? "Loading…" : `${resultCount} items`}
            </p>
            <Select
              options={sortOptions}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className='w-48'
            />
          </div>

          <ProductGrid
            products={products ?? []}
            isLoading={isLoading}
            skeletonCount={6}
            columns={3}
          />

          {!isLoading && resultCount === 0 && (
            <p className='text-center text-neutral-500 py-12'>
              No products match these filters. Try clearing some of them.
            </p>
          )}
        </div>
      </div>

      <Drawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        side='bottom'
        title='Filters'>
        <div className='p-4'>
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            options={filterOptions}
          />
          <Button
            className='w-full mt-6'
            onClick={() => setFilterDrawerOpen(false)}>
            Show {resultCount} results
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
