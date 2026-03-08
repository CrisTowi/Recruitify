'use client';

import { useState } from 'react';
import type { CompanyWithNextStep, CompanyOffer, RemotePolicy, HealthTier } from '@/types';
import { REMOTE_POLICIES, HEALTH_TIERS } from '@/types';
import { fmtCommas } from '@/lib/formatInput';
import styles from './OfferModal.module.css';

interface Props {
  company: CompanyWithNextStep;
  onSaved: (offer: CompanyOffer) => void;
  onSkip: () => void;
}

export default function OfferModal({ company, onSaved, onSkip }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [baseSalary, setBaseSalary] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [signingBonus, setSigningBonus] = useState('');
  const [bonusPct, setBonusPct] = useState('');
  const [equityValue, setEquityValue] = useState('');
  const [equityVesting, setEquityVesting] = useState('');
  const [ptoDays, setPtoDays] = useState('');
  const [remotePolicy, setRemotePolicy] = useState<RemotePolicy | ''>('');
  const [healthTier, setHealthTier] = useState<HealthTier | ''>('');
  const [retirementMatch, setRetirementMatch] = useState('');
  const [otherBenefits, setOtherBenefits] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      currency: currency || 'USD',
      base_salary: baseSalary ? Number(baseSalary) : null,
      signing_bonus: signingBonus ? Number(signingBonus) : null,
      bonus_pct: bonusPct ? Number(bonusPct) : null,
      equity_value: equityValue ? Number(equityValue) : null,
      equity_vesting: equityVesting.trim() || null,
      pto_days: ptoDays ? Number(ptoDays) : null,
      remote_policy: remotePolicy || null,
      health_tier: healthTier || null,
      retirement_match_pct: retirementMatch ? Number(retirementMatch) : null,
      other_benefits: otherBenefits.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      const res = await fetch(`/api/companies/${company.id}/offer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const offer = await res.json() as CompanyOffer;
      onSaved(offer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.badge}>Offer</span>
            <h2 className={styles.company}>{company.name}</h2>
          </div>
          <p className={styles.subtitle}>Log the offer details to compare later. All fields are optional.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Base Salary (annual)</label>
              <div className={styles.inputGroup}>
                <select
                  className={styles.currencySelect}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={submitting}
                >
                  {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  placeholder="150,000"
                  value={fmtCommas(baseSalary)}
                  onChange={(e) => setBaseSalary(e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Signing Bonus</label>
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                placeholder="10,000"
                value={fmtCommas(signingBonus)}
                onChange={(e) => setSigningBonus(e.target.value.replace(/[^0-9]/g, ''))}
                disabled={submitting}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Performance Bonus %</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                max={100}
                placeholder="15"
                value={bonusPct}
                onChange={(e) => setBonusPct(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>401k / Retirement Match %</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                max={100}
                placeholder="4"
                value={retirementMatch}
                onChange={(e) => setRetirementMatch(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Equity / RSU Total Value</label>
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                placeholder="200,000"
                value={fmtCommas(equityValue)}
                onChange={(e) => setEquityValue(e.target.value.replace(/[^0-9]/g, ''))}
                disabled={submitting}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Vesting Schedule</label>
              <input
                className={styles.input}
                type="text"
                placeholder="4yr, 1yr cliff"
                value={equityVesting}
                onChange={(e) => setEquityVesting(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>PTO Days</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                placeholder="20"
                value={ptoDays}
                onChange={(e) => setPtoDays(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Remote Policy</label>
              <select
                className={styles.input}
                value={remotePolicy}
                onChange={(e) => setRemotePolicy(e.target.value as RemotePolicy | '')}
                disabled={submitting}
              >
                <option value="">— Select —</option>
                {REMOTE_POLICIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Health Insurance</label>
              <select
                className={styles.input}
                value={healthTier}
                onChange={(e) => setHealthTier(e.target.value as HealthTier | '')}
                disabled={submitting}
              >
                <option value="">— Select —</option>
                {HEALTH_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Other Benefits</label>
            <textarea
              className={styles.textarea}
              placeholder="Home office stipend, gym membership, meal allowance…"
              rows={2}
              value={otherBenefits}
              onChange={(e) => setOtherBenefits(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Notes</label>
            <textarea
              className={styles.textarea}
              placeholder="Deadline to decide, negotiation notes…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.skipButton}
              onClick={onSkip}
              disabled={submitting}
            >
              Skip for now
            </button>
            <button type="submit" className={styles.saveButton} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save offer details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
