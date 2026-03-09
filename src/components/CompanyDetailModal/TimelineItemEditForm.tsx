'use client';

import { useState } from 'react';
import type { TimelineEvent, ProcessStatusValue } from '@/types';
import { PROCESS_STATUS_VALUES } from '@/types';
import styles from './CompanyDetailModal.module.css';

interface EditFormProps {
  event: TimelineEvent;
  onSaved: (updated: TimelineEvent) => void;
  onCancel: () => void;
}

export default function TimelineItemEditForm({ event, onSaved, onCancel }: EditFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [noteTitle, setNoteTitle] = useState(event.title ?? '');
  const [noteBody, setNoteBody] = useState(event.body ?? '');

  const [contactName, setContactName] = useState(event.contact_name ?? '');
  const [contactRole, setContactRole] = useState(event.contact_role ?? '');
  const [contactEmail, setContactEmail] = useState(event.contact_email ?? '');
  const [contactNotes, setContactNotes] = useState(event.body ?? '');

  const [apptTitle, setApptTitle] = useState(event.title ?? '');
  const [apptDate, setApptDate] = useState(
    event.scheduled_at ? new Date(event.scheduled_at).toISOString().slice(0, 16) : ''
  );
  const [apptNotes, setApptNotes] = useState(event.body ?? '');

  const [processStatus, setProcessStatus] = useState<ProcessStatusValue>(
    event.process_status ?? PROCESS_STATUS_VALUES[0]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (event.event_type === 'contact' && !contactName.trim()) {
      setError('Contact name is required.');
      return;
    }

    let payload: Record<string, unknown> = {};
    if (event.event_type === 'note') {
      payload = { title: noteTitle || null, body: noteBody || null };
    } else if (event.event_type === 'contact') {
      payload = {
        contact_name: contactName,
        contact_role: contactRole || null,
        contact_email: contactEmail || null,
        body: contactNotes || null,
      };
    } else if (event.event_type === 'appointment') {
      payload = {
        title: apptTitle || null,
        scheduled_at: apptDate || null,
        body: apptNotes || null,
      };
    } else if (event.event_type === 'process_status') {
      payload = { process_status: processStatus };
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/companies/${event.company_id}/timeline/${event.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const updated = await res.json() as TimelineEvent;
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.editForm} onSubmit={handleSubmit} noValidate>
      {event.event_type === 'note' && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Title <span className={styles.optional}>(optional)</span></label>
            <input type="text" className={styles.input} value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)} disabled={submitting} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Body</label>
            <textarea className={styles.textarea} value={noteBody} rows={3}
              onChange={(e) => setNoteBody(e.target.value)} disabled={submitting} />
          </div>
        </>
      )}

      {event.event_type === 'contact' && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Name <span className={styles.required}>*</span></label>
            <input type="text" className={styles.input} value={contactName}
              onChange={(e) => setContactName(e.target.value)} disabled={submitting} />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Role <span className={styles.optional}>(optional)</span></label>
              <input type="text" className={styles.input} value={contactRole}
                onChange={(e) => setContactRole(e.target.value)} disabled={submitting} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email <span className={styles.optional}>(optional)</span></label>
              <input type="email" className={styles.input} value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)} disabled={submitting} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Notes <span className={styles.optional}>(optional)</span></label>
            <textarea className={styles.textarea} value={contactNotes} rows={2}
              onChange={(e) => setContactNotes(e.target.value)} disabled={submitting} />
          </div>
        </>
      )}

      {event.event_type === 'appointment' && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Title <span className={styles.optional}>(optional)</span></label>
            <input type="text" className={styles.input} value={apptTitle}
              onChange={(e) => setApptTitle(e.target.value)} disabled={submitting} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Date &amp; Time <span className={styles.optional}>(optional)</span></label>
            <input type="datetime-local" className={styles.input} value={apptDate}
              onChange={(e) => setApptDate(e.target.value)} disabled={submitting} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Notes <span className={styles.optional}>(optional)</span></label>
            <textarea className={styles.textarea} value={apptNotes} rows={2}
              onChange={(e) => setApptNotes(e.target.value)} disabled={submitting} />
          </div>
        </>
      )}

      {event.event_type === 'process_status' && (
        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <select className={styles.select} value={processStatus} disabled={submitting}
            onChange={(e) => setProcessStatus(e.target.value as ProcessStatusValue)}>
            {PROCESS_STATUS_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      )}

      {error && <p className={styles.formError}>{error}</p>}

      <div className={styles.editFormActions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
