'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

// Garrett Ronan image
import garrettImage from '@/assets/images/about/GKR_About_3.jpg';
// Garrett signature
import signatureImage from '@/assets/images/about/signature.png';

// About Images
import ctaImage from '@/assets/images/about/GKR_About_4.jpg';

const EXPERIENCE_TIMELINE = [
  { role: "COO", company: "BLACE", description: "Tech-enabled meeting, event, venue marketplace, NYC & LA" },
  { role: "US COO", company: "etc.venues", description: "Launched US market, opened 3 NYC venues, successful merger with Convene." },
  { role: "VP Hotel Operations & Development", company: "Starr Restaurants", description: "Oversaw F&B and events for opening of first ever Equinox Hotel, Hudson Yards." },
  { role: "VP Operations & Development", company: "Azumi/Zuma", description: "Directed multi-city U.S. expansion across 6 major markets for 3 Brands Zuma, Etaru & Inko Nito" },
  { role: "Senior Leadership", company: "Premium Hotels & Resorts", description: "Waldorf Astoria, The Beverly Hilton, Boston Harbor Hotel, Principal Hotels UK, Adare Manor, Mövenpick" },
];

const SERVICES_LIST = [
  "Finance, capital, and accounting",
  "Legal coordination support",
  "Design, development, and construction management",
  "Logistics, vendor, and supply chain planning",
  "Real estate, market analysis, and site sourcing",
  "Deal support and negotiations",
  "HR and labor support (recruiting, training, compliance, unions, wage-and-hour, tips and gratuities and benefits)",
  "Operations, sales, and marketing",
  "Travel and tour planning",
  "Fractional COO and C-suite support",
  "Startup and pre-opening support",
  "M&A support"
];

