import type { ReactNode } from 'react';
import type {
  CompanyWithNextStep,
  CompanyOffer,
  OfferExpectations,
  RemotePolicy,
  HealthTier,
} from '@/types';
import { REMOTE_RANK, HEALTH_RANK } from '@/types';

export interface CompareEntry {
  company: CompanyWithNextStep;
  offer: CompanyOffer | null;
}

export interface RowDef {
  label: string;
  render: (offer: CompanyOffer | null) => ReactNode;
  renderSub?: (offer: CompanyOffer | null) => ReactNode;
  bestGetter?: (offer: CompanyOffer) => number | null | undefined;
  expField?: keyof OfferExpectations;
}

export function fmt(n: number | null | undefined, currency: string, type: 'currency' | 'pct' | 'days'): string {
  if (n === null || n === undefined) return '—';
  if (type === 'currency') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  }
  if (type === 'pct') return `${n}%`;
  return `${n} days`;
}

export function fmtExpectation(exp: OfferExpectations, field: keyof OfferExpectations): string {
  const value = exp[field];
  if (value === null || value === undefined) return '';
  if (field === 'base_salary' || field === 'signing_bonus' || field === 'equity_value') {
    return `≥ ${fmt(value as number, exp.currency, 'currency')}`;
  }
  if (field === 'bonus_pct' || field === 'retirement_match_pct') {
    return `≥ ${value}%`;
  }
  if (field === 'pto_days') return `≥ ${value} days`;
  if (field === 'remote_policy') return `${value} or better`;
  if (field === 'health_tier') return `${value} or better`;
  return String(value);
}

export function meetsExpectation(
  offer: CompanyOffer | null,
  exp: OfferExpectations | null,
  field: keyof OfferExpectations,
): boolean {
  if (!offer || !exp) return false;
  const expected = exp[field];
  if (expected === null || expected === undefined) return false;

  if (field === 'remote_policy') {
    const offerVal = offer.remote_policy;
    if (!offerVal) return false;
    return REMOTE_RANK[offerVal] >= REMOTE_RANK[expected as RemotePolicy];
  }
  if (field === 'health_tier') {
    const offerVal = offer.health_tier;
    if (!offerVal) return false;
    return HEALTH_RANK[offerVal] >= HEALTH_RANK[expected as HealthTier];
  }

  const offerVal = offer[field as keyof CompanyOffer];
  if (offerVal === null || offerVal === undefined) return false;
  return Number(offerVal) >= Number(expected);
}

export function best(entries: CompareEntry[], getter: (o: CompanyOffer) => number | null | undefined): Set<string> {
  let max = -Infinity;
  for (const { offer } of entries) {
    if (!offer) continue;
    const value = getter(offer);
    if (value !== null && value !== undefined && value > max) max = value;
  }
  const ids = new Set<string>();
  if (max === -Infinity) return ids;
  for (const { company, offer } of entries) {
    if (!offer) continue;
    if (getter(offer) === max) ids.add(company.id);
  }
  return ids;
}
