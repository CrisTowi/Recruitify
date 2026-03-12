import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '@/test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import TimelineItemEditForm from './TimelineItemEditForm';
import type { TimelineEvent } from '@/types';

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'event-1',
    company_id: 'company-1',
    event_type: 'note',
    title: 'Original title',
    body: 'Original body',
    contact_name: null,
    contact_role: null,
    contact_email: null,
    scheduled_at: null,
    process_status: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('TimelineItemEditForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('note event type', () => {
    it('renders title and body fields pre-filled with existing values', () => {
      render(<TimelineItemEditForm event={makeEvent()} onSaved={vi.fn()} onCancel={vi.fn()} />);
      expect((screen.getByDisplayValue('Original title') as HTMLInputElement).value).toBe('Original title');
      expect((screen.getByDisplayValue('Original body') as HTMLTextAreaElement).value).toBe('Original body');
    });

    it('submits updated note values to the API', async () => {
      const user = userEvent.setup();
      const onSaved = vi.fn();
      const updatedEvent = makeEvent({ title: 'Updated title' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedEvent),
      } as unknown as Response);

      render(<TimelineItemEditForm event={makeEvent()} onSaved={onSaved} onCancel={vi.fn()} />);
      const titleInput = screen.getByDisplayValue('Original title');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated title');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updatedEvent));
      expect(fetch).toHaveBeenCalledWith(
        '/api/companies/company-1/timeline/event-1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('Updated title'),
        }),
      );
    });
  });

  describe('contact event type', () => {
    it('renders contact name, role, email, and notes fields', () => {
      render(<TimelineItemEditForm
        event={makeEvent({ event_type: 'contact', contact_name: 'Jane', contact_role: 'EM', contact_email: 'jane@example.com' })}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />);
      expect(screen.getByDisplayValue('Jane')).toBeTruthy();
      expect(screen.getByDisplayValue('EM')).toBeTruthy();
      expect(screen.getByDisplayValue('jane@example.com')).toBeTruthy();
    });

    it('shows a validation error when contact name is empty', async () => {
      const user = userEvent.setup();
      render(<TimelineItemEditForm
        event={makeEvent({ event_type: 'contact', contact_name: '' })}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />);
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(screen.getByText('Contact name is required.')).toBeTruthy();
    });
  });

  describe('appointment event type', () => {
    it('renders title, date, and notes fields', () => {
      render(<TimelineItemEditForm
        event={makeEvent({ event_type: 'appointment', title: 'Onsite', scheduled_at: '2024-06-20T10:00:00Z' })}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />);
      expect(screen.getByDisplayValue('Onsite')).toBeTruthy();
    });
  });

  describe('process_status event type', () => {
    it('renders the status select pre-filled with the current value', () => {
      render(<TimelineItemEditForm
        event={makeEvent({ event_type: 'process_status', process_status: 'Offer pending' })}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('Offer pending');
    });
  });

  describe('shared behaviour', () => {
    it('calls onCancel when the Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<TimelineItemEditForm event={makeEvent()} onSaved={vi.fn()} onCancel={onCancel} />);
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('shows an error message when the API call fails', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Save failed' }),
      } as unknown as Response);

      render(<TimelineItemEditForm event={makeEvent()} onSaved={vi.fn()} onCancel={vi.fn()} />);
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(screen.getAllByText('Save failed').length).toBeGreaterThan(0));
    });
  });
});
