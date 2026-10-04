import { useState } from "react";
import { Star } from "lucide-react";

const sizeStyles = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

/**
 * The write-side counterpart to StarRating: a 1–5 control the visitor
 * drives with the pointer. Hovering previews a value, clicking commits
 * it via onChange. Keyboard users get the same behaviour through
 * focus + Enter, since every star is a real button.
 */
export default function RatingInput({ value = 0, onChange, size = "md" }) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;
  const sizeClass = sizeStyles[size] ?? sizeStyles.md;

  return (
    <div
      role='radiogroup'
      aria-label='Your rating'
      className='flex items-center gap-1'
      onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type='button'
          role='radio'
          aria-checked={value === n}
          aria-label={`${n} of 5`}
          onMouseEnter={() => setHovered(n)}
          onFocus={() => setHovered(n)}
          onBlur={() => setHovered(0)}
          onClick={() => onChange(n)}
          className='p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded'>
          <Star
            className={`${sizeClass} ${
              n <= shown ? "fill-warning text-warning" : "text-neutral-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
