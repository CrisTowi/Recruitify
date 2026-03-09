import type { TimelineEvent } from '@/types';
import { formatDateTime } from './helpers';
import styles from './CompanyDetailModal.module.css';

export default function AppointmentItem({ event }: { event: TimelineEvent }) {
  return (
    <div className={styles.itemBody}>
      {event.title && <p className={styles.itemTitle}>{event.title}</p>}
      {event.scheduled_at && (
        <p className={styles.itemDate}>{formatDateTime(event.scheduled_at)}</p>
      )}
      {event.body && <p className={styles.itemText}>{event.body}</p>}
    </div>
  );
}
