import type { TimelineEvent } from '@/types';
import styles from './CompanyDetailModal.module.css';

export default function StatusChangeItem({ event }: { event: TimelineEvent }) {
  return (
    <div className={styles.itemBody}>
      <p className={styles.statusChangeText}>
        <span className={styles.statusChangeFrom}>{event.title}</span>
        <span className={styles.statusChangeArrow}> → </span>
        <span className={styles.statusChangeTo}>{event.body}</span>
      </p>
    </div>
  );
}
