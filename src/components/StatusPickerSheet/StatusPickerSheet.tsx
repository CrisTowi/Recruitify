'use client';

import type { ApplicationStatus, CompanyWithNextStep } from '@/types';
import { COLUMNS } from '@/components/KanbanBoard/helpers';
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
  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet} role="dialog" aria-label="Move company to column">
        <div className={styles.handle} />
        <p className={styles.title}>
          Move <strong>{company.name}</strong> to…
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
                <span className={styles.statusLabel}>{status}</span>
                {isActive && <span className={styles.checkmark}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
