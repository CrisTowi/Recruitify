import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CompanyCard from './CompanyCard';
import type { CompanyWithNextStep } from '@/types';

function makeCompany(overrides: Partial<CompanyWithNextStep> = {}): CompanyWithNextStep {
  return {
    id: 'company-1',
    name: 'Acme Corp',
    logo_url: null,
    status: 'Applied',
    interest_level: null,
    prep_notes: null,
    created_at: '2024-01-01T00:00:00Z',
    next_step: null,
    ...overrides,
  };
}

describe('CompanyCard', () => {
  it('renders the company name', () => {
    render(<CompanyCard company={makeCompany()} />);
    expect(screen.getByText('Acme Corp')).toBeTruthy();
  });

  it('renders the status badge', () => {
    render(<CompanyCard company={makeCompany({ status: 'Interviewing' })} />);
    expect(screen.getByText('Interviewing')).toBeTruthy();
  });

  it('renders a logo image when logo_url is provided', () => {
    render(<CompanyCard company={makeCompany({ logo_url: 'https://example.com/logo.png' })} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
    expect(img).toHaveAttribute('alt', 'Acme Corp logo');
  });

  it('renders the first letter as fallback when logo_url is null', () => {
    render(<CompanyCard company={makeCompany({ name: 'Stripe', logo_url: null })} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('S')).toBeTruthy();
  });

  it('renders the interest emoji when interest_level is set', () => {
    render(<CompanyCard company={makeCompany({ interest_level: 'Excited' })} />);
    expect(screen.getByTitle('Excited')).toBeTruthy();
    expect(screen.getByText('🔥')).toBeTruthy();
  });

  it('does not render the interest badge when interest_level is null', () => {
    render(<CompanyCard company={makeCompany({ interest_level: null })} />);
    expect(screen.queryByText('🔥')).toBeNull();
  });

  it('renders next step name when next_step is provided', () => {
    render(<CompanyCard company={makeCompany({ next_step: { stage_name: 'Technical Screen', scheduled_date: null } })} />);
    expect(screen.getByText('Technical Screen')).toBeTruthy();
    expect(screen.getByText('Next')).toBeTruthy();
  });

  it('renders the scheduled date when next_step has a date', () => {
    render(<CompanyCard company={makeCompany({ next_step: { stage_name: 'Onsite', scheduled_date: '2024-06-20' } })} />);
    expect(screen.getByText(/Jun/i)).toBeTruthy();
  });

  it('does not render next step section when next_step is null', () => {
    render(<CompanyCard company={makeCompany({ next_step: null })} />);
    expect(screen.queryByText('Next')).toBeNull();
  });
});
