import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
} from "../../hooks/useAdminCategories.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function AdminCategoriesPage() {
  const { data: categories } = useAdminCategories();
  const { mutate: create, isPending } = useCreateCategory();
  const { mutate: remove } = useDeleteCategory();
  const [name, setName] = useState("");

  function handleAdd(e) {
    e.preventDefault();
    create({ name, slug: slugify(name) }, { onSuccess: () => setName("") });
  }

  return (
    <div>
      <h1 className='font-display font-bold text-2xl text-brand-dark mb-6'>
        Categories
      </h1>

      <div className='bg-white rounded-card border border-neutral-200 divide-y divide-neutral-100 mb-6 max-w-md'>
        {categories?.map((category) => (
          <div
            key={category.id}
            className='flex items-center justify-between p-3'>
            <span className='text-sm text-brand-dark'>{category.name}</span>
            <button
              onClick={() => remove(category.id)}
              aria-label={`Delete ${category.name}`}
              className='text-neutral-400 hover:text-danger'>
              <Trash2 className='w-4 h-4' />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className='flex gap-2 max-w-md'>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='New category name'
          required
        />
        <Button type='submit' disabled={isPending}>
          Add
        </Button>
      </form>
    </div>
  );
}
