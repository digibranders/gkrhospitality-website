import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ImgHTMLAttributes } from 'react';
import LogosSection from './LogosSection';

vi.mock('next/image', () => ({
  default: ({ alt }: ImgHTMLAttributes<HTMLImageElement>) => <img src="/logo.png" alt={alt} />,
}));

describe('LogosSection', () => {
  it('exposes each logo once to assistive technology, despite the repeated marquee sets', () => {
    render(<LogosSection />);
    expect(screen.getAllByRole('img', { name: 'Adare Manor' })).toHaveLength(1);
    expect(screen.getAllByRole('img', { name: 'Buccament' })).toHaveLength(1);
    expect(screen.getAllByAltText('Adare Manor')).toHaveLength(3);
    expect(screen.queryByAltText(/hover/i)).toBeNull();
  });

  it('pauses and resumes both marquees from one button', () => {
    const { container } = render(<LogosSection />);
    const tracks = container.querySelectorAll<HTMLElement>('.will-change-transform');
    expect(tracks).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Pause logo animation' }));
    tracks.forEach((track) => expect(track.style.animationPlayState).toBe('paused'));

    fireEvent.click(screen.getByRole('button', { name: 'Play logo animation' }));
    tracks.forEach((track) => expect(track.style.animationPlayState).toBe(''));
  });
});
