'use client';

import { useState } from 'react';
import type { InterviewStage, TimelineEvent } from '@/types';
import styles from './CompanyDetailModal.module.css';

export default function StageItem({
  stage, companyId, onUpdated, onDeleted, onTimelineCreated,
}: {
  stage: InterviewStage;
  companyId: string;
  onUpdated: (s: InterviewStage) => void;
  onDeleted: (id: string) => void;
  onTimelineCreated: (e: TimelineEvent) => void;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(stage.notes ?? '');
  const [notesSaving, setNotesSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(stage.stage_name);
  const [editDate, setEditDate] = useState(stage.scheduled_date ?? '');
  const [editSaving, setEditSaving] = useState(false);

  const [completing, setCompleting] = useState(false);
  const [completeNote, setCompleteNote] = useState('');
  const [completeSaving, setCompleteSaving] = useState(false);

  async function handleCheckboxClick() {
    if (stage.is_completed) {
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
