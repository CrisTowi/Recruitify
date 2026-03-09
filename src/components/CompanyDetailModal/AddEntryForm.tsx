'use client';

import { useState } from 'react';
import type { TimelineEvent, TimelineEventType, ProcessStatusValue, CreateTimelineEventPayload } from '@/types';
import { PROCESS_STATUS_VALUES } from '@/types';
import { EVENT_TYPE_LABELS, USER_EVENT_TYPES } from './helpers';
import styles from './CompanyDetailModal.module.css';

interface AddEntryFormProps {
  companyId: string;
  onCreated: (event: TimelineEvent) => void;
}

export default function AddEntryForm({ companyId, onCreated }: AddEntryFormProps) {
  const [eventType, setEventType] = useState<TimelineEventType>('note');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  const [apptTitle, setApptTitle] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptNotes, setApptNotes] = useState('');

  const [processStatus, setProcessStatus] = useState<ProcessStatusValue>(PROCESS_STATUS_VALUES[0]);

  function resetFields() {
    setNoteTitle(''); setNoteBody('');
    setContactName(''); setContactRole(''); setContactEmail(''); setContactNotes('');
    setApptTitle(''); setApptDate(''); setApptNotes('');
    setProcessStatus(PROCESS_STATUS_VALUES[0]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (eventType === 'contact' && !contactName.trim()) {
      setError('Contact name is required.');
      return;
    }

    const payload: CreateTimelineEventPayload = { event_type: eventType };

    if (eventType === 'note') {
      payload.title = noteTitle;
      payload.body = noteBody;
    } else if (eventType === 'contact') {
      payload.contact_name = contactName;
      payload.contact_role = contactRole;
      payload.contact_email = contactEmail;
      payload.body = contactNotes;
    } else if (eventType === 'appointment') {
      payload.title = apptTitle;
      payload.scheduled_at = apptDate || undefined;
      payload.body = apptNotes;
    } else if (eventType === 'process_status') {
      payload.process_status = processStatus;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const created = await res.json() as TimelineEvent;
      resetFields();
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.addForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.addFormHeader}>
        <span className={styles.addFormTitle}>Add Entry</span>
        <div className={styles.typeSelector}>
          {USER_EVENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`${styles.typeTab} ${eventType === type ? styles.typeTabActive : ''}`}
              onClick={() => { setEventType(type); setError(null); }}
              disabled={submitting}
            >
              {EVENT_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {eventType === 'note' && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>
              Title <span className={styles.optional}>(optional)</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Post-interview thoughts"
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Body</label>
            <textarea
              className={styles.textarea}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Write your note here…"
              rows={3}
              disabled={submitting}
            />
          </div>
        </>
      )}

      {eventType === 'contact' && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>
              Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Jane Smith"
              disabled={submitting}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>
                Role <span className={styles.optional}>(optional)</span>
              </label>
              <input
                type="text"
                className={styles.input}
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                placeholder="e.g. Engineering Manager"
                disabled={submitting}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Email <span className={styles.optional}>(optional)</span>
              </label>
              <input
                type="email"
                className={styles.input}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="jane@example.com"
                disabled={submitting}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              Notes <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              className={styles.textarea}
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              placeholder="Notes about this contact…"
              rows={2}
              disabled={submitting}
            />
          </div>
        </>
      )}

      {eventType === 'appointment' && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>
              Title <span className={styles.optional}>(optional)</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={apptTitle}
              onChange={(e) => setApptTitle(e.target.value)}
              placeholder="e.g. Technical Screen"
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              Date &amp; Time <span className={styles.optional}>(optional)</span>
            </label>
            <input
              type="datetime-local"
              className={styles.input}
              value={apptDate}
              onChange={(e) => setApptDate(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              Notes <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              className={styles.textarea}
              value={apptNotes}
              onChange={(e) => setApptNotes(e.target.value)}
              placeholder="e.g. 45 min, Zoom link TBD"
              rows={2}
              disabled={submitting}
            />
          </div>
        </>
      )}

      {eventType === 'process_status' && (
        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <select
            className={styles.select}
            value={processStatus}
            onChange={(e) => setProcessStatus(e.target.value as ProcessStatusValue)}
            disabled={submitting}
          >
            {PROCESS_STATUS_VALUES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className={styles.formError}>{error}</p>}

      <div className={styles.addFormActions}>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? 'Saving…' : 'Add Entry'}
        </button>
      </div>
    </form>
  );
}
