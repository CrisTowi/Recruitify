'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  CompanyWithNextStep,
  TimelineEvent,
  TimelineEventType,
  ProcessStatusValue,
  CreateTimelineEventPayload,
} from '@/types';
import { PROCESS_STATUS_VALUES } from '@/types';
import styles from './CompanyDetailModal.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Timeline item display components ────────────────────────────────────────

function NoteItem({ event }: { event: TimelineEvent }) {
  return (
    <div className={styles.itemBody}>
      {event.title && <p className={styles.itemTitle}>{event.title}</p>}
      {event.body && <p className={styles.itemText}>{event.body}</p>}
    </div>
  );
}

function ContactItem({ event }: { event: TimelineEvent }) {
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

function AppointmentItem({ event }: { event: TimelineEvent }) {
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

function ProcessStatusItem({ event }: { event: TimelineEvent }) {
  return (
    <div className={styles.itemBody}>
      <span className={styles.processStatusBadge}>{event.process_status}</span>
    </div>
  );
}

function StatusChangeItem({ event }: { event: TimelineEvent }) {
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

// ─── Event type metadata ──────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  note: 'Note',
  contact: 'Contact',
  appointment: 'Appointment',
  process_status: 'Process Status',
  status_change: 'Moved',
};

// User-creatable types only (status_change is system-generated)
const USER_EVENT_TYPES: TimelineEventType[] = ['note', 'contact', 'appointment', 'process_status'];

// ─── Inline Edit Form ─────────────────────────────────────────────────────────

interface EditFormProps {
  event: TimelineEvent;
  onSaved: (updated: TimelineEvent) => void;
  onCancel: () => void;
}

function TimelineItemEditForm({ event, onSaved, onCancel }: EditFormProps) {
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

// ─── Add Entry Form ───────────────────────────────────────────────────────────

interface AddEntryFormProps {
  companyId: string;
  onCreated: (event: TimelineEvent) => void;
}

function AddEntryForm({ companyId, onCreated }: AddEntryFormProps) {
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

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  company: CompanyWithNextStep;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export default function CompanyDetailModal({ company, onClose, onDeleted }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/companies/${company.id}/timeline`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<TimelineEvent[]>;
      })
      .then((data) => { setEvents(data); setLoading(false); })
      .catch((err: Error) => { setFetchError(err.message); setLoading(false); });
  }, [company.id]);

  const handleCreated = useCallback((newEvent: TimelineEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
  }, []);

  const handleSaved = useCallback((updated: TimelineEvent) => {
    setEvents((prev) => prev.map((e) => e.id === updated.id ? updated : e));
    setEditingId(null);
  }, []);

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    const res = await fetch(`/api/companies/${company.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDeleted(company.id);
    } else {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const { name, logo_url, status } = company;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.companyInfo}>
            {logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo_url} alt={`${name} logo`} className={styles.logo} />
            ) : (
              <div className={styles.logoFallback}>
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 id="detail-modal-title" className={styles.companyName}>{name}</h2>
              <span className={styles.statusBadge} data-status={status.toLowerCase()}>
                {status}
              </span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              className={`${styles.deleteButton} ${confirmDelete ? styles.deleteButtonConfirm : ''}`}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : confirmDelete ? 'Confirm delete?' : 'Delete'}
            </button>
            <button
              ref={closeButtonRef}
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className={styles.modalBody}>
          <AddEntryForm companyId={company.id} onCreated={handleCreated} />

          <div className={styles.timelineSection}>
            <h3 className={styles.timelineSectionTitle}>Timeline</h3>

            {loading && <p className={styles.timelineLoading}>Loading timeline…</p>}
            {fetchError && <p className={styles.timelineError}>Failed to load: {fetchError}</p>}
            {!loading && !fetchError && events.length === 0 && (
              <p className={styles.timelineEmpty}>No entries yet. Add one above.</p>
            )}

            {!loading && !fetchError && events.length > 0 && (
              <ol className={styles.timeline}>
                {events.map((event) => (
                  <li key={event.id} className={styles.timelineItem}>
                    <div className={styles.timelineIcon} data-type={event.event_type}>
                      {event.event_type === 'note' && 'N'}
                      {event.event_type === 'contact' && 'C'}
                      {event.event_type === 'appointment' && 'A'}
                      {event.event_type === 'process_status' && 'S'}
                      {event.event_type === 'status_change' && '→'}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineItemHeader}>
                        <span className={styles.eventTypeLabel}>
                          {EVENT_TYPE_LABELS[event.event_type]}
                        </span>
                        <div className={styles.itemHeaderRight}>
                          <time className={styles.eventDate} dateTime={event.created_at}>
                            {formatDate(event.created_at)}
                          </time>
                          {event.event_type !== 'status_change' && editingId !== event.id && (
                            <button
                              className={styles.editButton}
                              onClick={() => setEditingId(event.id)}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>

                      {editingId === event.id ? (
                        <TimelineItemEditForm
                          event={event}
                          onSaved={handleSaved}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <>
                          {event.event_type === 'note' && <NoteItem event={event} />}
                          {event.event_type === 'contact' && <ContactItem event={event} />}
                          {event.event_type === 'appointment' && <AppointmentItem event={event} />}
                          {event.event_type === 'process_status' && <ProcessStatusItem event={event} />}
                          {event.event_type === 'status_change' && <StatusChangeItem event={event} />}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
