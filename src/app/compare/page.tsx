'use client';

import { useEffect, useState } from 'react';
import type { OfferExpectations } from '@/types';
import {
  fmt,
  fmtExpectation,
  meetsExpectation,
  best,
  type CompareEntry,
  type RowDef,
} from './helpers';
import ExpectationsPanel from './components/ExpectationsPanel';
import styles from './compare.module.css';

// ─── Row definitions ──────────────────────────────────────────────────────────

const ROWS: RowDef[] = [
  {
    label: 'Base Salary',
    render: (offer) => offer ? fmt(offer.base_salary, offer.currency, 'currency') : '—',
    bestGetter: (offer) => offer.base_salary,
    expField: 'base_salary',
  },
  {
    label: 'Signing Bonus',
    render: (offer) => offer ? fmt(offer.signing_bonus, offer.currency, 'currency') : '—',
    bestGetter: (offer) => offer.signing_bonus,
    expField: 'signing_bonus',
  },
  {
    label: 'Performance Bonus',
    render: (offer) => offer ? fmt(offer.bonus_pct, offer.currency, 'pct') : '—',
    bestGetter: (offer) => offer.bonus_pct,
    expField: 'bonus_pct',
  },
  {
    label: 'Equity / RSU',
    render: (offer) => offer ? fmt(offer.equity_value, offer.currency, 'currency') : '—',
    renderSub: (offer) => offer?.equity_vesting ? <span className={styles.sub}>{offer.equity_vesting}</span> : null,
    bestGetter: (offer) => offer.equity_value,
    expField: 'equity_value',
  },
  {
    label: 'PTO Days',
    render: (offer) => offer ? fmt(offer.pto_days, offer.currency, 'days') : '—',
    bestGetter: (offer) => offer.pto_days,
    expField: 'pto_days',
  },
  {
    label: '401k / Retirement Match',
    render: (offer) => offer ? fmt(offer.retirement_match_pct, offer.currency, 'pct') : '—',
    bestGetter: (offer) => offer.retirement_match_pct,
    expField: 'retirement_match_pct',
  },
  {
    label: 'Remote Policy',
    render: (offer) => offer?.remote_policy ?? '—',
    expField: 'remote_policy',
  },
  {
    label: 'Health Insurance',
    render: (offer) => offer?.health_tier ?? '—',
    expField: 'health_tier',
  },
  {
    label: 'Other Benefits',
    render: (offer) => offer?.other_benefits ?? '—',
  },
  {
    label: 'Notes',
    render: (offer) => offer?.notes ?? '—',
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [entries, setEntries] = useState<CompareEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expectations, setExpectations] = useState<OfferExpectations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [compareData, expData] = await Promise.all([
          (async () => {
            const r = await fetch('/api/compare');
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json() as Promise<CompareEntry[]>;
          })(),
          (async () => {
            const r = await fetch('/api/expectations');
            if (!r.ok) return null;
            return r.json() as Promise<OfferExpectations | null>;
          })(),
        ]);
        setEntries(compareData);
        setSelected(new Set(compareData.map((entry) => entry.company.id)));
        setExpectations(expData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const visible = entries.filter((entry) => selected.has(entry.company.id));
  const hasExpectations = expectations && Object.values(expectations).some(
    (statusValue) => statusValue !== null && statusValue !== undefined && statusValue !== 'USD'
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
                                {row.renderSub?.(offer)}
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
