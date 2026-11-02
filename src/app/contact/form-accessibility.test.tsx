import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Contact from './page';
import { FAQ_DATA } from '@/data/faqData';

vi.mock('@/app/actions/send-email', () => ({ sendContactEmail: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ trackContactSubmitted: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" onClick={() => onSuccess('token-abc')}>
      Solve challenge
    </button>
  ),
}));

describe('Contact page', () => {
  it('clears the robot check error as soon as the challenge is solved', () => {
    render(<Contact />);
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/not a robot/i);

    fireEvent.click(screen.getByRole('button', { name: 'Solve challenge' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('puts each FAQ button inside its heading and names the answer region after it', () => {
    render(<Contact />);
    // The accessible name also carries the item number, such as "01".
    const name = (accessibleName: string): boolean => accessibleName.includes(FAQ_DATA[0].question);
    expect(screen.getByRole('heading', { name, level: 3 })).toContainElement(screen.getByRole('button', { name }));
    expect(screen.getByRole('region', { name, hidden: true })).toHaveTextContent(FAQ_DATA[0].answer);
  });
});
