'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import logoImage from '@/assets/images/logos/gkr-logo.png';

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    // Check if it's a hash link pointing to the current page
    if (href.includes('#')) {
      const [path, hash] = href.split('#');
      // Check if we're on the same page (ignoring the hash)
      if (pathname === path || (path === '' && pathname === '/')) {
        e.preventDefault();
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
      return;
    }

    // Standard page link - scroll to top if already on page
    if (pathname === href) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const NAV_ITEMS = [
    { label: 'About Us', href: '/about' },
    { label: 'Our Work', href: '/work' },
    { label: 'What our Clients Say', href: '/reviews' },
    { label: 'How We Work', href: '/how-we-work' },
    { label: 'What we do', href: '/what-we-do' },
    { label: 'Gallery', href: '/gallery' }
  ];

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrolled ? 'bg-[#181818]/95 backdrop-blur-xl py-4 border-b border-white/10 shadow-lg' : 'bg-[#181818]/60 backdrop-blur-md py-8'}`}>
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" onClick={(e) => handleNavClick(e, '/')}>
              <Image
                src={logoImage}
                alt="GKR"
                className={`object-contain transition-all duration-500 ${scrolled ? 'h-10' : 'h-14'} w-auto brightness-0 invert cursor-pointer`}
                priority
              />
            </Link>

          </div>

          <div className="hidden xl:flex items-center gap-10">
            <div className="flex gap-10">
              {NAV_ITEMS.map((item, i) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-[0.75rem] uppercase tracking-[0.2em] font-medium text-stone-300 hover:text-[#c5a059] transition-colors relative block py-4 group"
                  onClick={(e) => handleNavClick(e, item.href)}
                >
                  <span className="text-[#c5a059] mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute -left-6">0{i + 1}</span>
                  {item.label}
                </Link>
              ))}
            </div>

            <Button
              asChild
              className="bg-transparent border border-[#c5a059] text-[#c5a059] hover:bg-[#c5a059] hover:text-[#181818] rounded-full px-8 py-6 tracking-[0.15em] text-[0.75rem] font-bold transition-all duration-500"
            >
              <Link href="/contact">CONTACT US</Link>
            </Button>
          </div>

          <button
            className="xl:hidden text-white hover:text-[#c5a059] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c5a059] rounded-md p-1"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open main menu"
          >
            <Menu size={28} strokeWidth={1} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#181818] flex flex-col justify-center items-center"
          >
            <button
              className="absolute top-8 right-6 text-white hover:text-[#c5a059] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c5a059] rounded-full p-2"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <div className="relative w-8 h-8 flex flex-col justify-center items-center gap-2">
                <span className="w-full h-[1px] bg-current rotate-45 absolute"></span>
                <span className="w-full h-[1px] bg-current -rotate-45 absolute"></span>
              </div>
            </button>

            {/* Mobile Menu Logo */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2">
              <Link href="/" onClick={(e) => {
                handleNavClick(e, '/');
                setMobileMenuOpen(false);
              }}>
                <Image
                  src={logoImage}
                  alt="GKR"
                  className="h-12 w-auto object-contain brightness-0 invert opacity-80 cursor-pointer"
                />
              </Link>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col gap-8 items-start"
            >
              {NAV_ITEMS.map((item, i) => (
                <div key={item.label} className="w-full">
                  <Link
                    href={item.href}
                    className="text-xl font-light tracking-[0.2em] hover:text-[#c5a059] transition-colors block w-full"
                    onClick={(e) => {
                      handleNavClick(e, item.href);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <span className="text-[#c5a059] mr-3">0{i + 1}</span> {item.label}
                  </Link>
                </div>
              ))}
              <Link
                href="/contact"
                className="text-xl font-light tracking-[0.2em] hover:text-[#c5a059] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-[#c5a059] mr-3">0{NAV_ITEMS.length + 1}</span> Contact
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
