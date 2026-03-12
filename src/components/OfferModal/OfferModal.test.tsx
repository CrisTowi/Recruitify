import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '@/test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import OfferModal from './OfferModal';
import type { CompanyWithNextStep, CompanyOffer } from '@/types';

function makeCompany(overrides: Partial<CompanyWithNextStep> = {}): CompanyWithNextStep {
  return {
    id: 'company-1',
    name: 'Stripe',
    logo_url: null,
    status: 'Offer',
    interest_level: null,
    prep_notes: null,
    created_at: '2024-01-01T00:00:00Z',
    next_step: null,
    ...overrides,
  };
}

const mockOffer: CompanyOffer = {
  id: 'offer-1',
  company_id: 'company-1',
  base_salary: 150000,
  currency: 'USD',
  signing_bonus: null,
  equity_value: null,
  equity_vesting: null,
  bonus_pct: null,
  pto_days: null,
  remote_policy: null,
  health_tier: null,
  retirement_match_pct: null,
  other_benefits: null,
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('OfferModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the company name', () => {
    render(<OfferModal company={makeCompany()} onSaved={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText('Stripe')).toBeTruthy();
  });

  it('renders the dialog with all key fields', () => {
    render(<OfferModal company={makeCompany()} onSaved={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Base Salary (annual)')).toBeTruthy();
    expect(screen.getByText('Signing Bonus')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save offer details' })).toBeTruthy();
  });

  it('calls onSkip when the Skip button is clicked', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<OfferModal company={makeCompany()} onSaved={vi.fn()} onSkip={onSkip} />);
    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('calls onSkip when clicking the backdrop', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    const { container } = render(<OfferModal company={makeCompany()} onSaved={vi.fn()} onSkip={onSkip} />);
    await user.click(container.firstChild as HTMLElement);
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('calls onSaved with the offer after a successful submission', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOffer),
    } as unknown as Response);

    render(<OfferModal company={makeCompany()} onSaved={onSaved} onSkip={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Save offer details' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(mockOffer));
  });

  it('sends a PUT request to the correct endpoint', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOffer),
    } as unknown as Response);

    render(<OfferModal company={makeCompany({ id: 'company-42' })} onSaved={vi.fn()} onSkip={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Save offer details' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/companies/company-42/offer',
      expect.objectContaining({ method: 'PUT' }),
    ));
  });

  it('shows an error when the API call fails', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    } as unknown as Response);

    render(<OfferModal company={makeCompany()} onSaved={vi.fn()} onSkip={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Save offer details' }));

    await waitFor(() => expect(screen.getAllByText('Server error').length).toBeGreaterThan(0));
  });

  it('formats the base salary input with commas as the user types', async () => {
    const user = userEvent.setup();
    render(<OfferModal company={makeCompany()} onSaved={vi.fn()} onSkip={vi.fn()} />);
    const salaryInput = screen.getByPlaceholderText('150,000');
    await user.type(salaryInput, '150000');
    expect((salaryInput as HTMLInputElement).value).toBe('150,000');
  });
});
