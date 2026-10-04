import { ChevronDown } from "lucide-react";

const baseStyles =
  "w-full appearance-none font-body text-sm px-3 py-2 pr-8 rounded-card border border-neutral-300 bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-brand-accent transition-colors";

export default function Select({ label, options, className = "", ...rest }) {
  return (
    <div className={className}>
      {label && (
        <label className='block text-sm font-medium text-brand-dark mb-1'>
          {label}
        </label>
      )}
      <div className='relative'>
        <select {...rest} className={baseStyles}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className='w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none' />
      </div>
    </div>
  );
}
