import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimatedCounter } from './AnimatedCounter';

const { reducedMotion } = vi.hoisted(() => ({ reducedMotion: { current: false } }));

vi.mock('motion/react', () => ({
  useInView: () => true,
  useReducedMotion: () => reducedMotion.current,
}));

describe('AnimatedCounter', () => {
  let frames: FrameRequestCallback[];

  const runFrame = (time: number): void => {
    const callback = frames.shift();
    act(() => callback?.(time));
  };

  beforeEach(() => {
    frames = [];
    reducedMotion.current = false;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serves the real value exactly once, for visitors without JavaScript', () => {
    const html = renderToString(<AnimatedCounter end={30} suffix="+" />);
    expect(html.match(/30\+/g)).toHaveLength(1);
    expect(html).not.toContain('aria-hidden');
  });

  it('keeps counting up, with the changing number hidden from screen readers', () => {
    render(<AnimatedCounter end={30} duration={1} suffix="+" />);

    runFrame(1000);
    expect(screen.getByText('0+')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('30+')).toHaveClass('sr-only');

    runFrame(1500);
    expect(screen.getByText('15+')).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not animate under reduced motion', () => {
    reducedMotion.current = true;
    render(<AnimatedCounter end={30} suffix="+" />);
    expect(frames).toHaveLength(0);
    expect(screen.getByText('30+')).not.toHaveClass('sr-only');
  });
});
