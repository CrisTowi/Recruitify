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
import { useToast } from '@/components/Toast/ToastProvider';
import { useTranslations } from 'next-intl';
import styles from './compare.module.css';

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const { toast } = useToast();
  const t = useTranslations('compare');
  const [entries, setEntries] = useState<CompareEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expectations, setExpectations] = useState<OfferExpectations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ROWS: RowDef[] = [
    {
      label: t('baseSalary'),
      render: (offer) => offer ? fmt(offer.base_salary, offer.currency, 'currency') : '—',
      bestGetter: (offer) => offer.base_salary,
      expField: 'base_salary',
    },
    {
      label: t('signingBonus'),
      render: (offer) => offer ? fmt(offer.signing_bonus, offer.currency, 'currency') : '—',
      bestGetter: (offer) => offer.signing_bonus,
      expField: 'signing_bonus',
    },
    {
      label: t('performanceBonus'),
      render: (offer) => offer ? fmt(offer.bonus_pct, offer.currency, 'pct') : '—',
      bestGetter: (offer) => offer.bonus_pct,
      expField: 'bonus_pct',
    },
    {
      label: t('equity'),
      render: (offer) => offer ? fmt(offer.equity_value, offer.currency, 'currency') : '—',
      renderSub: (offer) => offer?.equity_vesting ? <span className={styles.sub}>{offer.equity_vesting}</span> : null,
      bestGetter: (offer) => offer.equity_value,
      expField: 'equity_value',
    },
    {
      label: t('ptoDays'),
      render: (offer) => offer ? fmt(offer.pto_days, offer.currency, 'days') : '—',
      bestGetter: (offer) => offer.pto_days,
      expField: 'pto_days',
    },
    {
      label: t('retirement'),
      render: (offer) => offer ? fmt(offer.retirement_match_pct, offer.currency, 'pct') : '—',
      bestGetter: (offer) => offer.retirement_match_pct,
      expField: 'retirement_match_pct',
    },
    {
      label: t('remotePolicy'),
      render: (offer) => offer?.remote_policy ?? '—',
      expField: 'remote_policy',
    },
    {
      label: t('healthInsurance'),
      render: (offer) => offer?.health_tier ?? '—',
      expField: 'health_tier',
    },
    {
      label: t('otherBenefits'),
      render: (offer) => offer?.other_benefits ?? '—',
    },
    {
      label: t('notes'),
      render: (offer) => offer?.notes ?? '—',
    },
  ];

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
        const message = (err as Error).message;
        setError(message);
        toast(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

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
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        {!loading && !error && entries.length > 0 && (
          <p className={styles.pageSubtitle}>
            {t('offersCount', { count: entries.length })}
          </p>
        )}
      </div>

      {loading && <p className={styles.state}>{t('fieldColumn')}…</p>}
      {error && <p className={styles.stateError}>{t('failedToLoad', { error })}</p>}
      {!loading && !error && (
        <ExpectationsPanel
          expectations={expectations}
          onSaved={setExpectations}
        />
      )}

      {!loading && !error && entries.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{t('noOffersTitle')}</p>
          <p className={styles.emptyBody}>{t('noOffersBody')}</p>
        </div>
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
            <p className={styles.state}>{t('selectAtLeastOne')}</p>
          )}

          {visible.length > 0 && (
            <>
              {hasExpectations && (
                <p className={styles.legend}>{t('legend')}</p>
              )}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.labelCell}>{t('fieldColumn')}</th>
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
                                  {meetsExp && <span className={styles.star} title={t('legend')}>★</span>}
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
