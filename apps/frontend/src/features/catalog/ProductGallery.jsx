import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function ProductGallery({ images, alt }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div>
      <div className='relative w-full aspect-square rounded-card overflow-hidden bg-neutral-100'>
        <AnimatePresence mode='wait'>
          <motion.img
            key={activeIndex}
            src={images[activeIndex]}
            alt={alt}
            className='w-full h-full object-cover'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        </AnimatePresence>
      </div>

      <div className='flex gap-2 mt-3'>
        {images.map((src, index) => (
          <button
            key={src}
            onClick={() => setActiveIndex(index)}
            aria-label={`View image ${index + 1}`}
            className={`w-16 h-16 rounded-card overflow-hidden border-2 shrink-0 transition-colors ${
              activeIndex === index
                ? "border-brand-accent"
                : "border-transparent hover:border-neutral-300"
            }`}>
            <img src={src} alt='' className='w-full h-full object-cover' />
          </button>
        ))}
      </div>
    </div>
  );
}
