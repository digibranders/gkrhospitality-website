'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { GALLERY_ITEMS } from '@/data/galleryData';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function GalleryPage() {
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const mounted = useHasMounted();

  const selectedItem = selectedItemIndex !== null ? GALLERY_ITEMS[selectedItemIndex] : null;

  // Reset the image index whenever a different item is selected. This adjusts
  // state during render (guarded by comparing against the previous selection)
  // instead of in a useEffect, per https://react.dev/learn/you-might-not-need-an-effect
  const [prevSelectedItemIndex, setPrevSelectedItemIndex] = useState<number | null>(null);
  if (selectedItemIndex !== prevSelectedItemIndex) {
    setPrevSelectedItemIndex(selectedItemIndex);
    setCurrentImageIndex(0);
  }

  const handleNextImage = useCallback(() => {
    if (!selectedItem) return;
    setCurrentImageIndex((prev) =>
      (prev + 1) % selectedItem.images.length
    );
  }, [selectedItem]);

  const handlePreviousImage = useCallback(() => {
    if (!selectedItem) return;
    setCurrentImageIndex((prev) =>
      (prev - 1 + selectedItem.images.length) % selectedItem.images.length
    );
  }, [selectedItem]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedItemIndex === null) return;

      if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        handlePreviousImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemIndex, handleNextImage, handlePreviousImage]);

  return (
    <div className="min-h-screen bg-[#141414] text-white pt-32 pb-20 px-6 md:px-12">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-left mb-16"
        >
          <span className="text-[#c5a059] text-[12px] font-bold tracking-[0.4em] uppercase block mb-6">Portfolio</span>
          <h1 className="text-6xl md:text-8xl font-serif font-light text-white leading-[0.9] tracking-tight mb-8">
            Selected<br />
            <span className="italic text-[#c5a059]">Works</span>
          </h1>
          <p className="text-stone-400 text-xl max-w-3xl leading-relaxed">
            A curated selection of the finest  hospitality projects & assets, showcasing our career background and experience. Each is an example of a commitment to design excellence and practical innovation.
          </p>
        </motion.div>

        {mounted ? (
          <ResponsiveMasonry
            columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3 }}
          >
            <Masonry gutter="20px">
              {GALLERY_ITEMS.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative group cursor-pointer overflow-hidden w-full block text-left bg-transparent border-0 p-0 m-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818]"
                  onClick={() => setSelectedItemIndex(index)}
                  aria-label={`View project: ${item.title}`}
                >
                  <Image
                    src={item.images[0]} // Display first image as cover
                    alt={`${item.title} project`}
                    width={item.coverWidth}
                    height={item.coverHeight}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="w-full h-auto object-cover transition-all duration-700 ease-in-out transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white tracking-[0.2em] text-sm border border-white/30 px-6 py-3 backdrop-blur-sm">{item.title}</span>
                  </div>
                </motion.button>
              ))}
            </Masonry>
          </ResponsiveMasonry>
        ) : (
          /* Simple loading state or empty div to match server render if needed, but empty is fine for now as it will pop in */
          <div className="min-h-[50vh]"></div>
        )}

        <DialogPrimitive.Root open={selectedItemIndex !== null} onOpenChange={(open) => !open && setSelectedItemIndex(null)}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content className="fixed inset-0 z-[150] w-screen h-screen bg-[#181818] p-0 shadow-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 overflow-y-auto md:overflow-hidden md:grid md:grid-cols-2 gap-0">
              <DialogPrimitive.Title className="sr-only">
                {selectedItem?.title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                {selectedItem?.description}
              </DialogPrimitive.Description>

              {/* Close Button */}
              <DialogPrimitive.Close className="cursor-pointer absolute right-6 top-6 z-50 ring-offset-background transition-all hover:scale-110 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground p-2 bg-black/20 hover:bg-black/40 text-white rounded-full">
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>

              {/* Left Side: Image & Navigation */}
              <div className="sticky top-0 z-0 h-[40vh] md:relative md:h-full w-full bg-black flex items-center justify-center overflow-hidden group/image shrink-0">
                {selectedItem && (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={`${selectedItem.id}-${currentImageIndex}`}
                        src={selectedItem.images[currentImageIndex]}
                        alt={`${selectedItem.title} - Image ${currentImageIndex + 1}`}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="w-full h-full object-cover"
                      />
                    </AnimatePresence>

                    {/* Navigation Buttons for Desktop (Absolute Overlays) */}
                    {selectedItem.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePreviousImage(); }}
                          className="cursor-pointer absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/60 text-white hover:text-white rounded-full transition-all duration-300 backdrop-blur-sm hidden md:flex"
                          aria-label="Previous image"
                        >
                          <ChevronLeft size={32} strokeWidth={1} />
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                          className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/60 text-white hover:text-white rounded-full transition-all duration-300 backdrop-blur-sm hidden md:flex"
                          aria-label="Next image"
                        >
                          <ChevronRight size={32} strokeWidth={1} />
                        </button>

                        {/* Image Counter Indicator */}
                        <div className="hidden md:block absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-xs font-medium tracking-widest text-white/80">
                          {currentImageIndex + 1} / {selectedItem.images.length}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Right Side: Content */}
              <div className="relative z-10 bg-[#181818] flex flex-col justify-center p-8 md:p-12 space-y-6 md:h-full md:overflow-y-auto min-h-[60vh]">
                {selectedItem && (
                  <motion.div
                    key={selectedItem.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <h2 className="text-3xl md:text-4xl font-light tracking-[0.15em] text-white">
                      {selectedItem.title}
                    </h2>
                    <div className="w-12 h-[1px] bg-[#c5a059] my-6"></div>
                    <p className="text-stone-400 leading-relaxed font-light text-sm md:text-base">
                      {selectedItem.description}
                    </p>

                    {selectedItem.link && selectedItem.link !== '#' && (
                      <div className="pt-6 flex gap-4 items-center">
                        <Button
                          asChild
                          className="bg-[#c5a059] text-[#181818] hover:bg-[#b08d4a] uppercase tracking-[0.2em] px-8 py-6 rounded-none font-bold text-xs flex items-center gap-2"
                        >
                          <a href={selectedItem.link} target="_blank" rel="noopener noreferrer">
                            Learn More <ExternalLink size={16} />
                          </a>
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Mobile Navigation controls at bottom of content */}
                {selectedItem && selectedItem.images.length > 1 && (
                  <div className="md:hidden flex justify-between w-full mt-8 pt-6 border-t border-white/10">
                    <Button
                      onClick={handlePreviousImage}
                      variant="ghost"
                      className="text-stone-400 hover:text-white hover:bg-white/5 uppercase tracking-widest text-xs flex gap-2"
                    >
                      <ChevronLeft size={16} /> Previous
                    </Button>
                    <span className="text-xs text-stone-500 self-center tracking-widest">
                      {currentImageIndex + 1} / {selectedItem.images.length}
                    </span>
                    <Button
                      onClick={handleNextImage}
                      variant="ghost"
                      className="text-stone-400 hover:text-white hover:bg-white/5 uppercase tracking-widest text-xs flex gap-2"
                    >
                      Next <ChevronRight size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </div>
  );
}
