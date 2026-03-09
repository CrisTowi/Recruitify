import type { TimelineEvent } from '@/types';
import styles from './CompanyDetailModal.module.css';

export default function ProcessStatusItem({ event }: { event: TimelineEvent }) {
  return (
    <div className={styles.itemBody}>
      <span className={styles.processStatusBadge}>{event.process_status}</span>
    </div>
  );
}
