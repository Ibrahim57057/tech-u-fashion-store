import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useEffect } from "react";

/**
 * Generic centered popup. Same job as Drawer (own open/close animation
 * + backdrop, content supplied by the caller) but centered on screen
 * instead of sliding from an edge — the right shape for things like a
 * size guide or quick view, where side-by-side content fits better
 * than a narrow side panel.
 */
export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
            className='fixed inset-0 z-50 flex items-center justify-center p-4'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}>
            <motion.div
              className='bg-white rounded-card shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto'
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}>
              <div className='flex items-center justify-between px-4 py-3 border-b border-neutral-200 sticky top-0 bg-white'>
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
              <div className='p-4'>{children}</div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
