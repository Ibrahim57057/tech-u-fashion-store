import { useState } from "react";
import { Plus, Trash2, ImagePlus } from "lucide-react";
import Input from "../../components/ui/Input.jsx";
import ImageUploader from "./ImageUploader.jsx";

export default function VariantEditor({ variants, onChange }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  function updateVariant(index, field, value) {
    const next = variants.map((v, i) =>
      i === index ? { ...v, [field]: value } : v,
    );
    onChange(next);
  }

  function addVariant() {
    onChange([
      ...variants,
      { size: "", color: "", sku: "", stock: 0, images: [] },
    ]);
  }

  function removeVariant(index) {
    onChange(variants.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
  }

  return (
    <div>
      <div className='space-y-2'>
        {variants.map((variant, index) => (
          <div
            key={index}
            className='border border-neutral-200 rounded-card p-2'>
            <div className='grid grid-cols-[1fr_1fr_1fr_80px_32px_32px] gap-2 items-end'>
              <Input
                label={index === 0 ? "Size" : undefined}
                value={variant.size}
                onChange={(e) => updateVariant(index, "size", e.target.value)}
              />
              <Input
                label={index === 0 ? "Color" : undefined}
                value={variant.color}
                onChange={(e) => updateVariant(index, "color", e.target.value)}
              />
              <Input
                label={index === 0 ? "SKU" : undefined}
                value={variant.sku}
                onChange={(e) => updateVariant(index, "sku", e.target.value)}
              />
              <Input
                label={index === 0 ? "Stock" : undefined}
                type='number'
                min='0'
                value={variant.stock}
                onChange={(e) =>
                  updateVariant(index, "stock", Number(e.target.value))
                }
              />
              <button
                type='button'
                onClick={() =>
                  setExpandedIndex(expandedIndex === index ? null : index)
                }
                className={`p-2 rounded hover:bg-neutral-100 ${
                  variant.images?.length > 0
                    ? "text-brand-accent"
                    : "text-neutral-400"
                }`}
                aria-label='Variant-specific photos'
                title='Variant-specific photos (optional)'>
                <ImagePlus className='w-4 h-4' />
              </button>
              <button
                type='button'
                onClick={() => removeVariant(index)}
                disabled={variants.length === 1}
                className='p-2 text-neutral-400 hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed'
                aria-label='Remove variant'>
                <Trash2 className='w-4 h-4' />
              </button>
            </div>

            {expandedIndex === index && (
              <div className='mt-2 pt-2 border-t border-neutral-100'>
                <p className='text-xs text-neutral-500 mb-2'>
                  Optional — leave empty to use the product's main photos for
                  this color/size.
                </p>
                <ImageUploader
                  images={variant.images || []}
                  onChange={(images) => updateVariant(index, "images", images)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type='button'
        onClick={addVariant}
        className='flex items-center gap-1 text-sm text-brand-accent2 hover:underline mt-3'>
        <Plus className='w-4 h-4' />
        Add variant
      </button>
    </div>
  );
}
