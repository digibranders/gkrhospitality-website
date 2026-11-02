'use client';

import React from 'react';
import { motion } from 'motion/react';
import Image, { StaticImageData } from 'next/image';
import { Pause, Play } from 'lucide-react';

// Employed By Logos
import beverlyHiltonLogo from '@/assets/images/logos/beverly-hilton.png';
import starrRestaurantsLogo from '@/assets/images/logos/starr-restaurants.png';
import equinoxHotelsLogo from '@/assets/images/logos/equinox-hotels.png';
import azumiLogo from '@/assets/images/logos/azumi.png';
import etaruLogo from '@/assets/images/logos/etaru.png';
import inkoNitoLogo from '@/assets/images/logos/inko-nito.png';

import movenpickLogo from '@/assets/images/logos/movenpick.png';
import adareManorLogo from '@/assets/images/logos/adare-manor.png';
import swallowHotelsLogo from '@/assets/images/logos/swallow-hotels.png';
import principalHotelsLogo from '@/assets/images/logos/principal-hotels.png';
import bostonHarborHotelLogo from '@/assets/images/logos/boston-harbor-hotel.png';
import etcVenuesLogo from '@/assets/images/logos/etc-venues.png';
import conveneLogo from '@/assets/images/logos/convene-etcvenues.png';

// Consulted With Logos
import bakanLogo from '@/assets/images/logos/bakan.png';
import support305Logo from '@/assets/images/logos/Support-305-Black.png';
import zumaConsultedLogo from '@/assets/images/logos/zuma-consulted.png';
import bxpLogo from '@/assets/images/logos/bxp.png';
import rudinLogo from '@/assets/images/logos/rudin.png';
import blaceLogo from '@/assets/images/logos/blace.png';

import affectLogo from '@/assets/images/logos/affect-group.png';
import sageLogo from '@/assets/images/logos/sage-hospitality.png';
import buccamentLogo from '@/assets/images/logos/buccament.png';
import buccamentTransperentLogo from '@/assets/images/logos/buccament-transperant.png';
import fairfieldLogo from '@/assets/images/logos/fairfield.png';
import montaukLogo from '@/assets/images/logos/montauk.png';

// New Logos
import hiltonHotelsLogo from '@/assets/images/logos/hilton_hotels.png';
import rLogo from '@/assets/images/logos/r.png';
import waldorfLogo from '@/assets/images/logos/waldorf.png';
import nycHospitalityLogo from '@/assets/images/logos/nyc_hospitality.png';

interface Company {
  name: string;
  logo: StaticImageData | null;
  hoverLogo?: StaticImageData | null; // Optional hover logo
  dimensions?: string; // Optional custom dimensions
  className?: string; // Optional custom tailwind classes to override defaults
}

// Default dimensions for logos if not specified
const DEFAULT_DIMENSIONS = 'h-8 w-[100px] md:h-12 md:w-[140px]';

// Cleaned up & Consolidated Data
const EMPLOYED_BY_COMPANIES: Company[] = [
  { name: 'Mövenpick', logo: movenpickLogo },
  { name: 'Adare Manor', logo: adareManorLogo },
  { name: 'Swallow Hotels', logo: swallowHotelsLogo },
  { name: 'Principal Hotels', logo: principalHotelsLogo },
  { name: 'Waldorf Astoria', logo: waldorfLogo, dimensions: 'h-12 w-[150px] md:h-16 md:w-[200px]' }, // Updated logo
  { name: 'Boston Harbor Hotel', logo: bostonHarborHotelLogo, dimensions: 'h-10 w-[120px] md:h-14 md:w-[160px]' },
  { name: 'The Beverly Hilton', logo: beverlyHiltonLogo },
  { name: 'Hilton Hotels', logo: hiltonHotelsLogo }, // New
  // { name: 'ROKA', logo: rokaLogo, dimensions: 'h-6 w-[70px] md:h-8 md:w-[100px]' },
  { name: 'Azumi', logo: azumiLogo, dimensions: 'h-6 w-[70px] md:h-8 md:w-[100px]' },
  { name: 'ETARU', logo: etaruLogo, dimensions: 'h-6 w-[70px] md:h-8 md:w-[100px]' },
  { name: 'INKO NITO', logo: inkoNitoLogo, dimensions: 'h-6 w-[70px] md:h-8 md:w-[100px]', className: 'grayscale-0 brightness-100' }, // Always light/visible
  { name: 'Starr Restaurants', logo: starrRestaurantsLogo },
  { name: 'etc.venues', logo: etcVenuesLogo, dimensions: 'h-6 w-[120px] md:h-12 md:w-[180px]' }, // Manually sized for balance
];

const CONSULTED_WITH_COMPANIES: Company[] = [
  { name: 'BXP', logo: bxpLogo, dimensions: 'h-8 w-[90px] md:h-12 md:w-[120px]' },
  { name: 'Rudin Group', logo: rudinLogo, dimensions: 'h-4 w-[70px] md:h-6 md:w-[90px]' },
  { name: 'Zuma', logo: zumaConsultedLogo, dimensions: 'h-4 w-[70px] md:h-6 md:w-[90px]' },
  { name: 'Equinox Hotels', logo: equinoxHotelsLogo },
  { name: 'R', logo: rLogo, hoverLogo: rLogo, className: 'grayscale-0 brightness-100' },
  { name: 'Convene', logo: conveneLogo, dimensions: 'h-6 w-[140px] md:h-15 md:w-[310px]' },
  { name: 'Affect Group', logo: affectLogo, dimensions: 'h-5 w-[65px] md:h-7 md:w-[90px]' },
  { name: 'Sage Hospitality', logo: sageLogo, dimensions: 'h-6 w-[80px] md:h-8 md:w-[110px]' },
  { name: 'Bakan', logo: bakanLogo, dimensions: 'h-7 w-[90px] md:h-10 md:w-[120px]' },
  { name: 'Support 305', logo: support305Logo, dimensions: 'h-8 w-[100px] md:h-11 md:w-[140px]' },
  { name: 'Fairfield', logo: fairfieldLogo },
  { name: 'Montauk', logo: montaukLogo },
  { name: 'Blace', logo: blaceLogo, dimensions: 'h-6 w-[100px] md:h-8 md:w-[120px]' },
  { name: 'Buccament', logo: buccamentTransperentLogo, hoverLogo: buccamentLogo, className: 'grayscale-0 brightness-100' },
  { name: 'Nyc Hospitality', logo: nycHospitalityLogo, hoverLogo: nycHospitalityLogo, className: 'grayscale-0 brightness-100' },
];

