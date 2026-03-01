import type { CompanyWithNextStep, ApplicationStatus } from '@/types';
import styles from './CompanyCard.module.css';

interface Props {
  company: CompanyWithNextStep;
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  Wishlist:    'Wishlist',
  Applied:     'Applied',
  Interviewing:'Interviewing',
  Offer:       'Offer',
  Rejected:    'Rejected',
  Ghosted:     'Ghosted',
};

export default function CompanyCard({ company }: Props) {
  const { name, logo_url, status, next_step } = company;

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        {logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
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
