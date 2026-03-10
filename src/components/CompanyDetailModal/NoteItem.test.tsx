import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NoteItem from './NoteItem';
import type { TimelineEvent } from '@/types';

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'event-1',
    company_id: 'company-1',
    event_type: 'note',
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

describe('NoteItem', () => {
  it('renders the note title when provided', () => {
    render(<NoteItem event={makeEvent({ title: 'Post-interview thoughts' })} />);
    expect(screen.getByText('Post-interview thoughts')).toBeTruthy();
  });

  it('renders the note body when provided', () => {
    render(<NoteItem event={makeEvent({ body: 'Great culture fit.' })} />);
    expect(screen.getByText('Great culture fit.')).toBeTruthy();
  });

  it('renders both title and body together', () => {
    render(<NoteItem event={makeEvent({ title: 'Round 1', body: 'Went well.' })} />);
    expect(screen.getByText('Round 1')).toBeTruthy();
    expect(screen.getByText('Went well.')).toBeTruthy();
  });

  it('renders nothing visible when title and body are both null', () => {
    const { container } = render(<NoteItem event={makeEvent()} />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});
