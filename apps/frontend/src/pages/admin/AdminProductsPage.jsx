import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  useAdminProducts,
  useBulkDeactivate,
} from "../../hooks/useAdminProducts.js";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import { formatNaira } from "../../lib/formatNaira.js";

export default function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const { data, isLoading } = useAdminProducts(page, search);
  const { mutate: bulkDeactivate, isPending } = useBulkDeactivate();

  function toggleOne(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleAll() {
    if (!data) return;
    const ids = data.data.map((p) => p.id);
    setSelected((prev) => (prev.length === ids.length ? [] : ids));
  }

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  return (
    <div>
      {/* Wraps rather than overflowing: the title, a 256px search box and
          the button need ~400px, and a phone gives 272px. */}
      <div className='flex flex-wrap items-center gap-3 mb-6'>
        <h1 className='font-display font-bold text-2xl text-brand-dark mr-auto'>
          Products
        </h1>
        <input
          type='search'
          placeholder='Search by name…'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className='border border-neutral-300 rounded-card px-3 py-1.5 text-sm w-full sm:w-64'
        />
        <Link to='/admin/products/new'>
          <Button size='sm'>
            <Plus className='w-4 h-4 mr-2' />
            New product
          </Button>
        </Link>
      </div>

      {selected.length > 0 && (
        <div className='bg-amber-50 border border-warning rounded-card p-3 mb-4 flex items-center justify-between'>
          <p className='text-sm text-brand-dark'>{selected.length} selected</p>
          <Button
            size='sm'
            variant='outline'
            disabled={isPending}
            onClick={() =>
              bulkDeactivate(selected, { onSuccess: () => setSelected([]) })
            }>
            Hide selected
          </Button>
        </div>
      )}

      <div className='bg-white rounded-card border border-neutral-200 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead className='bg-neutral-50 text-left text-neutral-500'>
            <tr>
              <th className='p-3 w-10'>
                <input
                  type='checkbox'
                  checked={
                    !!data &&
                    selected.length === data.data.length &&
                    data.data.length > 0
                  }
                  onChange={toggleAll}
                />
              </th>
              <th className='p-3'>Product</th>
              <th className='p-3'>Brand</th>
              <th className='p-3'>Price</th>
              <th className='p-3'>Stock</th>
              <th className='p-3'>Status</th>
              <th className='p-3'></th>
            </tr>
          </thead>
          <tbody className='divide-y divide-neutral-100'>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className='p-3'>
                    <Skeleton className='h-8 w-full' />
                  </td>
                </tr>
              ))}

            {data?.data.map((product) => {
              const totalStock = product.variants.reduce(
                (sum, v) => sum + v.stock,
                0,
              );
              const lowStock = totalStock > 0 && totalStock <= 5;
              const outOfStock = totalStock === 0;
              return (
                <tr
                  key={product.id}
                  className={
                    outOfStock ? "bg-red-50" : lowStock ? "bg-amber-50" : ""
                  }>
                  <td className='p-3'>
                    <input
                      type='checkbox'
                      checked={selected.includes(product.id)}
                      onChange={() => toggleOne(product.id)}
                    />
                  </td>
                  <td className='p-3 flex items-center gap-2'>
                    <img
                      src={product.images[0]}
                      alt=''
                      className='w-8 h-8 rounded object-cover'
                    />
                    {product.name}
                  </td>
                  <td className='p-3 text-neutral-600'>{product.brand}</td>
                  <td className='p-3 text-neutral-600'>
                    {formatNaira(product.priceFrom)}
                  </td>
                  <td className='p-3'>
                    <span
                      className={
                        outOfStock
                          ? "text-danger font-medium"
                          : lowStock
                            ? "text-warning font-medium"
                            : "text-neutral-600"
                      }>
                      {totalStock}
                    </span>
                  </td>
                  <td className='p-3'>
                    <Badge variant={product.isActive ? "success" : "neutral"}>
                      {product.isActive ? "Active" : "Hidden"}
                    </Badge>
                  </td>
                  <td className='p-3 text-right'>
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      className='text-brand-accent2 hover:underline'>
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
