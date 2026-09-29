'use client';

import React, { useState, useEffect } from 'react';
import { motion, MotionValue, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image, { StaticImageData } from 'next/image';

interface HeroSectionProps {
  images: StaticImageData[];
  scale: MotionValue<number>;
}

export default function HeroSection({ images, scale }: HeroSectionProps) {
  const [currentHeroImage, setCurrentHeroImage] = useState(0);
  const reduceMotion = useReducedMotion();

  // Hero slideshow: a new image every 5 seconds, unless the visitor asked for reduced motion.
  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length, reduceMotion]);

  return (
    <section className="relative h-screen w-full overflow-hidden flex flex-col justify-center">
      {/* Background Image Slideshow */}
      <div className="absolute inset-0 z-0">
        <motion.div style={{ scale }} className="w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-b from-[#181818]/40 via-[#181818]/30 to-[#181818] z-10"></div>
          {images.map((image, index) => (
            <motion.div
              key={index}
              className="absolute inset-0 w-full h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: currentHeroImage === index ? 1 : 0 }}
              transition={{ duration: 1.5 }}
            >
              <Image
                src={image}
                alt={index === 0 ? "Luxury hotel lobby interior with elegant lighting" : index === 1 ? "Fine dining restaurant table setting" : "Hospitality property exterior view"}
                fill
                className="object-cover"
                priority={index === 0}
                sizes="100vw"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="container mx-auto px-6 md:px-12 relative z-20 mt-20 text-center md:text-left">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-6xl md:text-8xl font-serif font-light text-white leading-[1.1] tracking-tight mb-12 max-w-6xl mx-auto md:mx-0">
            Simply Practical Yet Creative  <span className="text-[#c5a059] italic">Solutions</span>
          </h1>

          <Button asChild className="bg-[#c5a059] text-[#181818] hover:opacity-90 px-4 py-3 md:px-10 md:py-6 text-[0.75rem] md:text-[0.875rem] uppercase tracking-[0.15em] md:tracking-[0.3em] font-bold transition-all duration-500 rounded-full h-auto whitespace-normal md:whitespace-nowrap leading-relaxed w-auto max-w-none">
            <Link href="/contact">Schedule Your Complimentary Discovery Call</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
