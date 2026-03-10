import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DroppableColumn from './DroppableColumn';
import type { CompanyWithNextStep } from '@/types';

vi.mock('@dnd-kit/core', () => ({
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}));

function makeCompany(id: string, name: string): CompanyWithNextStep {
  return {
    id,
    name,
    logo_url: null,
    status: 'Applied',
    interest_level: null,
    prep_notes: null,
    created_at: '2024-01-01T00:00:00Z',
    next_step: null,
  };
}

describe('DroppableColumn', () => {
  it('renders the column status title', () => {
    render(<DroppableColumn status="Applied" cards={[]} onCardClick={vi.fn()} />);
    expect(screen.getByText('Applied')).toBeTruthy();
  });

  it('shows the card count', () => {
    const cards = [makeCompany('1', 'Stripe'), makeCompany('2', 'Vercel')];
    render(<DroppableColumn status="Applied" cards={cards} onCardClick={vi.fn()} />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows an empty state message when there are no cards', () => {
    render(<DroppableColumn status="Wishlist" cards={[]} onCardClick={vi.fn()} />);
    expect(screen.getByText('No companies here yet.')).toBeTruthy();
  });

  it('renders each company card', () => {
    const cards = [makeCompany('1', 'Stripe'), makeCompany('2', 'Vercel')];
    render(<DroppableColumn status="Applied" cards={cards} onCardClick={vi.fn()} />);
    expect(screen.getByText('Stripe')).toBeTruthy();
    expect(screen.getByText('Vercel')).toBeTruthy();
  });

  it('calls onCardClick with the company when a card is clicked', async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    const cards = [makeCompany('1', 'Stripe')];
    render(<DroppableColumn status="Applied" cards={cards} onCardClick={onCardClick} />);
    await user.click(screen.getByText('Stripe'));
    expect(onCardClick).toHaveBeenCalledWith(cards[0]);
  });
});