interface LogoMarqueeProps {
  companies: Company[];
  /** Gap and animation classes for this row. */
  trackClassName: string;
  isPaused: boolean;
}

function LogoMarquee({ companies, trackClassName, isPaused }: LogoMarqueeProps) {
  // Using 3 sets ensuring enough buffer for smooth infinite loop on all screen sizes
  const marquee = [...companies, ...companies, ...companies];

  return (
    <div className="relative overflow-hidden w-full mt-2">
      {/* Gradient overlays for fade effect - visible on all devices */}
      <div className="absolute left-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-r from-[#FFF7F2] to-transparent z-10 motion-reduce:hidden"></div>
      <div className="absolute right-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-l from-[#FFF7F2] to-transparent z-10 motion-reduce:hidden"></div>

      <div className="flex">
        {/* Under reduced motion the row stands still, so one set wraps to show every logo. */}
        <div
          className={`flex items-center flex-nowrap will-change-transform motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center ${trackClassName}`}
          style={isPaused ? { animationPlayState: 'paused' } : undefined}
        >
          {marquee.map((company, idx) => {
            const isRepeat = idx >= companies.length;
            return (
              <div
                key={`${company.name}-${idx}`}
                aria-hidden={isRepeat || undefined}
                className={`flex-shrink-0 flex items-center justify-center group ${isRepeat ? 'motion-reduce:hidden' : ''}`}
              >
                {company.logo ? (
                  <div className={`relative ${company.dimensions || DEFAULT_DIMENSIONS}`}>
                    <Image
                      src={company.logo}
                      alt={company.name}
                      className={`object-contain transition-all duration-500 w-full h-full ${company.className || 'grayscale brightness-[0.3] group-hover:grayscale-0 group-hover:brightness-100'} ${company.hoverLogo ? 'group-hover:opacity-0' : ''}`}
                    />
                    {company.hoverLogo && (
                      <Image
                        src={company.hoverLogo}
                        alt=""
                        className={`absolute inset-0 object-contain transition-all duration-500 opacity-0 group-hover:opacity-100 w-full h-full ${company.className || ''}`}
                      />
                    )}
                  </div>
                ) : (
                  <span className="text-[#181818] group-hover:text-[#8a6d3b] text-base md:text-lg font-medium tracking-wide whitespace-nowrap transition-colors duration-300">{company.name}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LogosSection() {
  const [isPaused, setIsPaused] = React.useState(false);

  return (
    <section id="expertise" className="py-20 md:py-48 bg-[#FFF7F2] relative overflow-hidden">
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="block text-[#8a6d3b] text-[0.875rem] tracking-[0.4em] uppercase mb-6 md:mb-8 font-bold">Trusted By Industry Leaders</span>
          <h2 className="text-4xl md:text-6xl lg:text-8xl font-serif text-[#181818] mb-8 leading-tight">
            Brands We&apos;ve<br />
            <span className="italic text-[#8a6d3b]">Supported</span>
          </h2>
        </motion.div>

        {/* Employed By Marquee */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 md:mb-20"
        >
          <div className="text-center mb-6">
            <h3 className="text-xl md:text-2xl font-serif text-[#181818] mb-2">Employed By</h3>
            <div className="w-16 h-px bg-[#8a6d3b] mx-auto"></div>
          </div>

          <LogoMarquee
            companies={EMPLOYED_BY_COMPANIES}
            trackClassName="gap-4 md:gap-16 motion-safe:animate-[logo-marquee_25s_linear_infinite] motion-safe:md:animate-[logo-marquee_40s_linear_infinite]"
            isPaused={isPaused}
          />
        </motion.div>

        {/* Consulted With Marquee */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-center mb-6">
            <h3 className="text-xl md:text-2xl font-serif text-[#181818] mb-2">Consulted With</h3>
            <div className="w-16 h-px bg-[#8a6d3b] mx-auto"></div>
          </div>

          <LogoMarquee
            companies={CONSULTED_WITH_COMPANIES}
            trackClassName="gap-8 md:gap-24 motion-safe:animate-[logo-marquee_20s_linear_infinite] motion-safe:md:animate-[logo-marquee_30s_linear_infinite]"
            isPaused={isPaused}
          />
        </motion.div>

        <div className="mt-10 flex justify-center motion-reduce:hidden">
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            aria-label={isPaused ? 'Play logo animation' : 'Pause logo animation'}
            className="w-10 h-10 rounded-full border border-[#181818]/50 text-[#181818] flex items-center justify-center cursor-pointer transition-colors duration-300 hover:bg-[#181818] hover:text-[#FFF7F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a6d3b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF7F2]"
          >
            {isPaused ? <Play className="w-4 h-4" aria-hidden="true" /> : <Pause className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </section>
  );
}
