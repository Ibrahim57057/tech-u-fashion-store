import { motion } from "motion/react";
import { useReducedMotion } from "../../hooks/useReducedMotion.js";

const easeOutExpo = [0.16, 1, 0.3, 1];

/**
 * Three layers: a blurred copy of the logo behind everything, breathing
 * forever; the logo itself wiping in behind a clip mask; and a slow
 * vertical drift on the whole badge. Only opacity and transform are
 * animated, so the loop stays on the compositor instead of repainting.
 * Sizing and any colour treatment (brightness-0 invert) go on the outer
 * wrapper so both copies match exactly.
 */
export default function AnimatedLogo({ src, alt, className = "" }) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <img src={src} alt={alt} className={`h-full w-auto ${className}`} />;
  }

  return (
    <motion.span
      className={`relative inline-block ${className}`}
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}>
      <motion.span
        aria-hidden='true'
        className='absolute inset-0 blur-md'
        animate={{ opacity: [0.2, 0.55, 0.2], scale: [1, 1.06, 1] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>
        <img src={src} alt='' className='h-full w-auto' />
      </motion.span>

      <motion.span
        className='relative block h-full overflow-hidden'
        initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
        animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: 0.9, ease: easeOutExpo }}>
        <img src={src} alt={alt} className='h-full w-auto' />
      </motion.span>
    </motion.span>
  );
}
