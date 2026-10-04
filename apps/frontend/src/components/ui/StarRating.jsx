import { Star } from "lucide-react";

/**
 * Displays a row of 5 stars, filled proportionally to `average`, plus
 * an optional review count. Read-only display for now — an actual
 * review submission form is a Should-list item for later, once real
 * orders exist to attach reviews to.
 */
const sizeStyles = {
  sm: { star: "w-3.5 h-3.5", text: "text-xs text-neutral-500" },
  md: { star: "w-5 h-5", text: "text-sm text-neutral-500" },
  lg: { star: "w-6 h-6", text: "text-base text-neutral-600" },
};

export default function StarRating({ average, count, size = "sm" }) {
  const { star: sizeClass, text: textClass } = sizeStyles[size] ?? sizeStyles.sm;

  return (
    <div className='flex items-center gap-1'>
      <div className='flex'>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < Math.round(average);
          return (
            <Star
              key={i}
              className={`${sizeClass} ${filled ? "fill-warning text-warning" : "text-neutral-300"}`}
            />
          );
        })}
      </div>
      {count !== undefined && (
        <span className={textClass}>
          {average.toFixed(1)} ({count})
        </span>
      )}
    </div>
  );
}
