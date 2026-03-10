import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProcessStatusItem from './ProcessStatusItem';
import type { TimelineEvent } from '@/types';

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'event-1',
    company_id: 'company-1',
    event_type: 'process_status',
    title: null,
    body: null,
    contact_name: null,
    contact_role: null,
    contact_email: null,
    scheduled_at: null,
    process_status: 'Waiting for update',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ProcessStatusItem', () => {
  it('renders the process status value', () => {
    render(<ProcessStatusItem event={makeEvent({ process_status: 'Waiting for update' })} />);
    expect(screen.getByText('Waiting for update')).toBeTruthy();
  });

  it('renders other process status values', () => {
    render(<ProcessStatusItem event={makeEvent({ process_status: 'Offer pending' })} />);
    expect(screen.getByText('Offer pending')).toBeTruthy();
  });
});
