'use client';

import { useEffect, useState } from 'react';
import type {
  CompanyWithNextStep,
  CompanyOffer,
  OfferExpectations,
  RemotePolicy,
  HealthTier,
} from '@/types';
import { REMOTE_POLICIES, HEALTH_TIERS, REMOTE_RANK, HEALTH_RANK } from '@/types';
import styles from './compare.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompareEntry {
  company: CompanyWithNextStep;
  offer: CompanyOffer | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, currency: string, type: 'currency' | 'pct' | 'days'): string {
  if (n === null || n === undefined) return '—';
  if (type === 'currency') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  }
  if (type === 'pct') return `${n}%`;
  return `${n} days`;
}

function fmtExpectation(exp: OfferExpectations, field: keyof OfferExpectations): string {
  const v = exp[field];
  if (v === null || v === undefined) return '';
  if (field === 'base_salary' || field === 'signing_bonus' || field === 'equity_value') {
    return `≥ ${fmt(v as number, exp.currency, 'currency')}`;
  }
  if (field === 'bonus_pct' || field === 'retirement_match_pct') {
    return `≥ ${v}%`;
  }
  if (field === 'pto_days') return `≥ ${v} days`;
  if (field === 'remote_policy') return `${v} or better`;
  if (field === 'health_tier') return `${v} or better`;
  return String(v);
}

function meetsExpectation(
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

  // Numeric fields
  const offerVal = offer[field as keyof CompanyOffer];
  if (offerVal === null || offerVal === undefined) return false;
  return Number(offerVal) >= Number(expected);
}

function best(entries: CompareEntry[], getter: (o: CompanyOffer) => number | null | undefined): Set<string> {
  let max = -Infinity;
  for (const { offer } of entries) {
    if (!offer) continue;
    const v = getter(offer);
    if (v !== null && v !== undefined && v > max) max = v;
  }
  const ids = new Set<string>();
  if (max === -Infinity) return ids;
  for (const { company, offer } of entries) {
    if (!offer) continue;
    if (getter(offer) === max) ids.add(company.id);
  }
  return ids;
}

// ─── Row definitions ──────────────────────────────────────────────────────────

interface RowDef {
  label: string;
  render: (o: CompanyOffer | null) => React.ReactNode;
  bestGetter?: (o: CompanyOffer) => number | null | undefined;
  expField?: keyof OfferExpectations;
}

const ROWS: RowDef[] = [
  {
    label: 'Base Salary',
    render: (o) => o ? fmt(o.base_salary, o.currency, 'currency') : '—',
    bestGetter: (o) => o.base_salary,
    expField: 'base_salary',
  },
  {
    label: 'Signing Bonus',
    render: (o) => o ? fmt(o.signing_bonus, o.currency, 'currency') : '—',
    bestGetter: (o) => o.signing_bonus,
    expField: 'signing_bonus',
  },
  {
    label: 'Performance Bonus',
    render: (o) => o ? fmt(o.bonus_pct, o.currency, 'pct') : '—',
    bestGetter: (o) => o.bonus_pct,
    expField: 'bonus_pct',
  },
  {
    label: 'Equity / RSU',
    render: (o) =>
      o ? (
        <>
          {fmt(o.equity_value, o.currency, 'currency')}
          {o.equity_vesting && <span className={styles.sub}>{o.equity_vesting}</span>}
        </>
      ) : '—',
    bestGetter: (o) => o.equity_value,
    expField: 'equity_value',
  },
  {
    label: 'PTO Days',
    render: (o) => o ? fmt(o.pto_days, o.currency, 'days') : '—',
    bestGetter: (o) => o.pto_days,
    expField: 'pto_days',
  },
  {
    label: '401k / Retirement Match',
    render: (o) => o ? fmt(o.retirement_match_pct, o.currency, 'pct') : '—',
    bestGetter: (o) => o.retirement_match_pct,
    expField: 'retirement_match_pct',
  },
  {
    label: 'Remote Policy',
    render: (o) => o?.remote_policy ?? '—',
    expField: 'remote_policy',
  },
  {
    label: 'Health Insurance',
    render: (o) => o?.health_tier ?? '—',
    expField: 'health_tier',
  },
  {
    label: 'Other Benefits',
    render: (o) => o?.other_benefits ?? '—',
  },
  {
    label: 'Notes',
    render: (o) => o?.notes ?? '—',
  },
];

// ─── Expectations form ────────────────────────────────────────────────────────

