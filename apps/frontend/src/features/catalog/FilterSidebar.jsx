// Swatch colours for the colour filter. The colour names themselves come
// from the API, so a new colour still shows up in the list — it just falls
// back to a neutral dot if it isn't in this map.
const SWATCH = {
  Black: "#111827",
  White: "#f3f4f6",
  Grey: "#9ca3af",
  Gray: "#9ca3af",
  Navy: "#1e3a5f",
  Red: "#dc2626",
  Blue: "#2563eb",
  Khaki: "#b6a878",
  Green: "#16a34a",
  Brown: "#92400e",
  Beige: "#e7d8c9",
  Pink: "#ec4899",
  Purple: "#7c3aed",
  Yellow: "#eab308",
  Orange: "#ea580c",
};

const swatchFor = (color) => SWATCH[color] ?? "#a3a3a3";

/**
 * filters: { sizes: [], colors: [], brands: [] }
 * options: { sizes: [], colors: [], brands: [] } — the values that actually
 *          exist, supplied by the API in meta.filters. Hardcoding these here
 *          is how size 39, XL and four of the seven brands ended up
 *          unreachable for customers.
 *
 * onChange: (nextFilters) => void — the parent owns the real state; this
 * component only reports changes.
 */
export default function FilterSidebar({ filters, onChange, options }) {
  const sizes = options?.sizes ?? [];
  const colors = options?.colors ?? [];
  const brands = options?.brands ?? [];

  function toggle(key, value) {
    const current = filters[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  const activeCount =
    (filters.sizes?.length ?? 0) +
    (filters.colors?.length ?? 0) +
    (filters.brands?.length ?? 0);

  const chipClass = (selected) =>
    `px-2.5 py-1 rounded-card border text-xs transition-colors ${
      selected
        ? "border-brand-accent bg-orange-50 text-brand-dark font-medium"
        : "border-neutral-300 text-neutral-600 hover:border-brand-dark"
    }`;

  return (
    <div className="space-y-6">
      {colors.length > 0 && (
        <div>
          <h3 className="font-body font-semibold text-brand-dark text-sm mb-2">
            Colour
          </h3>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const selected = filters.colors?.includes(color);
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => toggle("colors", color)}
                  aria-pressed={selected}
                  title={color}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-card border text-xs transition-colors ${
                    selected
                      ? "border-brand-accent bg-orange-50 text-brand-dark font-medium"
                      : "border-neutral-300 text-neutral-600 hover:border-brand-dark"
                  }`}>
                  <span
                    aria-hidden="true"
                    className={`w-3 h-3 rounded-full border ${
                      // White needs its own outline or it disappears into the
                      // white chip background.
                      color.toLowerCase() === "white"
                        ? "border-neutral-400"
                        : "border-neutral-300"
                    }`}
                    style={{ backgroundColor: swatchFor(color) }}
                  />
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <h3 className="font-body font-semibold text-brand-dark text-sm mb-2">
            Size
          </h3>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggle("sizes", size)}
                aria-pressed={filters.sizes?.includes(size)}
                className={chipClass(filters.sizes?.includes(size))}>
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {brands.length > 0 && (
        <div>
          <h3 className="font-body font-semibold text-brand-dark text-sm mb-2">
            Brand
          </h3>
          <div className="space-y-2">
            {brands.map((brand) => (
              <label
                key={brand}
                className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={filters.brands?.includes(brand)}
                  onChange={() => toggle("brands", brand)}
                  className="accent-brand-accent"
                />
                {brand}
              </label>
            ))}
          </div>
        </div>
      )}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => onChange({ sizes: [], colors: [], brands: [] })}
          className="text-xs text-brand-accent hover:underline">
          Clear all filters ({activeCount})
        </button>
      )}
    </div>
  );
}