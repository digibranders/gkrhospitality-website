import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ImgHTMLAttributes } from 'react';
import type { StaticImageData } from 'next/image';
import ProcessSection from './ProcessSection';

vi.mock('next/image', () => ({
  default: ({ alt }: ImgHTMLAttributes<HTMLImageElement>) => <img src="/step.jpg" alt={alt} />,
}));

const image: StaticImageData = { src: '/step.jpg', width: 100, height: 100 };

describe('ProcessSection', () => {
  it('shows every step as plain content, not as controls', () => {
    render(<ProcessSection steps={[{ number: '01', title: 'Briefing', description: 'We listen.', image }]} />);
    expect(screen.getByRole('heading', { name: 'Briefing' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
