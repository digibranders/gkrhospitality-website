'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, Variants } from 'motion/react';
import Image, { StaticImageData } from 'next/image';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  quote: string;
  highlight?: string;
  name: string;
  author: string;
  company: string;
  logo: StaticImageData;
  invertLogo?: boolean;
}

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export default function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextTestimonial = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const prevTestimonial = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevTestimonial();
      if (e.key === 'ArrowRight') nextTestimonial();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextTestimonial, prevTestimonial]);

  const renderQuote = (quote: string, highlight?: string) => {
    if (!highlight) return `"${quote}"`;

    const parts = quote.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        &quot;
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="text-[#c5a059] font-medium">{part}</span>
          ) : (
            part
          )
        )}
        &quot;
      </>
    );
  };

  // Indices for left and right cards
  const leftIndex = (activeIndex - 1 + testimonials.length) % testimonials.length;
  const rightIndex = (activeIndex + 1) % testimonials.length;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const cardVariants: Variants = {
    active: {
      x: 0,
      scale: 1,
      opacity: 1,
      zIndex: 30,
      filter: 'none',
      pointerEvents: 'auto',
      transition: { duration: 0.6, ease: [0.32, 0.72, 0, 1] as const }
    },
    left: {
      x: isMobile ? '-16%' : '-55%',
      y: isMobile ? 12 : 0,
      scale: isMobile ? 0.92 : 0.8,
      opacity: isMobile ? 0.7 : 0.2,
      zIndex: 20,
      filter: isMobile ? 'blur(3px)' : 'blur(12px)',
      pointerEvents: 'none',
      transition: { duration: 0.6, ease: [0.32, 0.72, 0, 1] as const }
    },
    right: {
      x: isMobile ? '16%' : '55%',
      y: isMobile ? 12 : 0,
      scale: isMobile ? 0.92 : 0.8,
      opacity: isMobile ? 0.7 : 0.2,
      zIndex: 20,
      filter: isMobile ? 'blur(3px)' : 'blur(12px)',
      pointerEvents: 'none',
      transition: { duration: 0.6, ease: [0.32, 0.72, 0, 1] as const }
    },
    hidden: {
      scale: 0.5,
      opacity: 0,
      zIndex: 0,
      filter: 'blur(20px)',
      pointerEvents: 'none',
      transition: { duration: 0.5 }
    }
  };

  return (
    <section className="py-16 md:py-48 bg-[#080a0f] overflow-hidden relative">
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 md:mb-20 text-center"
        >
          <span className="block text-[#c5a059] text-[0.875rem] tracking-[0.4em] uppercase mb-6 font-bold">What Our Clients Say</span>
          <h2 className="text-5xl md:text-7xl font-serif leading-tight text-white mb-2">
            Real Results,<br />
            <span className="italic text-[#c5a059]">Real Impact</span>
          </h2>
        </motion.div>

        <div className="max-w-7xl mx-auto relative min-h-[700px] sm:min-h-[750px] md:min-h-[800px] flex flex-col md:flex-row items-start md:items-center justify-center pt-8 md:pt-0">

          {/* Circular Navigation Buttons - Below the card on mobile, where they would cover the quote, aligned with it from md */}
          <div className="relative order-last md:order-none mt-6 md:mt-0 md:absolute md:inset-x-0 md:top-1/2 md:-translate-y-1/2 z-[60] pointer-events-none flex items-center justify-center gap-6 md:justify-between px-2 w-full">
            <button
              onClick={prevTestimonial}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#c5a059] hover:border-[#c5a059] hover:text-[#181818] transition-all duration-300 pointer-events-auto group focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c5a059] cursor-pointer"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:-translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
            </button>
            <button
              onClick={nextTestimonial}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#c5a059] hover:border-[#c5a059] hover:text-[#181818] transition-all duration-300 pointer-events-auto group focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c5a059] cursor-pointer"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
            </button>
          </div>

          <div className="grid grid-cols-1 place-items-center w-full relative">
            {testimonials.map((testimonial, index) => {
              let position = "hidden";
              if (index === activeIndex) position = "active";
              else if (index === leftIndex) position = "left";
              else if (index === rightIndex) position = "right";

              return (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  animate={position}
                  initial="hidden"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.1}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -50) nextTestimonial();
                    if (info.offset.x > 50) prevTestimonial();
                  }}
                  style={{
                    touchAction: 'pan-y',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'auto',
                    textRendering: 'geometricPrecision',
                    backfaceVisibility: 'visible',
                  }}
                  className="col-start-1 row-start-1 w-[85%] md:w-[850px] min-h-[620px] sm:min-h-[600px] md:min-h-[580px] lg:min-h-[650px] bg-[#111111] border border-white/5 rounded-sm p-6 md:p-14 lg:p-20 shadow-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
                >
                  {/* Large Background Quote Icon */}
                  <div className="absolute top-6 left-6 md:top-10 md:left-10 text-white/[0.02] pointer-events-none">
                    <Quote size={isMobile ? 80 : 140} fill="currentColor" strokeWidth={0} />
                  </div>

                  <div className="relative z-10 text-center flex flex-col items-center select-none w-full max-w-4xl mx-auto px-2 md:px-4">
                    {/* Logo at the top */}
                    <div className="mb-6 md:mb-10 relative h-12 md:h-20 w-32 md:w-56 mx-auto">
                      <Image
                        src={testimonial.logo}
                        alt={testimonial.company}
                        fill
                        className={`object-contain ${testimonial.invertLogo ? 'brightness-0 invert' : ''}`}
                      />
                    </div>

                    <p className="text-xl md:text-2xl lg:text-3xl text-white font-serif font-light leading-relaxed mb-4 md:mb-10 max-w-3xl mx-auto" style={{ fontSize: 'clamp(0.875rem, 0.8rem + 0.4vw, 1.125rem)' }}>
                      {renderQuote(testimonial.quote, testimonial.highlight)}
                    </p>

                    <div className="flex flex-col items-center mt-auto">
                      <h3 className="text-[#c5a059] font-serif text-lg md:text-2xl mb-1 md:mb-2">{testimonial.name}</h3>
                      <h4 className="text-white/60 font-light text-[0.875rem] md:text-sm tracking-[0.2em] uppercase">{testimonial.author}</h4>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Subtle Background Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#c5a059]/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        </div>
      </div>
    </section>
  );
}
