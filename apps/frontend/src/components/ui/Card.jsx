export default function Card({
  children,
  className = "",
  hoverable = false,
  ...rest
}) {
  const hoverStyles = hoverable ? "transition-shadow hover:shadow-lg" : "";
  const classes = [
    "bg-white rounded-card border border-neutral-200 overflow-hidden",
    hoverStyles,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
}
