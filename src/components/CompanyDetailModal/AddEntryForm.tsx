'use client';

import { useState } from 'react';
import type { TimelineEvent, TimelineEventType, ProcessStatusValue, CreateTimelineEventPayload } from '@/types';
import { PROCESS_STATUS_VALUES } from '@/types';
import { EVENT_TYPE_TRANSLATION_KEYS, USER_EVENT_TYPES } from './helpers';
import { useToast } from '@/components/Toast/ToastProvider';
import { useTranslations } from 'next-intl';
import styles from './CompanyDetailModal.module.css';

interface AddEntryFormProps {
  companyId: string;
  onCreated: (event: TimelineEvent) => void;
}

export default function AddEntryForm({ companyId, onCreated }: AddEntryFormProps) {
  const { toast } = useToast();
  const t = useTranslations('companyDetail');
  const tCommon = useTranslations('common');
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (eventType === 'contact' && !contactName.trim()) {
      setError(t('contactNameRequired'));
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
        let json: { error?: string } = {};
        try { json = await res.json(); } catch { /* ignore */ }
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const created = await res.json() as TimelineEvent;
      resetFields();
      onCreated(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
      toast(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.addForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.addFormHeader}>
        <span className={styles.addFormTitle}>{t('addEntry')}</span>
        <div className={styles.typeSelector}>
          {USER_EVENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`${styles.typeTab} ${eventType === type ? styles.typeTabActive : ''}`}
              onClick={() => { setEventType(type); setError(null); }}
              disabled={submitting}
            >
              {t(EVENT_TYPE_TRANSLATION_KEYS[type] as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {eventType === 'note' && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>
              {t('noteTitle')} <span className={styles.optional}>{tCommon('optional')}</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
              placeholder={t('noteTitlePlaceholder')}
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('noteBody')}</label>
            <textarea
              className={styles.textarea}
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder={t('noteBodyPlaceholder')}
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
              {t('contactName')} <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder={t('contactNamePlaceholder')}
              disabled={submitting}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>
                {t('contactRole')} <span className={styles.optional}>{tCommon('optional')}</span>
              </label>
              <input
                type="text"
                className={styles.input}
                value={contactRole}
                onChange={(event) => setContactRole(event.target.value)}
                placeholder={t('contactRolePlaceholder')}
                disabled={submitting}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                {t('contactEmail')} <span className={styles.optional}>{tCommon('optional')}</span>
              </label>
              <input
                type="email"
                className={styles.input}
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder={t('contactEmailPlaceholder')}
                disabled={submitting}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              {t('contactNotes')} <span className={styles.optional}>{tCommon('optional')}</span>
            </label>
            <textarea
              className={styles.textarea}
              value={contactNotes}
              onChange={(event) => setContactNotes(event.target.value)}
              placeholder={t('contactNotesPlaceholder')}
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
              {t('apptTitle')} <span className={styles.optional}>{tCommon('optional')}</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={apptTitle}
              onChange={(event) => setApptTitle(event.target.value)}
              placeholder={t('apptTitlePlaceholder')}
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              {t('apptDateTime')} <span className={styles.optional}>{tCommon('optional')}</span>
            </label>
            <input
              type="datetime-local"
              className={styles.input}
              value={apptDate}
              onChange={(event) => setApptDate(event.target.value)}
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              {t('apptNotes')} <span className={styles.optional}>{tCommon('optional')}</span>
            </label>
            <textarea
              className={styles.textarea}
              value={apptNotes}
              onChange={(event) => setApptNotes(event.target.value)}
              placeholder={t('apptNotesPlaceholder')}
              rows={2}
              disabled={submitting}
            />
          </div>
        </>
      )}

      {eventType === 'process_status' && (
        <div className={styles.field}>
          <label className={styles.label}>{t('processStatus')}</label>
          <select
            className={styles.select}
            value={processStatus}
            onChange={(event) => setProcessStatus(event.target.value as ProcessStatusValue)}
            disabled={submitting}
          >
            {PROCESS_STATUS_VALUES.map((statusValue) => (
              <option key={statusValue} value={statusValue}>{statusValue}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className={styles.formError}>{error}</p>}

      <div className={styles.addFormActions}>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? tCommon('saving') : t('addEntrySubmit')}
        </button>
      </div>
    </form>
  );
}
