import type { TimelineEvent } from '@/types';
import styles from './CompanyDetailModal.module.css';

export default function NoteItem({ event }: { event: TimelineEvent }) {
  return (
    <div className={styles.itemBody}>
      {event.title && <p className={styles.itemTitle}>{event.title}</p>}
      {event.body && <p className={styles.itemText}>{event.body}</p>}
    </div>
  );
}
