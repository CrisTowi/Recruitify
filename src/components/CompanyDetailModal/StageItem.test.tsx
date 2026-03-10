import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StageItem from './StageItem';
import type { InterviewStage } from '@/types';

function makeStage(overrides: Partial<InterviewStage> = {}): InterviewStage {
  return {
    id: 'stage-1',
    company_id: 'company-1',
    stage_name: 'Technical Screen',
    is_completed: false,
    scheduled_date: null,
    order_index: 0,
    notes: null,
    ...overrides,
  };
}

const defaultProps = {
  companyId: 'company-1',
  onUpdated: vi.fn(),
  onDeleted: vi.fn(),
  onTimelineCreated: vi.fn(),
};

describe('StageItem', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('display', () => {
    it('renders the stage name', () => {
      render(<StageItem stage={makeStage()} {...defaultProps} />);
      expect(screen.getByText('Technical Screen')).toBeTruthy();
    });

    it('renders the scheduled date when provided', () => {
      render(<StageItem stage={makeStage({ scheduled_date: '2024-06-20' })} {...defaultProps} />);
      expect(screen.getByText(/Jun/i)).toBeTruthy();
    });

    it('shows a checkmark when the stage is completed', () => {
      render(<StageItem stage={makeStage({ is_completed: true })} {...defaultProps} />);
      expect(screen.getByTitle('Mark incomplete')).toBeTruthy();
      expect(screen.getByText('✓')).toBeTruthy();
    });

    it('shows an empty checkbox when the stage is not completed', () => {
      render(<StageItem stage={makeStage({ is_completed: false })} {...defaultProps} />);
      expect(screen.getByTitle('Mark complete')).toBeTruthy();
    });
  });

  describe('completing a stage', () => {
    it('shows the completion dialog when the checkbox is clicked on an incomplete stage', async () => {
      const user = userEvent.setup();
      render(<StageItem stage={makeStage()} {...defaultProps} />);
      await user.click(screen.getByTitle('Mark complete'));
      expect(screen.getByText(/Add a note to the timeline/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Complete without note' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Complete & log' })).toBeTruthy();
    });

    it('cancels the completion dialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<StageItem stage={makeStage()} {...defaultProps} />);
      await user.click(screen.getByTitle('Mark complete'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText(/Add a note to the timeline/i)).toBeNull();
    });

    it('calls PATCH and onUpdated when completing without a note', async () => {
      const user = userEvent.setup();
      const onUpdated = vi.fn();
      const completedStage = makeStage({ is_completed: true });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(completedStage),
      } as unknown as Response);

      render(<StageItem stage={makeStage()} {...defaultProps} onUpdated={onUpdated} />);
      await user.click(screen.getByTitle('Mark complete'));
      await user.click(screen.getByRole('button', { name: 'Complete without note' }));

      await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(completedStage));
    });

    it('unchecks a completed stage immediately via PATCH', async () => {
      const user = userEvent.setup();
      const onUpdated = vi.fn();
      const incompleteStage = makeStage({ is_completed: false });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(incompleteStage),
      } as unknown as Response);

      render(<StageItem stage={makeStage({ is_completed: true })} {...defaultProps} onUpdated={onUpdated} />);
      await user.click(screen.getByTitle('Mark incomplete'));

      await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(incompleteStage));
      expect(fetch).toHaveBeenCalledWith(
        '/api/companies/company-1/roadmap/stage-1',
        expect.objectContaining({ body: JSON.stringify({ is_completed: false }) }),
      );
    });
  });

  describe('editing a stage', () => {
    it('switches to edit mode when the Edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<StageItem stage={makeStage()} {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.getByDisplayValue('Technical Screen')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    });

    it('cancels edit mode without saving', async () => {
      const user = userEvent.setup();
      render(<StageItem stage={makeStage()} {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByText('Technical Screen')).toBeTruthy();
      expect(screen.queryByDisplayValue('Technical Screen')).toBeNull();
    });
  });

  describe('deleting a stage', () => {
    it('calls onDeleted when the delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDeleted = vi.fn();
      global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

      render(<StageItem stage={makeStage()} {...defaultProps} onDeleted={onDeleted} />);
      await user.click(screen.getByTitle('Remove stage'));

      await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('stage-1'));
    });
  });
});
