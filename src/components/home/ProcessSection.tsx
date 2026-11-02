'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import Image, { StaticImageData } from 'next/image';

interface WorkStep {
  number: string;
  title: string;
  description: string;
  image: StaticImageData;
}

interface ProcessSectionProps {
  steps: WorkStep[];
}

export default function ProcessSection({ steps }: ProcessSectionProps) {
  const [currentWorkStep, setCurrentWorkStep] = useState(0);

  return (
    <section id="how-we-work" className="py-32 md:py-48 bg-[#181818]">
      <div className="container mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <span className="block text-[#c5a059] text-[0.875rem] tracking-[0.4em] uppercase mb-6 font-bold">How We Work</span>
          <h2 className="text-5xl md:text-7xl font-serif leading-tight text-white max-w-4xl">
            A Clear, Proven <span className="italic text-[#c5a059]">Process</span>
          </h2>
          <p className="text-stone-400 text-base md:text-lg mt-6">
            <span className="font-serif italic">&quot;We do the difficult immediately. The impossible may take us a few moments longer.&quot;</span> ~ Waldorf Astoria
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left: Steps */}
          <div className="space-y-0">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onMouseEnter={() => setCurrentWorkStep(index)}
                className={`border-b border-white/10 last:border-0 py-8 group transition-all duration-300 ${currentWorkStep === index ? 'bg-white/5' : ''
                  }`}
              >
                <div className="flex gap-6 items-start px-6">
                  <span className={`text-4xl font-serif transition-colors duration-300 ${currentWorkStep === index ? 'text-[#c5a059]' : 'text-[#c5a059]/60'
                    }`}>
                    {step.number}
                  </span>
                  <div>
                    <h3 className={`text-2xl md:text-3xl font-serif mb-4 transition-colors duration-300 ${currentWorkStep === index ? 'text-[#c5a059]' : 'text-white'
                      }`}>
                      {step.title}
                    </h3>
                    <p className="text-stone-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right: Images */}
          <div className="relative hidden lg:block">
            <div className="sticky top-32 w-full aspect-[4/5] overflow-hidden rounded-sm">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: currentWorkStep === index ? 1 : 0,
                    scale: currentWorkStep === index ? 1 : 1.1
                  }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0"
                >
                  <Image src={step.image} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent opacity-60"></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
