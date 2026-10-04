import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Button from "../../components/ui/Button.jsx";
import ImageUploader from "./ImageUploader.jsx";
import VariantEditor from "./VariantEditor.jsx";
import { useAdminCategories } from "../../hooks/useAdminCategories.js";
import { useSaveProduct } from "../../hooks/useAdminProducts.js";

const emptyForm = {
  name: "",
  brand: "",
  description: "",
  priceFrom: "",
  category: "",
  images: [],
  variants: [{ size: "", color: "", sku: "", stock: 0, images: [] }],
};

/**
 * One form, used for both creating and editing. `existingProduct` is
 * undefined for a new product, or a real product object when editing
 * — that single difference is what decides whether we create or PATCH.
 */
export default function ProductForm({ existingProduct }) {
  const navigate = useNavigate();
  const { data: categories } = useAdminCategories();
  const { mutate, isPending, error } = useSaveProduct();

  function buildFormFrom(product) {
    if (!product) return emptyForm;
    return {
      name: product.name,
      brand: product.brand,
      description: product.description,
      priceFrom: product.priceFrom / 100, // kobo -> naira for display
      category: product.category?.id || product.category,
      images: product.images,
      variants: product.variants.map((v) => ({
        size: v.size,
        color: v.color,
        sku: v.sku,
        stock: v.stock,
        images: v.images || [],
      })),
    };
  }

  const [form, setForm] = useState(() => buildFormFrom(existingProduct));
  const [loadedProductId, setLoadedProductId] = useState(existingProduct?.id);

  // Only re-sync the form if we've switched to a genuinely different
  // product (or the edit page's product has just finished loading for
  // the first time) — not on every re-render this component goes
  // through for unrelated reasons, like typing in a field.
  if (existingProduct && existingProduct.id !== loadedProductId) {
    setForm(buildFormFrom(existingProduct));
    setLoadedProductId(existingProduct.id);
  }
  const categoryOptions = (categories || []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  function handleSubmit(e) {
    e.preventDefault();

    mutate(
      {
        id: existingProduct?.id,
        data: {
          name: form.name,
          brand: form.brand,
          description: form.description,
          priceFrom: Math.round(Number(form.priceFrom) * 100), // naira -> kobo
          category: form.category,
          images: form.images,
          variants: form.variants.map((v) => ({
            ...v,
            stock: Number(v.stock),
          })),
        },
      },
      { onSuccess: () => navigate("/admin/products") },
    );
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6 max-w-2xl'>
      <div className='grid grid-cols-2 gap-4'>
        <Input
          label='Name'
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label='Brand'
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          required
        />
      </div>

      <div>
        <label className='block text-sm font-medium text-brand-dark mb-1'>
          Description
        </label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
          className='w-full border border-neutral-300 rounded-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent'
        />
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <Input
          label='Price (₦)'
          type='number'
          min='0'
          value={form.priceFrom}
          onChange={(e) => setForm({ ...form, priceFrom: e.target.value })}
          required
        />
        <Select
          label='Category'
          options={categoryOptions}
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
      </div>

      <div>
        <label className='block text-sm font-medium text-brand-dark mb-1'>
          Images
        </label>
        <ImageUploader
          images={form.images}
          onChange={(images) => setForm({ ...form, images })}
        />
      </div>

      <div>
        <label className='block text-sm font-medium text-brand-dark mb-2'>
          Variants
        </label>
        <VariantEditor
          variants={form.variants}
          onChange={(variants) => setForm({ ...form, variants })}
        />
      </div>

      {error && <p className='text-sm text-danger'>{error.message}</p>}

      <Button type='submit' disabled={isPending}>
        {isPending
          ? "Saving…"
          : existingProduct
            ? "Save changes"
            : "Create product"}
      </Button>
    </form>
  );
}
