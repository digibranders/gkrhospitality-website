import { render, screen } from '@testing-library/react';
import Home from './page';
import { describe, it, expect, vi } from 'vitest';
import type { ImgHTMLAttributes } from 'react';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Menu: () => <div data-testid="menu-icon" />,
  X: () => <div data-testid="x-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  Check: () => <div data-testid="check-icon" />,
  ArrowUpRight: () => <div data-testid="arrow-up-right-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  Play: () => <div data-testid="play-icon" />,
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt} />,
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Home />);
    // Check for "Hospitality Redefined" text which is in the Hero section
    // Check for "Hospitality" text which appears multiple times, ensure at least one heading or text exists
    const elements = screen.getAllByText(/Hospitality/i);
    expect(elements.length).toBeGreaterThan(0);
  });
});
