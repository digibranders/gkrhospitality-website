'use client';

import React from 'react';
import { motion } from 'motion/react';
import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';

interface Service {
  title: string;
  description: string;
  bgImage: StaticImageData;
  anchor: string;
}

interface PhilosophySectionProps {
  services: Service[];
}

export default function PhilosophySection({ services }: PhilosophySectionProps) {
  return (
    <section id="philosophy" className="py-20 md:py-32 bg-[#FFF7F2]">
      <div className="container mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <span className="block text-[#70562d] text-[0.875rem] tracking-[0.4em] uppercase mb-6 font-bold">What We Do</span>
          <h2 className="text-5xl md:text-7xl font-serif leading-tight text-[#181818] mb-8 max-w-4xl">
            We take a creative, yet practical, consultative approach to ensure your properties and projects don&apos;t just run, they <span className="italic text-[#70562d]">thrive</span>.
          </h2>
          <p className="text-[#181818] text-lg leading-relaxed mb-8">
            We will support you at every stage of your project and the life cycle of your asset, including but not limited to….
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`${index === services.length - 1 ? 'lg:col-start-2' : ''
                }`}
            >
              <Link href={`/what-we-do#${service.anchor}`} className="group block relative overflow-hidden bg-white border border-[#181818]/10 hover:border-[#c5a059] transition-all duration-500 hover:shadow-xl h-full">
                {/* Image at the top */}
                <div className="aspect-[4/3] overflow-hidden relative">
                  <Image
                    src={service.bgImage}
                    alt=""
                    placeholder="blur"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 will-change-transform"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent opacity-60"></div>

                  {/* Title overlay on image */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-3xl font-serif text-white group-hover:text-[#c5a059] transition-colors duration-300">
                      {service.title}
                    </h3>
                  </div>
                </div>

                {/* Content below image */}
                <div className="p-8">
                  <p className="text-stone-600 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
