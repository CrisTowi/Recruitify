import type { TimelineEvent } from '@/types';
import styles from './CompanyDetailModal.module.css';

export default function ContactItem({ event }: { event: TimelineEvent }) {
  return (
    <div className={styles.itemBody}>
      <p className={styles.itemTitle}>{event.contact_name}</p>
      {event.contact_role && <p className={styles.itemSubtitle}>{event.contact_role}</p>}
      {event.contact_email && (
        <a href={`mailto:${event.contact_email}`} className={styles.itemLink}>
          {event.contact_email}
        </a>
      )}
      {event.body && <p className={styles.itemText}>{event.body}</p>}
    </div>
  );
}
