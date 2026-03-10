import { describe, it, expect } from 'vitest';
import { fmt, fmtExpectation, meetsExpectation, best } from './helpers';
import type { CompanyOffer, OfferExpectations, CompanyWithNextStep } from '@/types';
import type { CompareEntry } from './helpers';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeOffer(overrides: Partial<CompanyOffer> = {}): CompanyOffer {
  return {
    id: 'offer-1',
    company_id: 'company-1',
    base_salary: 120000,
    currency: 'USD',
    signing_bonus: null,
    equity_value: null,
    equity_vesting: null,
    bonus_pct: 10,
    pto_days: 20,
    remote_policy: 'Remote',
    health_tier: 'Premium',
    retirement_match_pct: 4,
    other_benefits: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeExpectations(overrides: Partial<OfferExpectations> = {}): OfferExpectations {
  return {
    base_salary: 100000,
    currency: 'USD',
    signing_bonus: null,
    equity_value: null,
    bonus_pct: null,
    pto_days: 15,
    remote_policy: 'Hybrid',
    health_tier: 'Basic',
    retirement_match_pct: null,
    ...overrides,
  };
}

function makeCompany(id: string): CompanyWithNextStep {
  return {
    id,
    name: `Company ${id}`,
    logo_url: null,
    status: 'Offer',
    interest_level: null,
    prep_notes: null,
    created_at: '2024-01-01T00:00:00Z',
    next_step: null,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('compare helpers', () => {
  describe('fmt', () => {
    it('returns em-dash for null', () => {
      expect(fmt(null, 'USD', 'currency')).toBe('—');
    });

    it('returns em-dash for undefined', () => {
      expect(fmt(undefined, 'USD', 'currency')).toBe('—');
    });

    it('formats USD currency', () => {
      expect(fmt(150000, 'USD', 'currency')).toBe('$150,000');
    });

    it('formats percentage', () => {
      expect(fmt(20, 'USD', 'pct')).toBe('20%');
    });

    it('formats days', () => {
      expect(fmt(25, 'USD', 'days')).toBe('25 days');
    });
  });

  describe('fmtExpectation', () => {
    it('returns empty string when field value is null', () => {
      const exp = makeExpectations({ base_salary: null });
      expect(fmtExpectation(exp, 'base_salary')).toBe('');
    });

    it('formats base_salary as currency with ≥ prefix', () => {
      const exp = makeExpectations({ base_salary: 100000 });
      expect(fmtExpectation(exp, 'base_salary')).toBe('≥ $100,000');
    });

    it('formats bonus_pct as percentage with ≥ prefix', () => {
      const exp = makeExpectations({ bonus_pct: 10 });
      expect(fmtExpectation(exp, 'bonus_pct')).toBe('≥ 10%');
    });

    it('formats pto_days as days with ≥ prefix', () => {
      const exp = makeExpectations({ pto_days: 15 });
      expect(fmtExpectation(exp, 'pto_days')).toBe('≥ 15 days');
    });

    it('formats remote_policy with "or better" suffix', () => {
      const exp = makeExpectations({ remote_policy: 'Hybrid' });
      expect(fmtExpectation(exp, 'remote_policy')).toBe('Hybrid or better');
    });

    it('formats health_tier with "or better" suffix', () => {
      const exp = makeExpectations({ health_tier: 'Basic' });
      expect(fmtExpectation(exp, 'health_tier')).toBe('Basic or better');
    });
  });

  describe('meetsExpectation', () => {
    it('returns false when offer is null', () => {
      expect(meetsExpectation(null, makeExpectations(), 'base_salary')).toBe(false);
    });

    it('returns false when expectations are null', () => {
      expect(meetsExpectation(makeOffer(), null, 'base_salary')).toBe(false);
    });

    it('returns false when the expected field value is null', () => {
      expect(meetsExpectation(makeOffer(), makeExpectations({ signing_bonus: null }), 'signing_bonus')).toBe(false);
    });

    it('returns true when offer meets numeric expectation', () => {
      const offer = makeOffer({ base_salary: 120000 });
      const exp = makeExpectations({ base_salary: 100000 });
      expect(meetsExpectation(offer, exp, 'base_salary')).toBe(true);
    });

    it('returns false when offer is below numeric expectation', () => {
      const offer = makeOffer({ base_salary: 80000 });
      const exp = makeExpectations({ base_salary: 100000 });
      expect(meetsExpectation(offer, exp, 'base_salary')).toBe(false);
    });

    it('returns true when remote_policy meets or exceeds expectation (Remote >= Hybrid)', () => {
      const offer = makeOffer({ remote_policy: 'Remote' });
      const exp = makeExpectations({ remote_policy: 'Hybrid' });
      expect(meetsExpectation(offer, exp, 'remote_policy')).toBe(true);
    });

    it('returns false when remote_policy is below expectation (On-site < Hybrid)', () => {
      const offer = makeOffer({ remote_policy: 'On-site' });
      const exp = makeExpectations({ remote_policy: 'Hybrid' });
      expect(meetsExpectation(offer, exp, 'remote_policy')).toBe(false);
    });

    it('returns true when health_tier meets expectation (Premium >= Basic)', () => {
      const offer = makeOffer({ health_tier: 'Premium' });
      const exp = makeExpectations({ health_tier: 'Basic' });
      expect(meetsExpectation(offer, exp, 'health_tier')).toBe(true);
    });

    it('returns false when health_tier is below expectation (None < Basic)', () => {
      const offer = makeOffer({ health_tier: 'None' });
      const exp = makeExpectations({ health_tier: 'Basic' });
      expect(meetsExpectation(offer, exp, 'health_tier')).toBe(false);
    });
  });

  describe('best', () => {
    it('returns an empty set when all entries have no offer', () => {
      const entries: CompareEntry[] = [
        { company: makeCompany('a'), offer: null },
        { company: makeCompany('b'), offer: null },
      ];
      expect(best(entries, (offer) => offer.base_salary)).toEqual(new Set());
    });

    it('returns the company with the highest value', () => {
      const entries: CompareEntry[] = [
        { company: makeCompany('a'), offer: makeOffer({ company_id: 'a', base_salary: 100000 }) },
        { company: makeCompany('b'), offer: makeOffer({ company_id: 'b', base_salary: 150000 }) },
      ];
      expect(best(entries, (offer) => offer.base_salary)).toEqual(new Set(['b']));
    });

    it('returns all tied companies when values are equal', () => {
      const entries: CompareEntry[] = [
        { company: makeCompany('a'), offer: makeOffer({ company_id: 'a', base_salary: 120000 }) },
        { company: makeCompany('b'), offer: makeOffer({ company_id: 'b', base_salary: 120000 }) },
      ];
      expect(best(entries, (offer) => offer.base_salary)).toEqual(new Set(['a', 'b']));
    });

    it('ignores entries with null getter values', () => {
      const entries: CompareEntry[] = [
        { company: makeCompany('a'), offer: makeOffer({ company_id: 'a', signing_bonus: null }) },
        { company: makeCompany('b'), offer: makeOffer({ company_id: 'b', signing_bonus: 5000 }) },
      ];
      expect(best(entries, (offer) => offer.signing_bonus)).toEqual(new Set(['b']));
    });
  });
});
