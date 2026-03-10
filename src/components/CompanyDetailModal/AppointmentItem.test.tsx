import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppointmentItem from './AppointmentItem';
import type { TimelineEvent } from '@/types';

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'event-1',
    company_id: 'company-1',
    event_type: 'appointment',
    title: null,
    body: null,
    contact_name: null,
    contact_role: null,
    contact_email: null,
    scheduled_at: null,
    process_status: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('AppointmentItem', () => {
  it('renders the appointment title when provided', () => {
    render(<AppointmentItem event={makeEvent({ title: 'Technical Screen' })} />);
    expect(screen.getByText('Technical Screen')).toBeTruthy();
  });

  it('does not render title when not provided', () => {
    const { container } = render(<AppointmentItem event={makeEvent()} />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('renders a formatted date when scheduled_at is provided', () => {
    render(<AppointmentItem event={makeEvent({ scheduled_at: '2024-06-20T10:00:00Z' })} />);
    expect(screen.getByText(/Jun/i)).toBeTruthy();
    expect(screen.getByText(/2024/)).toBeTruthy();
  });

  it('does not render a date when scheduled_at is null', () => {
    render(<AppointmentItem event={makeEvent({ scheduled_at: null })} />);
    expect(screen.queryByText(/2024/)).toBeNull();
  });

  it('renders notes when body is provided', () => {
    render(<AppointmentItem event={makeEvent({ body: '45 min Zoom call.' })} />);
    expect(screen.getByText('45 min Zoom call.')).toBeTruthy();
  });
});
