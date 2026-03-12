import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '@/test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import OfferSection from './OfferSection';
import type { CompanyOffer } from '@/types';

function makeOffer(overrides: Partial<CompanyOffer> = {}): CompanyOffer {
  return {
    id: 'offer-1',
    company_id: 'company-1',
    base_salary: 120000,
    currency: 'USD',
    signing_bonus: 10000,
    equity_value: null,
    equity_vesting: null,
    bonus_pct: 10,
    pto_days: 20,
    remote_policy: 'Remote',
    health_tier: 'Premium',
    retirement_match_pct: 4,
    other_benefits: 'Gym stipend',
    notes: 'Deadline March 31',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('OfferSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('view mode — no offer', () => {
    it('shows the empty state message', () => {
      render(<OfferSection companyId="company-1" offer={null} onUpdated={vi.fn()} />);
      expect(screen.getByText(/No offer details yet/i)).toBeTruthy();
    });

    it('shows an "Add offer details" button', () => {
      render(<OfferSection companyId="company-1" offer={null} onUpdated={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Add offer details' })).toBeTruthy();
    });
  });

  describe('view mode — with offer', () => {
    it('displays formatted base salary', () => {
      render(<OfferSection companyId="company-1" offer={makeOffer()} onUpdated={vi.fn()} />);
      expect(screen.getByText('$120,000')).toBeTruthy();
    });

    it('displays remote policy', () => {
      render(<OfferSection companyId="company-1" offer={makeOffer()} onUpdated={vi.fn()} />);
      expect(screen.getByText('Remote')).toBeTruthy();
    });

    it('displays other benefits when present', () => {
      render(<OfferSection companyId="company-1" offer={makeOffer()} onUpdated={vi.fn()} />);
      expect(screen.getByText('Gym stipend')).toBeTruthy();
    });

    it('displays notes when present', () => {
      render(<OfferSection companyId="company-1" offer={makeOffer()} onUpdated={vi.fn()} />);
      expect(screen.getByText('Deadline March 31')).toBeTruthy();
    });

    it('shows an "Edit" button', () => {
      render(<OfferSection companyId="company-1" offer={makeOffer()} onUpdated={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    });
  });

  describe('edit mode', () => {
    it('switches to edit mode when the Edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<OfferSection companyId="company-1" offer={makeOffer()} onUpdated={vi.fn()} />);
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    });

    it('returns to view mode when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<OfferSection companyId="company-1" offer={makeOffer()} onUpdated={vi.fn()} />);
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    });

    it('calls onUpdated and exits edit mode after a successful save', async () => {
      const user = userEvent.setup();
      const onUpdated = vi.fn();
      const updatedOffer = makeOffer({ base_salary: 130000 });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedOffer),
      } as unknown as Response);

      render(<OfferSection companyId="company-1" offer={makeOffer()} onUpdated={onUpdated} />);
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updatedOffer));
      expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    });

    it('shows an error when the save API call fails', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as unknown as Response);

      render(<OfferSection companyId="company-1" offer={makeOffer()} onUpdated={vi.fn()} />);
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(screen.getAllByText(/HTTP 500/).length).toBeGreaterThan(0));
    });
  });
});
