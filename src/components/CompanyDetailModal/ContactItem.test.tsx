import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContactItem from './ContactItem';
import type { TimelineEvent } from '@/types';

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'event-1',
    company_id: 'company-1',
    event_type: 'contact',
    title: null,
    body: null,
    contact_name: 'Jane Smith',
    contact_role: null,
    contact_email: null,
    scheduled_at: null,
    process_status: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ContactItem', () => {
  it('renders the contact name', () => {
    render(<ContactItem event={makeEvent()} />);
    expect(screen.getByText('Jane Smith')).toBeTruthy();
  });

  it('renders the contact role when provided', () => {
    render(<ContactItem event={makeEvent({ contact_role: 'Engineering Manager' })} />);
    expect(screen.getByText('Engineering Manager')).toBeTruthy();
  });

  it('does not render role when not provided', () => {
    render(<ContactItem event={makeEvent({ contact_role: null })} />);
    expect(screen.queryByText('Engineering Manager')).toBeNull();
  });

  it('renders a mailto link when email is provided', () => {
    render(<ContactItem event={makeEvent({ contact_email: 'jane@example.com' })} />);
    const link = screen.getByRole('link', { name: 'jane@example.com' });
    expect(link).toHaveAttribute('href', 'mailto:jane@example.com');
  });

  it('does not render an email link when email is null', () => {
    render(<ContactItem event={makeEvent({ contact_email: null })} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders notes when body is provided', () => {
    render(<ContactItem event={makeEvent({ body: 'Very friendly, follow up soon.' })} />);
    expect(screen.getByText('Very friendly, follow up soon.')).toBeTruthy();
  });
});