function ExpectationsPanel({
  expectations,
  onSaved,
}: {
  expectations: OfferExpectations | null;
  onSaved: (e: OfferExpectations) => void;
}) {
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
      if (res.ok) {
        const saved = await res.json() as OfferExpectations;
        onSaved(saved);
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  // Summary line shown when collapsed
  const hasSomeExpectation = expectations && Object.values(expectations).some(
    (v) => v !== null && v !== undefined && v !== 'USD'
  );

  return (
    <div className={styles.expPanel}>
      <button
        className={styles.expToggle}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.expToggleLabel}>
          {hasSomeExpectation ? 'Your targets' : 'Set your targets'}
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
            Define minimum salary, PTO, remote policy… — cells that match will show ★
          </span>
        )}
        <span className={styles.expChevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.expForm}>
          <div className={styles.expGrid}>
            <div className={styles.expField}>
              <label className={styles.expLabel}>Base Salary</label>
              <div className={styles.expInputGroup}>
                <select className={styles.expCurrencySelect} value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={saving}>
                  {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input className={styles.expInput} type="number" min={0} placeholder="180000" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} disabled={saving} />
              </div>
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>Signing Bonus</label>
              <input className={styles.expInput} type="number" min={0} placeholder="15000" value={signingBonus} onChange={(e) => setSigningBonus(e.target.value)} disabled={saving} />
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>Performance Bonus %</label>
              <input className={styles.expInput} type="number" min={0} placeholder="10" value={bonusPct} onChange={(e) => setBonusPct(e.target.value)} disabled={saving} />
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>Equity / RSU Value</label>
              <input className={styles.expInput} type="number" min={0} placeholder="300000" value={equityValue} onChange={(e) => setEquityValue(e.target.value)} disabled={saving} />
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>PTO Days</label>
              <input className={styles.expInput} type="number" min={0} placeholder="20" value={ptoDays} onChange={(e) => setPtoDays(e.target.value)} disabled={saving} />
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>401k Match %</label>
              <input className={styles.expInput} type="number" min={0} placeholder="4" value={retirementMatch} onChange={(e) => setRetirementMatch(e.target.value)} disabled={saving} />
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>Remote Policy</label>
              <select className={styles.expInput} value={remotePolicy} onChange={(e) => setRemotePolicy(e.target.value as RemotePolicy | '')} disabled={saving}>
                <option value="">— any —</option>
                {REMOTE_POLICIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className={styles.expField}>
              <label className={styles.expLabel}>Health Insurance</label>
              <select className={styles.expInput} value={healthTier} onChange={(e) => setHealthTier(e.target.value as HealthTier | '')} disabled={saving}>
                <option value="">— any —</option>
                {HEALTH_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.expActions}>
            <button className={styles.expCancel} onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
            <button className={styles.expSave} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save targets'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [entries, setEntries] = useState<CompareEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expectations, setExpectations] = useState<OfferExpectations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/compare').then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CompareEntry[]>;
      }),
      fetch('/api/expectations').then((r) => {
        if (!r.ok) return null;
        return r.json() as Promise<OfferExpectations | null>;
      }),
    ])
      .then(([compareData, expData]) => {
        setEntries(compareData);
        setSelected(new Set(compareData.map((e) => e.company.id)));
        setExpectations(expData);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const visible = entries.filter((e) => selected.has(e.company.id));
  const hasExpectations = expectations && Object.values(expectations).some(
    (v) => v !== null && v !== undefined && v !== 'USD'
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Offer Comparison</h1>
        {!loading && !error && entries.length > 0 && (
          <p className={styles.pageSubtitle}>
            {entries.length} offer{entries.length !== 1 ? 's' : ''} — select which to compare
          </p>
        )}
      </div>

      {loading && <p className={styles.state}>Loading…</p>}
      {error && <p className={styles.stateError}>Failed to load: {error}</p>}
      {!loading && !error && entries.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No offers yet</p>
          <p className={styles.emptyBody}>Move companies to the <strong>Offer</strong> column on the board to start comparing.</p>
        </div>
      )}

      {!loading && !error && (
        <ExpectationsPanel
          expectations={expectations}
          onSaved={setExpectations}
        />
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <div className={styles.selector}>
            {entries.map(({ company }) => (
              <button
                key={company.id}
                className={`${styles.pill} ${selected.has(company.id) ? styles.pillActive : ''}`}
                onClick={() => toggleSelected(company.id)}
              >
                {company.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logo_url} alt="" className={styles.pillLogo} />
                ) : (
                  <span className={styles.pillLogoFallback}>{company.name.charAt(0)}</span>
                )}
                {company.name}
              </button>
            ))}
          </div>

          {visible.length === 0 && (
            <p className={styles.state}>Select at least one company above.</p>
          )}

          {visible.length > 0 && (
            <>
              {hasExpectations && (
                <p className={styles.legend}>★ meets or exceeds your target</p>
              )}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.labelCell}>Field</th>
                      {visible.map(({ company }) => (
                        <th key={company.id} className={styles.companyCell}>
                          {company.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={company.logo_url} alt={company.name} className={styles.thLogo} />
                          ) : (
                            <span className={styles.thLogoFallback}>{company.name.charAt(0)}</span>
                          )}
                          <span className={styles.thName}>{company.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row) => {
                      const bestIds = row.bestGetter
                        ? best(visible, row.bestGetter)
                        : new Set<string>();

                      const expText = row.expField && expectations
                        ? fmtExpectation(expectations, row.expField)
                        : '';

                      return (
                        <tr key={row.label}>
                          <td className={styles.labelCell}>
                            {row.label}
                            {expText && (
                              <span className={styles.expBadge}>{expText}</span>
                            )}
                          </td>
                          {visible.map(({ company, offer }) => {
                            const isBest = bestIds.has(company.id);
                            const meetsExp = row.expField
                              ? meetsExpectation(offer, expectations, row.expField)
                              : false;
                            return (
                              <td
                                key={company.id}
                                className={`${styles.valueCell} ${isBest ? styles.valueCellBest : ''} ${meetsExp ? styles.valueCellMeetsExp : ''}`}
                              >
                                <span className={styles.valueCellContent}>
                                  {row.render(offer)}
                                  {meetsExp && <span className={styles.star} title="Meets your target">★</span>}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
