'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  CompanyWithNextStep,
  InterviewStage,
  TimelineEvent,
  TimelineEventType,
  ProcessStatusValue,
  CreateTimelineEventPayload,
  InterestLevel,
} from '@/types';
import { PROCESS_STATUS_VALUES, INTEREST_LEVELS } from '@/types';
import styles from './CompanyDetailModal.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const URL_REGEX = /https?:\/\/[^\s<>"']+/g;

function renderWithLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a key={match.index} href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

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

// ─── Stage sub-components ─────────────────────────────────────────────────────

function StageAddForm({ companyId, onCreated }: { companyId: string; onCreated: (s: InterviewStage) => void }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_name: name.trim(), scheduled_date: date || null }),
      });
      if (res.ok) {
        const created = await res.json() as InterviewStage;
        onCreated(created);
        setName('');
        setDate('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.stageAddForm} onSubmit={handleSubmit}>
      <input
        className={styles.stageAddInput}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Stage name (e.g. Technical screen)"
        disabled={submitting}
      />
      <input
        className={styles.stageAddDate}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        disabled={submitting}
        title="Scheduled date (optional)"
      />
      <button className={styles.submitButton} type="submit" disabled={submitting || !name.trim()}>
        {submitting ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}

function StageItem({
  stage, companyId, onUpdated, onDeleted, onTimelineCreated,
}: {
  stage: InterviewStage;
  companyId: string;
  onUpdated: (s: InterviewStage) => void;
  onDeleted: (id: string) => void;
  onTimelineCreated: (e: TimelineEvent) => void;
}) {
  // Notes panel
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(stage.notes ?? '');
  const [notesSaving, setNotesSaving] = useState(false);

  // Inline edit
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(stage.stage_name);
  const [editDate, setEditDate] = useState(stage.scheduled_date ?? '');
  const [editSaving, setEditSaving] = useState(false);

  // Complete + log to timeline
  const [completing, setCompleting] = useState(false);
  const [completeNote, setCompleteNote] = useState('');
  const [completeSaving, setCompleteSaving] = useState(false);

  async function handleCheckboxClick() {
    if (stage.is_completed) {
      // Uncomplete immediately — no need to log
      const res = await fetch(`/api/companies/${companyId}/roadmap/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: false }),
      });
      if (res.ok) onUpdated(await res.json());
    } else {
      setCompleteNote('');
      setCompleting(true);
    }
  }

  async function completeAndLog() {
    setCompleteSaving(true);
    try {
      const [patchRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/roadmap/${stage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_completed: true }),
        }),
      ]);
      if (patchRes.ok) onUpdated(await patchRes.json());

      if (completeNote.trim()) {
        const timelineRes = await fetch(`/api/companies/${companyId}/timeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: 'note', title: stage.stage_name, body: completeNote.trim() }),
        });
        if (timelineRes.ok) onTimelineCreated(await timelineRes.json());
      }
      setCompleting(false);
    } finally {
      setCompleteSaving(false);
    }
  }

  async function completeOnly() {
    setCompleteSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/roadmap/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: true }),
      });
      if (res.ok) onUpdated(await res.json());
      setCompleting(false);
    } finally {
      setCompleteSaving(false);
    }
  }

  async function saveEdit() {
    if (!editName.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/roadmap/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_name: editName.trim(), scheduled_date: editDate || null }),
      });
      if (res.ok) { onUpdated(await res.json()); setEditing(false); }
    } finally {
      setEditSaving(false);
    }
  }

  async function saveNotes() {
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/roadmap/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesDraft }),
      });
      if (res.ok) { onUpdated(await res.json()); setNotesOpen(false); }
    } finally {
      setNotesSaving(false);
    }
  }

  async function deleteStage() {
    const res = await fetch(`/api/companies/${companyId}/roadmap/${stage.id}`, { method: 'DELETE' });
    if (res.ok) onDeleted(stage.id);
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <li className={styles.roadmapItem}>
        <div className={styles.stageAddForm}>
          <input
            className={styles.stageAddInput}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={editSaving}
            autoFocus
          />
          <input
            className={styles.stageAddDate}
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            disabled={editSaving}
          />
          <button className={styles.submitButton} onClick={saveEdit} disabled={editSaving || !editName.trim()}>
            {editSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            className={styles.cancelButton}
            onClick={() => { setEditName(stage.stage_name); setEditDate(stage.scheduled_date ?? ''); setEditing(false); }}
            disabled={editSaving}
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  // ── Normal view ───────────────────────────────────────────────────────────
  return (
    <li className={`${styles.roadmapItem} ${stage.is_completed ? styles.roadmapItemDone : ''}`}>
      <div className={styles.roadmapRow}>
        <button
          className={styles.roadmapCheckbox}
          onClick={handleCheckboxClick}
          disabled={completing}
          title={stage.is_completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {stage.is_completed ? '✓' : ''}
        </button>

        <span className={styles.roadmapStageName}>{stage.stage_name}</span>

        {stage.scheduled_date && (
          <span className={styles.roadmapDate}>
            {new Date(stage.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}

        {!completing && (
          <>
            <button
              className={`${styles.editButton} ${styles.roadmapNotesBtn}`}
              onClick={() => { setNotesDraft(stage.notes ?? ''); setNotesOpen((o) => !o); }}
            >
              {stage.notes ? 'Notes' : 'Add note'}
            </button>
            <button
              className={`${styles.editButton} ${styles.roadmapNotesBtn}`}
              onClick={() => { setEditName(stage.stage_name); setEditDate(stage.scheduled_date ?? ''); setEditing(true); }}
            >
              Edit
            </button>
            <button className={styles.roadmapDeleteBtn} onClick={deleteStage} title="Remove stage">✕</button>
          </>
        )}
      </div>

      {/* Complete + log panel */}
      {completing && (
        <div className={styles.stageNotes}>
          <p className={styles.stageCompleteLabel}>Add a note to the timeline about this interview (optional)</p>
          <textarea
            className={styles.prepTextarea}
            value={completeNote}
            onChange={(e) => setCompleteNote(e.target.value)}
            placeholder={`How did the ${stage.stage_name} go? Impressions, feedback, next steps…`}
            rows={3}
            autoFocus
          />
          <div className={styles.stageCompleteActions}>
            <button className={styles.cancelButton} onClick={() => setCompleting(false)} disabled={completeSaving}>
              Cancel
            </button>
            <button className={styles.ghostButton} onClick={completeOnly} disabled={completeSaving}>
              Complete without note
            </button>
            <button className={styles.submitButton} onClick={completeAndLog} disabled={completeSaving}>
              {completeSaving ? 'Saving…' : 'Complete & log'}
            </button>
          </div>
        </div>
      )}

      {/* Notes panel */}
      {notesOpen && !completing && (
        <div className={styles.stageNotes}>
          <textarea
            className={styles.prepTextarea}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Prep tips, resources, post-interview thoughts…"
            rows={4}
            autoFocus
          />
          <div className={styles.prepActions}>
            <button className={styles.cancelButton} onClick={() => setNotesOpen(false)} disabled={notesSaving}>Cancel</button>
            <button className={styles.submitButton} onClick={saveNotes} disabled={notesSaving}>
              {notesSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  company: CompanyWithNextStep;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onUpdated: (updated: CompanyWithNextStep) => void;
}

export default function CompanyDetailModal({ company, onClose, onDeleted, onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'stages'>('timeline');
  const [stages, setStages] = useState<InterviewStage[]>([]);
  const [prepNotes, setPrepNotes] = useState(company.prep_notes ?? '');
  const [prepDraft, setPrepDraft] = useState(company.prep_notes ?? '');
  const [prepEditing, setPrepEditing] = useState(false);
  const [prepSaving, setPrepSaving] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [interestLevel, setInterestLevel] = useState<InterestLevel | null>(company.interest_level);
  const [savingInterest, setSavingInterest] = useState(false);
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
    Promise.all([
      fetch(`/api/companies/${company.id}/roadmap`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<InterviewStage[]>;
      }),
      fetch(`/api/companies/${company.id}/timeline`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<TimelineEvent[]>;
      }),
    ])
      .then(([roadmap, timeline]) => {
        setStages(roadmap);
        setEvents(timeline);
        setLoading(false);
      })
      .catch((err: Error) => { setFetchError(err.message); setLoading(false); });
  }, [company.id]);

  const handleInterestChange = useCallback(async (value: InterestLevel | null) => {
    const prev = interestLevel;
    setInterestLevel(value);
    setSavingInterest(true);
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest_level: value }),
      });
      if (!res.ok) throw new Error();
      onUpdated({ ...company, interest_level: value });
    } catch {
      setInterestLevel(prev);
    } finally {
      setSavingInterest(false);
    }
  }, [company, interestLevel, onUpdated]);

  const handleCreated = useCallback((newEvent: TimelineEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
  }, []);

  const handlePrepSave = useCallback(async () => {
    setPrepSaving(true);
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prep_notes: prepDraft }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPrepNotes(prepDraft);
        onUpdated({ ...company, prep_notes: updated.prep_notes });
        setPrepEditing(false);
      }
    } finally {
      setPrepSaving(false);
    }
  }, [company, prepDraft, onUpdated]);

  const handlePrepCancel = useCallback(() => {
    setPrepDraft(prepNotes);
    setPrepEditing(false);
  }, [prepNotes]);

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

        {/* Interest level selector */}
        <div className={styles.interestBar}>
          <span className={styles.interestLabel}>Interest</span>
          <div className={styles.interestOptions}>
            {INTEREST_LEVELS.map(({ value, emoji }) => (
              <button
                key={value}
                className={`${styles.interestOption} ${interestLevel === value ? styles.interestOptionActive : ''}`}
                onClick={() => handleInterestChange(interestLevel === value ? null : value)}
                disabled={savingInterest}
                title={value}
              >
                <span className={styles.interestEmoji}>{emoji}</span>
                <span className={styles.interestOptionLabel}>{value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === 'timeline' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            Timeline
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'stages' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('stages')}
          >
            Interview &amp; Prep{stages.length > 0 && <span className={styles.tabCount}>{stages.length}</span>}
          </button>
        </div>

        {/* Scrollable body */}
        <div className={styles.modalBody}>
          {activeTab === 'timeline' && (
            <>
              <AddEntryForm companyId={company.id} onCreated={handleCreated} />

              <div className={styles.timelineSection}>
                <h3 className={styles.timelineSectionTitle}>Timeline</h3>

                {loading && <p className={styles.timelineLoading}>Loading…</p>}
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
            </>
          )}

          {activeTab === 'stages' && (
            <div className={styles.roadmapSection}>
              {/* Add stage form */}
              <StageAddForm companyId={company.id} onCreated={(s) => setStages((prev) => [...prev, s])} />

              {loading && <p className={styles.timelineLoading}>Loading…</p>}
              {!loading && stages.length === 0 && (
                <p className={styles.timelineEmpty}>No stages yet. Add your first one above.</p>
              )}
              {!loading && stages.length > 0 && (
                <ol className={styles.roadmap}>
                  {stages.map((stage) => (
                    <StageItem
                      key={stage.id}
                      stage={stage}
                      companyId={company.id}
                      onUpdated={(updated) => setStages((prev) => prev.map((s) => s.id === updated.id ? updated : s))}
                      onDeleted={(id) => setStages((prev) => prev.filter((s) => s.id !== id))}
                      onTimelineCreated={handleCreated}
                    />
                  ))}
                </ol>
              )}

              {!loading && (
                <div className={styles.prepSection}>
                  <div className={styles.prepHeader}>
                    <span className={styles.prepLabel}>Prep Notes</span>
                    {!prepEditing && (
                      <button
                        className={styles.prepEditButton}
                        onClick={() => { setPrepDraft(prepNotes); setPrepEditing(true); }}
                      >
                        {prepNotes ? 'Edit' : 'Add notes'}
                      </button>
                    )}
                  </div>

                  {prepEditing ? (
                    <>
                      <textarea
                        className={styles.prepTextarea}
                        value={prepDraft}
                        onChange={(e) => setPrepDraft(e.target.value)}
                        placeholder="Links, resources, topics to study, interviewer tips…"
                        rows={6}
                        autoFocus
                      />
                      <div className={styles.prepActions}>
                        <button
                          className={styles.cancelButton}
                          onClick={handlePrepCancel}
                          disabled={prepSaving}
                        >
                          Cancel
                        </button>
                        <button
                          className={styles.submitButton}
                          onClick={handlePrepSave}
                          disabled={prepSaving}
                        >
                          {prepSaving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </>
                  ) : prepNotes ? (
                    <p className={styles.prepRendered} onClick={() => { setPrepDraft(prepNotes); setPrepEditing(true); }}>
                      {renderWithLinks(prepNotes)}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
