import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddEntryForm from './AddEntryForm';
import type { TimelineEvent } from '@/types';

const mockEvent: TimelineEvent = {
  id: 'event-1',
  company_id: 'company-1',
  event_type: 'note',
  title: 'My note',
  body: 'Some body',
  contact_name: null,
  contact_role: null,
  contact_email: null,
  scheduled_at: null,
  process_status: null,
  created_at: '2024-01-01T00:00:00Z',
};

describe('AddEntryForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the event type tabs', () => {
    render(<AddEntryForm companyId="company-1" onCreated={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Note' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Contact' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Appointment' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Process Status' })).toBeTruthy();
  });

  it('shows note fields by default', () => {
    render(<AddEntryForm companyId="company-1" onCreated={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Post-interview thoughts/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Write your note/i)).toBeTruthy();
  });

  it('switches to contact fields when Contact tab is clicked', async () => {
    const user = userEvent.setup();
    render(<AddEntryForm companyId="company-1" onCreated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Contact' }));
    expect(screen.getByPlaceholderText(/Jane Smith/i)).toBeTruthy();
  });

  it('switches to appointment fields when Appointment tab is clicked', async () => {
    const user = userEvent.setup();
    render(<AddEntryForm companyId="company-1" onCreated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Appointment' }));
    expect(screen.getByPlaceholderText(/Technical Screen/i)).toBeTruthy();
  });

  it('shows a process status select when Process Status tab is clicked', async () => {
    const user = userEvent.setup();
    render(<AddEntryForm companyId="company-1" onCreated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Process Status' }));
    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('shows a validation error when submitting a contact without a name', async () => {
    const user = userEvent.setup();
    render(<AddEntryForm companyId="company-1" onCreated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Contact' }));
    await user.click(screen.getByRole('button', { name: 'Add Entry' }));
    expect(screen.getByText('Contact name is required.')).toBeTruthy();
  });

  it('calls onCreated and resets fields after a successful note submission', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEvent),
    } as unknown as Response);

    render(<AddEntryForm companyId="company-1" onCreated={onCreated} />);
    await user.type(screen.getByPlaceholderText(/Write your note/i), 'Great interview');
    await user.click(screen.getByRole('button', { name: 'Add Entry' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(mockEvent));
    expect((screen.getByPlaceholderText(/Write your note/i) as HTMLTextAreaElement).value).toBe('');
  });

  it('sends the correct payload for a note entry', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEvent),
    } as unknown as Response);

    render(<AddEntryForm companyId="company-1" onCreated={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/Post-interview thoughts/i), 'Round 1');
    await user.type(screen.getByPlaceholderText(/Write your note/i), 'Went well');
    await user.click(screen.getByRole('button', { name: 'Add Entry' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/companies/company-1/timeline',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Round 1'),
      }),
    ));
  });

  it('shows an error message when the API call fails', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    } as unknown as Response);

    render(<AddEntryForm companyId="company-1" onCreated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add Entry' }));
    await waitFor(() => expect(screen.getByText('Server error')).toBeTruthy());
  });
});
