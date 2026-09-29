import { Cormorant_Garamond, Montserrat } from 'next/font/google';

/*
 * Brand typefaces, self-hosted by next/font at build time. They used to be
 * pulled in with a Google Fonts @import in CSS, which the production CSS
 * pipeline dropped, so visitors saw fallback fonts.
 *
 * Both are variable fonts, so each style is a single file covering every
 * weight. The CSS variables are mapped to --font-sans and --font-serif in
 * src/styles/theme.css.
 */
export const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

/** Class names that define both font variables; apply to <html>. */
export const fontVariables = `${montserrat.variable} ${cormorant.variable}`;
