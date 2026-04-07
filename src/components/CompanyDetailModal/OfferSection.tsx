'use client';

import { useState } from 'react';
import type { CompanyOffer, RemotePolicy, HealthTier } from '@/types';
import { REMOTE_POLICIES, HEALTH_TIERS } from '@/types';
import { fmtCommas } from '@/lib/formatInput';
import { fmt } from './helpers';
import { useToast } from '@/components/Toast/ToastProvider';
import { useTranslations } from 'next-intl';
import styles from './CompanyDetailModal.module.css';

interface OfferSectionProps {
  companyId: string;
  offer: CompanyOffer | null;
  onUpdated: (offer: CompanyOffer) => void;
}

export default function OfferSection({ companyId, offer, onUpdated }: OfferSectionProps) {
  const { toast } = useToast();
  const t = useTranslations('companyDetail');
  const tCommon = useTranslations('common');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [baseSalary, setBaseSalary] = useState(offer?.base_salary?.toString() ?? '');
  const [currency, setCurrency] = useState(offer?.currency ?? 'USD');
  const [signingBonus, setSigningBonus] = useState(offer?.signing_bonus?.toString() ?? '');
  const [bonusPct, setBonusPct] = useState(offer?.bonus_pct?.toString() ?? '');
  const [equityValue, setEquityValue] = useState(offer?.equity_value?.toString() ?? '');
  const [equityVesting, setEquityVesting] = useState(offer?.equity_vesting ?? '');
  const [ptoDays, setPtoDays] = useState(offer?.pto_days?.toString() ?? '');
  const [remotePolicy, setRemotePolicy] = useState<RemotePolicy | ''>(offer?.remote_policy ?? '');
  const [healthTier, setHealthTier] = useState<HealthTier | ''>(offer?.health_tier ?? '');
  const [retirementMatch, setRetirementMatch] = useState(offer?.retirement_match_pct?.toString() ?? '');
  const [foodVouchers, setFoodVouchers] = useState(offer?.food_vouchers?.toString() ?? '');
  const [christmasBonusDays, setChristmasBonusDays] = useState(offer?.christmas_bonus_days?.toString() ?? '');
  const [savingsFundPct, setSavingsFundPct] = useState(offer?.savings_fund_pct?.toString() ?? '');
  const [vacationPremiumPct, setVacationPremiumPct] = useState(offer?.vacation_premium_pct?.toString() ?? '');
  const [otherBenefits, setOtherBenefits] = useState(offer?.other_benefits ?? '');
  const [offerNotes, setOfferNotes] = useState(offer?.notes ?? '');

  function startEdit() {
    setBaseSalary(offer?.base_salary?.toString() ?? '');
    setCurrency(offer?.currency ?? 'USD');
    setSigningBonus(offer?.signing_bonus?.toString() ?? '');
    setBonusPct(offer?.bonus_pct?.toString() ?? '');
    setEquityValue(offer?.equity_value?.toString() ?? '');
    setEquityVesting(offer?.equity_vesting ?? '');
    setPtoDays(offer?.pto_days?.toString() ?? '');
    setRemotePolicy(offer?.remote_policy ?? '');
    setHealthTier(offer?.health_tier ?? '');
    setRetirementMatch(offer?.retirement_match_pct?.toString() ?? '');
    setFoodVouchers(offer?.food_vouchers?.toString() ?? '');
    setChristmasBonusDays(offer?.christmas_bonus_days?.toString() ?? '');
    setSavingsFundPct(offer?.savings_fund_pct?.toString() ?? '');
    setVacationPremiumPct(offer?.vacation_premium_pct?.toString() ?? '');
    setOtherBenefits(offer?.other_benefits ?? '');
    setOfferNotes(offer?.notes ?? '');
    setErr(null);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setErr(null);
    const payload = {
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
      food_vouchers: foodVouchers ? Number(foodVouchers) : null,
      christmas_bonus_days: christmasBonusDays ? Number(christmasBonusDays) : null,
      savings_fund_pct: savingsFundPct ? Number(savingsFundPct) : null,
      vacation_premium_pct: vacationPremiumPct ? Number(vacationPremiumPct) : null,
      other_benefits: otherBenefits.trim() || null,
      notes: offerNotes.trim() || null,
    };
    try {
      const res = await fetch(`/api/companies/${companyId}/offer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json() as CompanyOffer;
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setErr(message);
      toast(message);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className={styles.offerSection}>
        <div className={styles.offerHeader}>
          <span className={styles.offerTitle}>{t('offerDetails')}</span>
          <button className={styles.prepEditButton} onClick={startEdit}>
            {offer ? tCommon('edit') : t('addOfferDetails')}
          </button>
        </div>
        {offer ? (
          <dl className={styles.offerGrid}>
            <div className={styles.offerRow}>
              <dt>{t('baseSalary')}</dt>
              <dd>{fmt(offer.base_salary, offer.currency, 'currency')}</dd>
            </div>
            <div className={styles.offerRow}>
              <dt>{t('signingBonus')}</dt>
              <dd>{fmt(offer.signing_bonus, offer.currency, 'currency')}</dd>
            </div>
            <div className={styles.offerRow}>
              <dt>{t('performanceBonus')}</dt>
              <dd>{fmt(offer.bonus_pct, offer.currency, 'pct')}</dd>
            </div>
            <div className={styles.offerRow}>
              <dt>{t('equity')}</dt>
              <dd>
                {fmt(offer.equity_value, offer.currency, 'currency')}
                {offer.equity_vesting && <span className={styles.offerSub}>{offer.equity_vesting}</span>}
              </dd>
            </div>
            <div className={styles.offerRow}>
              <dt>{t('ptoDays')}</dt>
              <dd>{fmt(offer.pto_days, offer.currency, 'days')}</dd>
            </div>
            <div className={styles.offerRow}>
              <dt>{t('remotePolicy')}</dt>
              <dd>{offer.remote_policy ?? '—'}</dd>
            </div>
            <div className={styles.offerRow}>
              <dt>{t('healthInsurance')}</dt>
              <dd>{offer.health_tier ?? '—'}</dd>
            </div>
            <div className={styles.offerRow}>
              <dt>{t('retirement401k')}</dt>
              <dd>{fmt(offer.retirement_match_pct, offer.currency, 'pct')}</dd>
            </div>
            {offer.food_vouchers != null && (
              <div className={styles.offerRow}>
                <dt>{t('foodVouchers')}</dt>
                <dd>{fmt(offer.food_vouchers, offer.currency, 'currency')}</dd>
              </div>
            )}
            {offer.christmas_bonus_days != null && (
              <div className={styles.offerRow}>
                <dt>{t('christmasBonusDays')}</dt>
                <dd>{fmt(offer.christmas_bonus_days, offer.currency, 'days')}</dd>
              </div>
            )}
            {offer.savings_fund_pct != null && (
              <div className={styles.offerRow}>
                <dt>{t('savingsFundPct')}</dt>
                <dd>{fmt(offer.savings_fund_pct, offer.currency, 'pct')}</dd>
              </div>
            )}
            {offer.vacation_premium_pct != null && (
              <div className={styles.offerRow}>
                <dt>{t('vacationPremiumPct')}</dt>
                <dd>{fmt(offer.vacation_premium_pct, offer.currency, 'pct')}</dd>
              </div>
            )}
            {offer.other_benefits && (
              <div className={`${styles.offerRow} ${styles.offerRowFull}`}>
                <dt>{t('otherBenefits')}</dt>
                <dd>{offer.other_benefits}</dd>
              </div>
            )}
            {offer.notes && (
              <div className={`${styles.offerRow} ${styles.offerRowFull}`}>
                <dt>{t('notes')}</dt>
                <dd>{offer.notes}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className={styles.timelineEmpty}>{t('noOffer')}</p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.offerSection}>
      <div className={styles.offerHeader}>
        <span className={styles.offerTitle}>{t('offerDetails')}</span>
      </div>
      <div className={styles.offerEditGrid}>
        <div className={styles.offerEditRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('baseSalary')}</label>
            <div className={styles.offerInputGroup}>
              <select className={styles.offerCurrencySelect} value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={saving}>
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MXN'].map((cur) => <option key={cur} value={cur}>{cur}</option>)}
              </select>
              <input className={styles.input} type="text" inputMode="numeric" placeholder="150,000" value={fmtCommas(baseSalary)} onChange={(event) => setBaseSalary(event.target.value.replace(/[^0-9]/g, ''))} disabled={saving} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('signingBonus')}</label>
            <input className={styles.input} type="text" inputMode="numeric" placeholder="10,000" value={fmtCommas(signingBonus)} onChange={(event) => setSigningBonus(event.target.value.replace(/[^0-9]/g, ''))} disabled={saving} />
          </div>
        </div>
        <div className={styles.offerEditRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('performanceBonusPct')}</label>
            <input className={styles.input} type="number" min={0} placeholder="15" value={bonusPct} onChange={(event) => setBonusPct(event.target.value)} disabled={saving} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('retirement401kPct')}</label>
            <input className={styles.input} type="number" min={0} placeholder="4" value={retirementMatch} onChange={(event) => setRetirementMatch(event.target.value)} disabled={saving} />
          </div>
        </div>
        <div className={styles.offerEditRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('equityValue')}</label>
            <input className={styles.input} type="text" inputMode="numeric" placeholder="200,000" value={fmtCommas(equityValue)} onChange={(event) => setEquityValue(event.target.value.replace(/[^0-9]/g, ''))} disabled={saving} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('vestingSchedule')}</label>
            <input className={styles.input} type="text" placeholder={t('vestingPlaceholder')} value={equityVesting} onChange={(event) => setEquityVesting(event.target.value)} disabled={saving} />
          </div>
        </div>
        <div className={styles.offerEditRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('ptoDays')}</label>
            <input className={styles.input} type="number" min={0} placeholder="20" value={ptoDays} onChange={(event) => setPtoDays(event.target.value)} disabled={saving} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('remotePolicy')}</label>
            <select className={styles.input} value={remotePolicy} onChange={(event) => setRemotePolicy(event.target.value as RemotePolicy | '')} disabled={saving}>
              <option value="">{t('selectPlaceholder')}</option>
              {REMOTE_POLICIES.map((policy) => <option key={policy} value={policy}>{policy}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.offerEditRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('healthInsurance')}</label>
            <select className={styles.input} value={healthTier} onChange={(event) => setHealthTier(event.target.value as HealthTier | '')} disabled={saving}>
              <option value="">{t('selectPlaceholder')}</option>
              {HEALTH_TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.offerEditRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('foodVouchers')}</label>
            <input className={styles.input} type="text" inputMode="numeric" placeholder="2,000" value={fmtCommas(foodVouchers)} onChange={(event) => setFoodVouchers(event.target.value.replace(/[^0-9]/g, ''))} disabled={saving} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('christmasBonusDays')}</label>
            <input className={styles.input} type="number" min={0} placeholder="30" value={christmasBonusDays} onChange={(event) => setChristmasBonusDays(event.target.value)} disabled={saving} />
          </div>
        </div>
        <div className={styles.offerEditRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('savingsFundPct')}</label>
            <input className={styles.input} type="number" min={0} placeholder="13" value={savingsFundPct} onChange={(event) => setSavingsFundPct(event.target.value)} disabled={saving} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('vacationPremiumPct')}</label>
            <input className={styles.input} type="number" min={0} placeholder="25" value={vacationPremiumPct} onChange={(event) => setVacationPremiumPct(event.target.value)} disabled={saving} />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('otherBenefits')}</label>
          <textarea className={styles.prepTextarea} rows={2} placeholder={t('otherBenefitsPlaceholder')} value={otherBenefits} onChange={(event) => setOtherBenefits(event.target.value)} disabled={saving} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('notes')}</label>
          <textarea className={styles.prepTextarea} rows={2} placeholder={t('notesPlaceholder')} value={offerNotes} onChange={(event) => setOfferNotes(event.target.value)} disabled={saving} />
        </div>
      </div>
      {err && <p className={styles.formError}>{err}</p>}
      <div className={styles.prepActions}>
        <button className={styles.cancelButton} onClick={() => setEditing(false)} disabled={saving}>{tCommon('cancel')}</button>
        <button className={styles.submitButton} onClick={handleSave} disabled={saving}>
          {saving ? tCommon('saving') : tCommon('save')}
        </button>
      </div>
    </div>
  );
}
