import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImgHTMLAttributes } from 'react';
import { motionValue } from 'motion/react';
import type { StaticImageData } from 'next/image';
import HeroSection from './HeroSection';

vi.mock('next/image', () => ({
  default: ({ alt }: ImgHTMLAttributes<HTMLImageElement>) => <img src="/hero.jpg" alt={alt} />,
}));

const src: StaticImageData = { src: '/hero.jpg', width: 100, height: 100 };
const images = [
  { src, alt: 'First slide' },
  { src, alt: 'Second slide' },
  { src, alt: 'Third slide' },
];

const renderHero = (): void => {
  render(<HeroSection images={images} scale={motionValue(1)} />);
};

describe('HeroSection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes only the visible slide, using its own alt text', () => {
    renderHero();
    expect(screen.getByRole('img', { name: 'First slide' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Second slide' })).toBeNull();
  });

  it('advances on its own until paused, and resumes when played', () => {
    renderHero();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('img', { name: 'Second slide' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pause slideshow' }));
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.getByRole('img', { name: 'Second slide' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play slideshow' }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('img', { name: 'Third slide' })).toBeInTheDocument();
  });
});