export default function About() {

  return (
    <div className="bg-[#181818] text-[#FFF7F2] font-sans selection:bg-[#c5a059] selection:text-white overflow-x-hidden">

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-48 pb-8 md:pb-32">
        <div className="container mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-[#c5a059] text-[12px] font-bold tracking-[0.4em] uppercase block mb-6">About Us</span>
            <h1 className="text-6xl md:text-8xl font-serif font-light text-white leading-[1.1] mb-12 max-w-6xl">
              Real Operators,<br />
              <span className="italic text-[#c5a059]">GKR Hospitality</span>
            </h1>
            <p className="text-stone-300 text-xl max-w-3xl leading-relaxed">
              30+ years of US and International Hospitality Experience ~ Operational and Strategic.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Founder Story */}
      <section className="py-5 md:py-12 bg-[#181818]">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <motion.div
              className="lg:col-span-5"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="sticky top-32">
                <div className="aspect-[3/4] overflow-hidden rounded-sm mb-8">
                  <Image src={garrettImage} alt="Garrett Ronan" className="w-full h-full object-cover" />
                </div>
                <div className="border-l-2 border-[#c5a059] pl-6">
                  <p className="text-[#c5a059] text-xs uppercase tracking-[0.3em] mb-2">Founder & Principal</p>
                  <Image src={signatureImage} alt="Garrett Ronan signature" className="h-16 w-auto mb-4" />
                  <p className="text-stone-400 text-sm">30+ years of operational leadership in premium hospitality</p>
                </div>
              </div>
            </motion.div>

            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <p className="text-2xl md:text-3xl font-serif text-stone-300 leading-relaxed mb-8">
                  GKR Hospitality Consulting was founded by Garrett Ronan based on 30+ years of concepting, designing, building and operating hotels, resorts, restaurants, bars and hospitality venues in situations where failure is not an option.
                </p>

                <div className="space-y-6 text-stone-400 leading-relaxed ">
                  <p>
                    This includes responsibility for opening and operating, Zuma and Azumi restaurants across Six U.S. Cities.
                  </p>
                  <p>
                    In 2023, he went on to join and develop BLACE as COO, a unique start up tech-enabled meeting /event/ venue marketplace. Established in NYC and LA, he later oversaw their merger acquisition to form, Resident BLACE Holdings, where he serves as Senior Advisor.
                  </p>
                  <p>
                    The COO who launched etc.venues in the US, opening their first 3 NYC venues, going on to transition the company through a successful M&A with Convene.
                  </p>
                  <p>
                    The leader who made sure the first ever Equinox Hotel&rsquo;s F&B operation matched the brand&apos;s premium positioning from day one.
                  </p>

                  <p className="text-white text-lg font-serif italic border-l-2 border-[#c5a059] pl-6 py-2">
                    We started this firm because we identified a gap in the market for a true “end to end” consultancy service that can deliver real value and real solutions for hospitality projects and businesses at any stage in their lifecycle.
                  </p>

                  <p>
                    Hospitality doesn&apos;t need more theory. It needs operators who&apos;ve done the work—who know what it feels like when your opening is 90 days away and you must be ready, when your team must execute better, when you&apos;re busy but need to be more profitable.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Timeline */}
      <section className="py-24 md:py-32 bg-[#080a0f]">
        <div className="container mx-auto px-6 md:px-12">
          <div className="mb-16">
            <span className="text-[#c5a059] text-[12px] tracking-[0.4em] uppercase font-bold block mb-4">30+ Years</span>
            <h2 className="text-4xl md:text-6xl font-serif text-white mb-6">The Experience That<br />Built This Firm</h2>
          </div>

          <div className="space-y-1">
            {EXPERIENCE_TIMELINE.map((exp, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group border-l-2 border-white/10 hover:border-[#c5a059] transition-all duration-300 pl-8 py-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-baseline">
                  <div className="md:col-span-5">
                    <h4 className="text-xl md:text-2xl font-serif text-white group-hover:text-[#c5a059] transition-colors">
                      {exp.role}
                    </h4>
                    <p className="text-[#c5a059] text-sm uppercase tracking-wider mt-1">{exp.company}</p>
                  </div>
                  <div className="md:col-span-7">
                    <p className="text-stone-400 text-sm md:text-base">{exp.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 pt-16 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h4 className="text-white font-serif text-xl mb-4">Education & Background</h4>
              <p className="text-stone-400 leading-relaxed">
                Honors Graduate of Shannon College of Hotel Management. Career started in Switzerland and UK before moving to New York in 1998.
              </p>
            </div>
            <div>
              <h4 className="text-white font-serif text-xl mb-4">Industry Involvement</h4>
              <p className="text-stone-400 leading-relaxed">
                Active member of HSMAI.
              </p>
              <p className="text-stone-400 leading-relaxed">
                Active member of NYC Tourism + Conventions,
              </p>
              <p className="text-stone-400 leading-relaxed">
                Board member: NYC Hospitality Alliance—supporting advocacy and policy work for the industry.
              </p>
            </div>
            <div>
              <h4 className="text-white font-serif text-xl mb-4">Certificates/Associations</h4>
              <ul className="text-stone-400 leading-relaxed space-y-2">
                <li>Cornell University PDP. Real Estate Evaluation, Rev Management</li>
                <li>Court Of Master Sommeliers.</li>
                <li>Member of The Waldorf=Astoria Distinguished Alumni.</li>
                <li>Finalist, 2025 HSMAI Frank W. Berkman “Hospitality Professional of the Year” Award</li>
                <li>Head of Alumni for SCHM in the US</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different - NOW LIGHT */}
      <section className="py-24 md:py-32 bg-[#FFF7F2]">
        <div className="container mx-auto px-6 md:px-12">
          <div className="mb-20">
            <span className="text-[#8a6d3b] text-[12px] tracking-[0.4em] uppercase font-bold block mb-4">Our Approach</span>
            <h2 className="text-4xl md:text-6xl font-serif text-[#181818]">What Makes Us Different</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Full Life-Cycle Support */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="border border-[#181818]/10 p-8 hover:border-[#c5a059] hover:bg-white transition-all duration-500"
            >
              <div className="mb-6">
                <div className="w-12 h-12 rounded-full border-2 border-[#8a6d3b] flex items-center justify-center mb-4">
                  <span className="text-[#8a6d3b] text-xl font-serif">01</span>
                </div>
                <h3 className="text-2xl font-serif text-[#181818] mb-4">Full Life-Cycle Support</h3>
              </div>
              <p className="text-stone-600 leading-relaxed">
                We can support you from early concept and business planning through feasibility, site sourcing, build-out, pre and post opening, and performance improvement. This keeps decisions aligned and reduces costly handoffs.
              </p>
            </motion.div>

            {/* Cross-Functional Expertise */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="border border-[#181818]/10 p-8 hover:border-[#c5a059] hover:bg-white transition-all duration-500"
            >
              <div className="mb-6">
                <div className="w-12 h-12 rounded-full border-2 border-[#8a6d3b] flex items-center justify-center mb-4">
                  <span className="text-[#8a6d3b] text-xl font-serif">02</span>
                </div>
                <h3 className="text-2xl font-serif text-[#181818] mb-4">Cross-Functional Expertise in One Place</h3>
              </div>
              <p className="text-stone-600 leading-relaxed mb-6">
                We bring coordinated support across the areas that most often slow projects down or impact margins:
              </p>
              <div className="space-y-2">
                {SERVICES_LIST.slice(0, 6).map((service, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#8a6d3b] flex-shrink-0 mt-0.5" />
                    <span className="text-stone-600 text-sm">{service}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Flexible Engagement Model */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="border border-[#181818]/10 p-8 hover:border-[#c5a059] hover:bg-white transition-all duration-500"
            >
              <div className="mb-6">
                <div className="w-12 h-12 rounded-full border-2 border-[#8a6d3b] flex items-center justify-center mb-4">
                  <span className="text-[#8a6d3b] text-xl font-serif">03</span>
                </div>
                <h3 className="text-2xl font-serif text-[#181818] mb-4">Flexible Engagement Model</h3>
              </div>
              <p className="text-stone-600 leading-relaxed">
                Choose à la carte support or an end-to-end engagement based on your stage, priorities, and internal resources and capacity.
              </p>
            </motion.div>
            {/* Complete Services List - Converted to Card 04 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="border border-[#181818]/10 p-8 hover:border-[#c5a059] hover:bg-white transition-all duration-500"
            >
              <div className="mb-6">
                <div className="w-12 h-12 rounded-full border-2 border-[#8a6d3b] flex items-center justify-center mb-4">
                  <span className="text-[#8a6d3b] text-xl font-serif">04</span>
                </div>
                <h3 className="text-2xl font-serif text-[#181818] mb-4">Complete Service Capabilities</h3>
              </div>
              <div className="space-y-2 mb-6">
                {SERVICES_LIST.slice(6).map((service, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#8a6d3b] flex-shrink-0 mt-0.5" />
                    <span className="text-stone-600 text-sm">{service}</span>
                  </div>
                ))}
              </div>
              {/* <p className="text-stone-600 leading-relaxed text-sm">
                Garrett and his team have worked at all levels of the industry allowing them to bring a unique experience to you.
              </p> */}
            </motion.div>
          </div>

          <p className="text-stone-600 leading-relaxed text-lg md:text-xl text-center max-w-4xl mx-auto mt-12">
            Garrett and his team have worked at all levels of the industry allowing them to bring a unique experience to you.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-24 bg-[#c5a059] relative overflow-hidden">
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            {/* Left Column: Image */}
            <motion.div
              className="lg:col-span-5"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="aspect-[3/4] overflow-hidden rounded-sm">
                <Image src={ctaImage} alt="" className="w-full h-full object-cover" />
              </div>
            </motion.div>

            {/* Right Column: Content */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <h2 className="text-5xl md:text-7xl font-serif text-[#181818] mb-8 leading-tight">
                  Ready to Build Something<br />
                  <span className="italic text-white">Exceptional?</span>
                </h2>
                <p className="text-[#181818] text-lg mb-12 max-w-2xl mx-auto lg:mx-0">
                  Let&apos;s discuss how we can support your hospitality vision
                </p>
                <Button asChild className="bg-[#181818] text-white hover:bg-white hover:text-[#181818] px-4 py-3 md:px-12 md:py-7 text-[0.75rem] md:text-sm uppercase tracking-[0.15em] md:tracking-[0.3em] font-bold transition-all duration-500 rounded-full h-auto whitespace-normal md:whitespace-nowrap leading-relaxed w-auto max-w-none">
                  <Link href="/contact">Schedule Your Complimentary Discovery Call</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
