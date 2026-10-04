import { useParams } from "react-router-dom";
import { useAdminProduct } from "../../hooks/useAdminProducts.js";
import ProductForm from "../../features/admin/ProductForm.jsx";

export default function AdminProductFormPage() {
  const { id } = useParams(); // undefined on the "new product" route
  const { data: product, isLoading } = useAdminProduct(id);

  if (id && isLoading) return <p className='text-neutral-500'>Loading…</p>;

  return (
    <div>
      <h1 className='font-display font-bold text-2xl text-brand-dark mb-6'>
        {id ? "Edit product" : "New product"}
      </h1>
      <ProductForm existingProduct={id ? product : undefined} />
    </div>
  );
}
