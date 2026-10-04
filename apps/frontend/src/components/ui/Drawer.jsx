import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useEffect } from "react";

const sideStyles = {
  left: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    className: "left-0 top-0 h-full",
  },
  right: {
    initial: { x: "100%" },
    animate: { x: 0 },
    className: "right-0 top-0 h-full",
  },
  bottom: {
    initial: { y: "100%" },
    animate: { y: 0 },
    className: "left-0 bottom-0 w-full",
  },
};

/**
 * Generic slide-out panel used by MobileNav, CartDrawer, and
 * FilterSidebar. It owns open/close animation and the backdrop only —
 * every specific use case supplies its own content via `children`.
 */
export default function Drawer({
  open,
  onClose,
  side = "right",
  title,
  children,
}) {
  // Lock page scroll while the drawer is open, and always restore it
  // on close/unmount — this is exactly the cleanup-function habit
  // from useReducedMotion, applied here for a different resource.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const { initial, animate, className: positionClass } = sideStyles[side];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className='fixed inset-0 bg-black/50 z-40'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`fixed z-50 bg-white shadow-xl w-full max-w-sm ${positionClass}`}
            initial={initial}
            animate={animate}
            exit={initial}
            transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}>
            <div className='flex items-center justify-between px-4 py-3 border-b border-neutral-200'>
              <h2 className='font-display font-semibold text-brand-dark'>
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label='Close'
                className='p-1 hover:bg-neutral-100 rounded-full'>
                <X className='w-5 h-5 text-brand-dark' />
              </button>
            </div>
            <div className='overflow-y-auto h-[calc(100%-57px)]'>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
