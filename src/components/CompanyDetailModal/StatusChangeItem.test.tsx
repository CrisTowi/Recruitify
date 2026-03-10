import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusChangeItem from './StatusChangeItem';
import type { TimelineEvent } from '@/types';

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'event-1',
    company_id: 'company-1',
    event_type: 'status_change',
    title: 'Applied',
    body: 'Interviewing',
    contact_name: null,
    contact_role: null,
    contact_email: null,
    scheduled_at: null,
    process_status: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('StatusChangeItem', () => {
  it('renders the from status', () => {
    render(<StatusChangeItem event={makeEvent()} />);
    expect(screen.getByText('Applied')).toBeTruthy();
  });

  it('renders the to status', () => {
    render(<StatusChangeItem event={makeEvent()} />);
    expect(screen.getByText('Interviewing')).toBeTruthy();
  });

  it('renders the arrow between statuses', () => {
    render(<StatusChangeItem event={makeEvent()} />);
    expect(screen.getByText('→', { exact: false })).toBeTruthy();
  });

  it('renders different status transitions', () => {
    render(<StatusChangeItem event={makeEvent({ title: 'Interviewing', body: 'Offer' })} />);
    expect(screen.getByText('Interviewing')).toBeTruthy();
    expect(screen.getByText('Offer')).toBeTruthy();
  });
});
