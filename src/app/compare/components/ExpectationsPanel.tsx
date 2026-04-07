'use client';

import { useState } from 'react';
import type { OfferExpectations, RemotePolicy, HealthTier } from '@/types';
import { REMOTE_POLICIES, HEALTH_TIERS } from '@/types';
import { fmtCommas } from '@/lib/formatInput';
import { fmt } from '../helpers';
import { useToast } from '@/components/Toast/ToastProvider';
import { useTranslations } from 'next-intl';
import styles from '../compare.module.css';

export default function ExpectationsPanel({
  expectations,
  onSaved,
}: {
  expectations: OfferExpectations | null;
  onSaved: (updated: OfferExpectations) => void;
}) {
  const { toast } = useToast();
  const t = useTranslations('compare');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(!!expectations);
  const [saving, setSaving] = useState(false);

  const [baseSalary, setBaseSalary] = useState(expectations?.base_salary?.toString() ?? '');
  const [currency, setCurrency] = useState(expectations?.currency ?? 'USD');
  const [signingBonus, setSigningBonus] = useState(expectations?.signing_bonus?.toString() ?? '');
  const [bonusPct, setBonusPct] = useState(expectations?.bonus_pct?.toString() ?? '');
  const [equityValue, setEquityValue] = useState(expectations?.equity_value?.toString() ?? '');
  const [ptoDays, setPtoDays] = useState(expectations?.pto_days?.toString() ?? '');
  const [remotePolicy, setRemotePolicy] = useState<RemotePolicy | ''>(expectations?.remote_policy ?? '');
  const [healthTier, setHealthTier] = useState<HealthTier | ''>(expectations?.health_tier ?? '');
  const [retirementMatch, setRetirementMatch] = useState(expectations?.retirement_match_pct?.toString() ?? '');

  async function handleSave() {
    setSaving(true);
    const payload: Partial<OfferExpectations> = {
      currency: currency || 'USD',
      base_salary: baseSalary ? Number(baseSalary) : null,
      signing_bonus: signingBonus ? Number(signingBonus) : null,
      bonus_pct: bonusPct ? Number(bonusPct) : null,
      equity_value: equityValue ? Number(equityValue) : null,
      pto_days: ptoDays ? Number(ptoDays) : null,
      remote_policy: (remotePolicy as RemotePolicy) || null,
      health_tier: (healthTier as HealthTier) || null,
      retirement_match_pct: retirementMatch ? Number(retirementMatch) : null,
    };
    try {
      const res = await fetch('/api/expectations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let json: { error?: string } = {};
        try { json = await res.json(); } catch { /* ignore */ }
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const saved = await res.json() as OfferExpectations;
      onSaved(saved);
      setOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save targets');
    } finally {
      setSaving(false);
    }
  }

  const hasSomeExpectation = expectations && Object.values(expectations).some(
    (statusValue) => statusValue !== null && statusValue !== undefined && statusValue !== 'USD'
  );

  return (
    <div className={styles.expPanel}>
      <button
        className={styles.expToggle}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.expToggleLabel}>
          {hasSomeExpectation ? t('yourTargets') : t('setTargets')}
        </span>
        {hasSomeExpectation && !open && (
          <span className={styles.expSummary}>
            {expectations.base_salary != null && `Base ≥ ${fmt(expectations.base_salary, expectations.currency, 'currency')}`}
            {expectations.pto_days != null && ` · PTO ≥ ${expectations.pto_days}d`}
            {expectations.remote_policy && ` · ${expectations.remote_policy}`}
            {expectations.health_tier && ` · ${expectations.health_tier} health`}
          </span>
        )}
        {!hasSomeExpectation && !open && (
          <span className={styles.expSummaryEmpty}>
            {t('targetDescription')}
          </span>
        )}
        <span className={styles.expChevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.expForm}>
          <div className={styles.expGrid}>
            <div className={styles.expField}>
              <label className={styles.expLabel}>{t('baseSalary')}</label>
              <div className={styles.expInputGroup}>
                <select className={styles.expCurrencySelect} value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={saving}>
                  {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((cur) => <option key={cur} value={cur}>{cur}</option>)}
                </select>
                <input className={styles.expInput} type="text" inputMode="numeric" placeholder="180,000" value={fmtCommas(baseSalary)} onChange={(event) => setBaseSalary(event.target.value.replace(/[^0-9]/g, ''))} disabled={saving} />
              </div>
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>{t('signingBonus')}</label>
              <input className={styles.expInput} type="text" inputMode="numeric" placeholder="15,000" value={fmtCommas(signingBonus)} onChange={(event) => setSigningBonus(event.target.value.replace(/[^0-9]/g, ''))} disabled={saving} />
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>{t('performanceBonusPct')}</label>
              <input className={styles.expInput} type="number" min={0} placeholder="10" value={bonusPct} onChange={(event) => setBonusPct(event.target.value)} disabled={saving} />
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>{t('equityValue')}</label>
              <input className={styles.expInput} type="text" inputMode="numeric" placeholder="300,000" value={fmtCommas(equityValue)} onChange={(event) => setEquityValue(event.target.value.replace(/[^0-9]/g, ''))} disabled={saving} />
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>{t('ptoDays')}</label>
              <input className={styles.expInput} type="number" min={0} placeholder="20" value={ptoDays} onChange={(event) => setPtoDays(event.target.value)} disabled={saving} />
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>{t('retirement401k')}</label>
              <input className={styles.expInput} type="number" min={0} placeholder="4" value={retirementMatch} onChange={(event) => setRetirementMatch(event.target.value)} disabled={saving} />
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>{t('remotePolicy')}</label>
              <select className={styles.expInput} value={remotePolicy} onChange={(event) => setRemotePolicy(event.target.value as RemotePolicy | '')} disabled={saving}>
                <option value="">{t('anyOption')}</option>
                {REMOTE_POLICIES.map((policy) => <option key={policy} value={policy}>{policy}</option>)}
              </select>
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>{t('healthInsurance')}</label>
              <select className={styles.expInput} value={healthTier} onChange={(event) => setHealthTier(event.target.value as HealthTier | '')} disabled={saving}>
                <option value="">{t('anyOption')}</option>
                {HEALTH_TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.expActions}>
            <button className={styles.expCancel} onClick={() => setOpen(false)} disabled={saving}>{tCommon('cancel')}</button>
            <button className={styles.expSave} onClick={handleSave} disabled={saving}>
              {saving ? tCommon('saving') : t('saveTargets')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
