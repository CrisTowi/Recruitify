'use client';

import type { CompanyWithNextStep } from '@/types';
import { INTEREST_EMOJI } from './helpers';
import { useTranslations, useLocale } from 'next-intl';
import styles from './CompanyCard.module.css';

interface Props {
  company: CompanyWithNextStep;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  prevLabel?: string;
  nextLabel?: string;
}

export default function CompanyCard({ company, onMoveLeft, onMoveRight, prevLabel, nextLabel }: Props) {
  const tStatuses = useTranslations('statuses');
  const locale = useLocale();
  const { name, logo_url, status, next_step, interest_level } = company;
  const hasMoveBar = onMoveLeft !== undefined || onMoveRight !== undefined;

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        {logo_url ? (
          <img src={logo_url} alt={`${name} logo`} className={styles.logo} />
        ) : (
          <div className={styles.logoFallback}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className={styles.meta}>
          <h3 className={styles.name}>{name}</h3>
          <span
            className={styles.statusBadge}
            data-status={status.toLowerCase()}
          >
            {tStatuses(status)}
          </span>
        </div>
        {interest_level && (
          <span className={styles.interestBadge} title={interest_level}>
            {INTEREST_EMOJI[interest_level]}
          </span>
        )}
      </div>

      {next_step && (
        <div className={styles.nextStep}>
          <span className={styles.nextStepLabel}>Next</span>
          <span className={styles.nextStepName}>{next_step.stage_name}</span>
          {next_step.scheduled_date && (
            <span className={styles.nextStepDate}>
              {new Date(next_step.scheduled_date).toLocaleDateString(locale, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      )}

      {hasMoveBar && (
        <div className={styles.moveBar}>
          <button
            className={styles.moveButton}
            onClick={(event) => { event.stopPropagation(); onMoveLeft?.(); }}
            disabled={!onMoveLeft}
            aria-label={prevLabel ? `Move to ${prevLabel}` : 'Move to previous column'}
          >
            ←
          </button>
          <button
            className={styles.moveButton}
            onClick={(event) => { event.stopPropagation(); onMoveRight?.(); }}
            disabled={!onMoveRight}
            aria-label={nextLabel ? `Move to ${nextLabel}` : 'Move to next column'}
          >
            →
          </button>
        </div>
      )}
    </article>
  );
}
