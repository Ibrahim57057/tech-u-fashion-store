import { motion } from "motion/react";

const baseStyles =
  "inline-flex items-center justify-center font-body font-medium rounded-card " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const variantStyles = {
  primary:
    "bg-brand-accent text-white hover:bg-orange-600 focus:ring-brand-accent",
  secondary:
    "bg-brand-dark text-white hover:bg-neutral-800 focus:ring-brand-dark",
  outline:
    "bg-transparent text-brand-dark border border-brand-dark hover:bg-neutral-100 focus:ring-brand-dark",
};

const sizeStyles = {
  sm: "text-sm px-3 py-1.5",
  md: "text-base px-4 py-2",
  lg: "text-lg px-6 py-3",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...rest
}) {
  const classes = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.button
      {...rest}
      disabled={disabled}
      className={classes}
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ duration: 0.15 }}>
      {children}
    </motion.button>
  );
}
