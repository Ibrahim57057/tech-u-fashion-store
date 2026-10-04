const baseStyles =
  "inline-flex items-center gap-1 font-body font-medium text-xs px-2.5 py-1 rounded-full";

const variantStyles = {
  success: "bg-green-100 text-success",
  danger: "bg-red-100 text-danger",
  warning: "bg-amber-100 text-warning",
  neutral: "bg-neutral-100 text-neutral-700",
};

export default function Badge({
  variant = "neutral",
  icon,
  children,
  className = "",
  ...rest
}) {
  const classes = [baseStyles, variantStyles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <span {...rest} className={classes}>
      {icon}
      {children}
    </span>
  );
}
