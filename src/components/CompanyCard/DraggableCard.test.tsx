import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DraggableCard from './DraggableCard';
import type { CompanyWithNextStep } from '@/types';

vi.mock('@dnd-kit/core', () => ({
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

function makeCompany(overrides: Partial<CompanyWithNextStep> = {}): CompanyWithNextStep {
  return {
    id: 'company-1',
    name: 'Stripe',
    logo_url: null,
    status: 'Applied',
    interest_level: null,
    prep_notes: null,
    created_at: '2024-01-01T00:00:00Z',
    next_step: null,
    ...overrides,
  };
}

describe('DraggableCard', () => {
  it('renders the company card content', () => {
    render(<DraggableCard company={makeCompany()} />);
    expect(screen.getByText('Stripe')).toBeTruthy();
  });

  it('calls onCardClick with the company when clicked', async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    render(<DraggableCard company={makeCompany()} onCardClick={onCardClick} />);
    await user.click(screen.getByText('Stripe'));
    expect(onCardClick).toHaveBeenCalledWith(makeCompany());
  });

  it('does not attach an onClick when onCardClick is not provided', () => {
    const { container } = render(<DraggableCard company={makeCompany()} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.onclick).toBeNull();
  });
});
