'use client';

import { useEffect, useState } from 'react';
import type { CompanyWithNextStep, CompanyOffer } from '@/types';
import styles from './compare.module.css';

interface CompareEntry {
  company: CompanyWithNextStep;
  offer: CompanyOffer | null;
}

function fmt(n: number | null | undefined, currency: string, type: 'currency' | 'pct' | 'days'): string {
  if (n === null || n === undefined) return '—';
  if (type === 'currency') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  }
  if (type === 'pct') return `${n}%`;
  return `${n} days`;
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

const ROWS: {
  label: string;
  render: (o: CompanyOffer | null) => React.ReactNode;
  bestGetter?: (o: CompanyOffer) => number | null | undefined;
}[] = [
  {
    label: 'Base Salary',
    render: (o) => o ? fmt(o.base_salary, o.currency, 'currency') : '—',
    bestGetter: (o) => o.base_salary,
  },
  {
    label: 'Signing Bonus',
    render: (o) => o ? fmt(o.signing_bonus, o.currency, 'currency') : '—',
    bestGetter: (o) => o.signing_bonus,
  },
  {
    label: 'Performance Bonus',
    render: (o) => o ? fmt(o.bonus_pct, o.currency, 'pct') : '—',
    bestGetter: (o) => o.bonus_pct,
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
  },
  {
    label: 'PTO Days',
    render: (o) => o ? fmt(o.pto_days, o.currency, 'days') : '—',
    bestGetter: (o) => o.pto_days,
  },
  {
    label: '401k / Retirement Match',
    render: (o) => o ? fmt(o.retirement_match_pct, o.currency, 'pct') : '—',
    bestGetter: (o) => o.retirement_match_pct,
  },
  {
    label: 'Remote Policy',
    render: (o) => o?.remote_policy ?? '—',
  },
  {
    label: 'Health Insurance',
    render: (o) => o?.health_tier ?? '—',
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

export default function ComparePage() {
  const [entries, setEntries] = useState<CompareEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/compare')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CompareEntry[]>;
      })
      .then((data) => {
        setEntries(data);
        setSelected(new Set(data.map((e) => e.company.id)));
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const visible = entries.filter((e) => selected.has(e.company.id));

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

      {!loading && !error && entries.length > 0 && (
        <>
          {/* Company selector pills */}
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

                    return (
                      <tr key={row.label}>
                        <td className={styles.labelCell}>{row.label}</td>
                        {visible.map(({ company, offer }) => {
                          const isBest = bestIds.has(company.id);
                          return (
                            <td
                              key={company.id}
                              className={`${styles.valueCell} ${isBest ? styles.valueCellBest : ''}`}
                            >
                              {row.render(offer)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
