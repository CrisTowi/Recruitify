import type { CompanyWithNextStep } from '@/types';
import { STATUS_LABELS, INTEREST_EMOJI } from './helpers';
import styles from './CompanyCard.module.css';

interface Props {
  company: CompanyWithNextStep;
}

export default function CompanyCard({ company }: Props) {
  const { name, logo_url, status, next_step, interest_level } = company;

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
            {STATUS_LABELS[status]}
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
              {new Date(next_step.scheduled_date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
