import { motion } from "motion/react";
import { useReducedMotion } from "../../hooks/useReducedMotion.js";

const easeOutExpo = [0.16, 1, 0.3, 1];

const wordVariants = {
  hidden: { y: "115%", opacity: 0 },
  visible: { y: "0%", opacity: 1 },
};

/**
 * Reveals a headline one word at a time, each word sliding up from
 * behind its own mask, then keeps the whole line drifting gently and
 * forever. The word matching `accent` carries a second, blurred copy of
 * itself behind it whose opacity pulses on a loop — a real glow that
 * costs one composited layer, where animating a drop-shadow filter
 * would repaint every frame. Spacing is em-based rather than literal
 * spaces, because a space inside a masked span gets trimmed at the end
 * of a line box. Collapses to plain text under "reduce motion".
 */
export default function SplitText({
  text,
  accent,
  className = "",
  delay = 0,
}) {
  const prefersReduced = useReducedMotion();
  const words = text.split(" ");

  if (prefersReduced) {
    return (
      <span className={className}>
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className={word === accent ? "text-brand-accent" : undefined}>
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    );
  }

  return (
    <motion.span
      className='inline-block'
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
      <motion.span
        aria-label={text}
        className={`inline-block ${className}`}
        initial='hidden'
        animate='visible'
        transition={{ staggerChildren: 0.09, delayChildren: delay }}>
        {words.map((word, i) => {
          const isAccent = word === accent;

          return (
            <span
              key={`${word}-${i}`}
              aria-hidden='true'
              className={`relative inline-block ${
                i < words.length - 1 ? "mr-[0.28em]" : ""
              }`}>
              {isAccent && (
                <motion.span
                  className='absolute inset-0 text-brand-accent blur-lg'
                  animate={{ opacity: [0.3, 0.85, 0.3], scale: [1, 1.1, 1] }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}>
                  {word}
                </motion.span>
              )}

              <span className='inline-block overflow-hidden align-bottom pb-1 -mb-1'>
                <motion.span
                  className={`inline-block ${isAccent ? "text-brand-accent" : ""}`}
                  variants={wordVariants}
                  transition={{ duration: 0.8, ease: easeOutExpo }}>
                  {word}
                </motion.span>
              </span>
            </span>
          );
        })}
      </motion.span>
    </motion.span>
  );
}
