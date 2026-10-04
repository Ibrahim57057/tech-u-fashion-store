const baseStyles =
  "w-full font-body text-base px-3 py-2 rounded-card border bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export default function Input({ label, error, id, className = "", ...rest }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  const borderStyles = error
    ? "border-danger focus:ring-danger"
    : "border-neutral-300 focus:ring-brand-accent";

  const classes = [baseStyles, borderStyles, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className='w-full'>
      {label && (
        <label
          htmlFor={inputId}
          className='block text-sm font-medium text-brand-dark mb-1'>
          {label}
        </label>
      )}
      <input id={inputId} {...rest} className={classes} />
      {error && <p className='mt-1 text-sm text-danger'>{error}</p>}
    </div>
  );
}
