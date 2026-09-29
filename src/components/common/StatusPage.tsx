import type { ReactNode } from 'react';

interface StatusPageProps {
  /** Heading text before the emphasised word. */
  title: string;
  /** The last word of the heading, set in gold italic like the rest of the site. */
  emphasis: string;
  message: string;
  /** Buttons or links, laid out side by side. */
  actions: ReactNode;
}

/** Shared layout for the 404 and error pages. */
export default function StatusPage({ title, emphasis, message, actions }: StatusPageProps) {
  return (
    <div className="bg-[#181818] text-[#FFF7F2] min-h-[80dvh] flex items-center px-6 md:px-12 pt-32 pb-20">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-serif text-white leading-tight mb-6">
          {title} <span className="text-[#c5a059] italic">{emphasis}</span>
        </h1>
        <p className="text-stone-300 text-lg font-light leading-relaxed max-w-xl mb-12">{message}</p>
        <div className="flex flex-wrap gap-4">{actions}</div>
      </div>
    </div>
  );
}

export const primaryActionClass =
  'inline-flex items-center justify-center rounded-full bg-[#c5a059] text-[#181818] px-8 py-4 text-xs uppercase tracking-[0.2em] font-bold transition-opacity duration-300 hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c5a059]';

export const secondaryActionClass =
  'inline-flex items-center justify-center rounded-full border border-[#c5a059] text-[#c5a059] px-8 py-4 text-xs uppercase tracking-[0.2em] font-bold transition-colors duration-300 hover:bg-[#c5a059] hover:text-[#181818] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c5a059]';
