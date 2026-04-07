'use client';

import type { ApplicationStatus, CompanyWithNextStep } from '@/types';
import { COLUMNS } from '@/components/KanbanBoard/helpers';
import { useTranslations } from 'next-intl';
import styles from './StatusPickerSheet.module.css';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  Wishlist:     'var(--color-status-wishlist)',
  Applied:      'var(--color-status-applied)',
  Interviewing: 'var(--color-status-interviewing)',
  Offer:        'var(--color-status-offer)',
  Rejected:     'var(--color-status-rejected)',
  Ghosted:      'var(--color-status-ghosted)',
};

interface Props {
  company: CompanyWithNextStep;
  onSelect: (status: ApplicationStatus) => void;
  onClose: () => void;
}

export default function StatusPickerSheet({ company, onSelect, onClose }: Props) {
  const t = useTranslations('board');
  const tStatuses = useTranslations('statuses');

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet} role="dialog" aria-label={t('moveTo', { name: company.name })}>
        <div className={styles.handle} />
        <p className={styles.title}>
          {t('moveTo', { name: company.name })}
        </p>
        <div className={styles.grid}>
          {COLUMNS.map((status) => {
            const isActive = company.status === status;
            return (
              <button
                key={status}
                className={`${styles.statusButton} ${isActive ? styles.statusButtonActive : ''}`}
                style={{ '--status-color': STATUS_COLORS[status] } as React.CSSProperties}
                onClick={() => onSelect(status)}
              >
                <span className={styles.statusDot} />
                <span className={styles.statusLabel}>{tStatuses(status)}</span>
                {isActive && <span className={styles.checkmark}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
