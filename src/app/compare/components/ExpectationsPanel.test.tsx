import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '@/test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import ExpectationsPanel from './ExpectationsPanel';
import type { OfferExpectations } from '@/types';

function makeExpectations(overrides: Partial<OfferExpectations> = {}): OfferExpectations {
  return {
    base_salary: 120000,
    currency: 'USD',
    signing_bonus: null,
    equity_value: null,
    bonus_pct: null,
    pto_days: 20,
    remote_policy: 'Remote',
    health_tier: null,
    retirement_match_pct: null,
    ...overrides,
  };
}

describe('ExpectationsPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('collapsed state — no expectations', () => {
    it('shows "Set your targets" when no expectations are set', () => {
      render(<ExpectationsPanel expectations={null} onSaved={vi.fn()} />);
      expect(screen.getByText('Set your targets')).toBeTruthy();
    });

    it('is collapsed and does not show form fields by default', () => {
      render(<ExpectationsPanel expectations={null} onSaved={vi.fn()} />);
      expect(screen.queryByText('Base Salary')).toBeNull();
    });

    it('expands to show form fields when the toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpectationsPanel expectations={null} onSaved={vi.fn()} />);
      await user.click(screen.getByText('Set your targets'));
      expect(screen.getByText('Base Salary')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Save targets' })).toBeTruthy();
    });
  });

  describe('collapsed state — with expectations', () => {
    it('shows "Your targets" when expectations exist', () => {
      render(<ExpectationsPanel expectations={makeExpectations()} onSaved={vi.fn()} />);
      expect(screen.getByText('Your targets')).toBeTruthy();
    });

    // Panel opens by default when expectations exist; click to collapse, then summary appears
    it('shows a summary of expectations when collapsed', async () => {
      const user = userEvent.setup();
      render(<ExpectationsPanel expectations={makeExpectations()} onSaved={vi.fn()} />);
      await user.click(screen.getByText('Your targets'));
      const summary = screen.getByText(/PTO/);
      expect(summary.textContent).toMatch(/\$120,000/);
      expect(summary.textContent).toMatch(/20d/);
      expect(summary.textContent).toMatch(/Remote/);
    });
  });

  describe('expanded form', () => {
    // Panel starts open when expectations are provided, so no click needed
    it('pre-fills fields from existing expectations', () => {
      render(<ExpectationsPanel expectations={makeExpectations({ pto_days: 25 })} onSaved={vi.fn()} />);
      const ptoInput = screen.getByDisplayValue('25') as HTMLInputElement;
      expect(ptoInput.value).toBe('25');
    });

    it('collapses without saving when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpectationsPanel expectations={null} onSaved={vi.fn()} />);
      await user.click(screen.getByText('Set your targets'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Base Salary')).toBeNull();
    });

    it('calls onSaved and collapses after a successful save', async () => {
      const user = userEvent.setup();
      const onSaved = vi.fn();
      const savedExpectations = makeExpectations();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(savedExpectations),
      } as unknown as Response);

      render(<ExpectationsPanel expectations={null} onSaved={onSaved} />);
      await user.click(screen.getByText('Set your targets'));
      await user.click(screen.getByRole('button', { name: 'Save targets' }));

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedExpectations));
      expect(screen.queryByText('Base Salary')).toBeNull();
    });

    it('sends a PUT request to the expectations endpoint', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeExpectations()),
      } as unknown as Response);

      render(<ExpectationsPanel expectations={null} onSaved={vi.fn()} />);
      await user.click(screen.getByText('Set your targets'));
      await user.click(screen.getByRole('button', { name: 'Save targets' }));

      await waitFor(() => expect(fetch).toHaveBeenCalledWith(
        '/api/expectations',
        expect.objectContaining({ method: 'PUT' }),
      ));
    });
  });
});
