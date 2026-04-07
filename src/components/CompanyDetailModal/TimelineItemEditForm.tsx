'use client';

import { useState } from 'react';
import type { TimelineEvent, ProcessStatusValue } from '@/types';
import { PROCESS_STATUS_VALUES } from '@/types';
import { useToast } from '@/components/Toast/ToastProvider';
import { useTranslations } from 'next-intl';
import styles from './CompanyDetailModal.module.css';

interface EditFormProps {
  event: TimelineEvent;
  onSaved: (updated: TimelineEvent) => void;
  onCancel: () => void;
}

export default function TimelineItemEditForm({ event, onSaved, onCancel }: EditFormProps) {
  const { toast } = useToast();
  const t = useTranslations('companyDetail');
  const tCommon = useTranslations('common');
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

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);

    if (event.event_type === 'contact' && !contactName.trim()) {
      setError(t('contactNameRequired'));
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
        let json: { error?: string } = {};
        try { json = await res.json(); } catch { /* ignore */ }
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const updated = await res.json() as TimelineEvent;
      onSaved(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
      toast(message);
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.editForm} onSubmit={handleSubmit} noValidate>
      {event.event_type === 'note' && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>{t('noteTitle')} <span className={styles.optional}>{tCommon('optional')}</span></label>
            <input type="text" className={styles.input} value={noteTitle}
              onChange={(formEvent) => setNoteTitle(formEvent.target.value)} disabled={submitting} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('noteBody')}</label>
            <textarea className={styles.textarea} value={noteBody} rows={3}
              onChange={(formEvent) => setNoteBody(formEvent.target.value)} disabled={submitting} />
          </div>
        </>
      )}

      {event.event_type === 'contact' && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>{t('contactName')} <span className={styles.required}>*</span></label>
            <input type="text" className={styles.input} value={contactName}
              onChange={(formEvent) => setContactName(formEvent.target.value)} disabled={submitting} />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('contactRole')} <span className={styles.optional}>{tCommon('optional')}</span></label>
              <input type="text" className={styles.input} value={contactRole}
                onChange={(formEvent) => setContactRole(formEvent.target.value)} disabled={submitting} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('contactEmail')} <span className={styles.optional}>{tCommon('optional')}</span></label>
              <input type="email" className={styles.input} value={contactEmail}
                onChange={(formEvent) => setContactEmail(formEvent.target.value)} disabled={submitting} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('contactNotes')} <span className={styles.optional}>{tCommon('optional')}</span></label>
            <textarea className={styles.textarea} value={contactNotes} rows={2}
              onChange={(formEvent) => setContactNotes(formEvent.target.value)} disabled={submitting} />
          </div>
        </>
      )}

      {event.event_type === 'appointment' && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>{t('apptTitle')} <span className={styles.optional}>{tCommon('optional')}</span></label>
            <input type="text" className={styles.input} value={apptTitle}
              onChange={(formEvent) => setApptTitle(formEvent.target.value)} disabled={submitting} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('apptDateTime')} <span className={styles.optional}>{tCommon('optional')}</span></label>
            <input type="datetime-local" className={styles.input} value={apptDate}
              onChange={(formEvent) => setApptDate(formEvent.target.value)} disabled={submitting} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('apptNotes')} <span className={styles.optional}>{tCommon('optional')}</span></label>
            <textarea className={styles.textarea} value={apptNotes} rows={2}
              onChange={(formEvent) => setApptNotes(formEvent.target.value)} disabled={submitting} />
          </div>
        </>
      )}

      {event.event_type === 'process_status' && (
        <div className={styles.field}>
          <label className={styles.label}>{t('processStatus')}</label>
          <select className={styles.select} value={processStatus} disabled={submitting}
            onChange={(formEvent) => setProcessStatus(formEvent.target.value as ProcessStatusValue)}>
            {PROCESS_STATUS_VALUES.map((statusValue) => <option key={statusValue} value={statusValue}>{statusValue}</option>)}
          </select>
        </div>
      )}

      {error && <p className={styles.formError}>{error}</p>}

      <div className={styles.editFormActions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={submitting}>
          {tCommon('cancel')}
        </button>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? tCommon('saving') : tCommon('save')}
        </button>
      </div>
    </form>
  );
}
