import { motion } from "motion/react";
import { useReducedMotion } from "../../hooks/useReducedMotion.js";

const variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Wraps content that should animate into view. If the visitor has
 * "reduce motion" enabled at the OS level, this renders instantly with
 * no animation at all — accessibility, not just a nice-to-have.
 */
export default function FadeIn({ children, delay = 0, loop = false, className = "" }) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  if (loop) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: [0.6, 1, 0.6] }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial='hidden'
      whileInView='visible'
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
