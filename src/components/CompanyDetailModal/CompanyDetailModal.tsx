'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  CompanyWithNextStep,
  InterviewStage,
  TimelineEvent,
  CompanyOffer,
  InterestLevel,
} from '@/types';
import { INTEREST_LEVELS } from '@/types';
import styles from './CompanyDetailModal.module.css';
import { renderWithLinks, formatDate, EVENT_TYPE_LABELS } from './helpers';
import NoteItem from './NoteItem';
import ContactItem from './ContactItem';
import AppointmentItem from './AppointmentItem';
import ProcessStatusItem from './ProcessStatusItem';
import StatusChangeItem from './StatusChangeItem';
import TimelineItemEditForm from './TimelineItemEditForm';
import AddEntryForm from './AddEntryForm';
import StageAddForm from './StageAddForm';
import StageItem from './StageItem';
import OfferSection from './OfferSection';

interface Props {
  company: CompanyWithNextStep;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onUpdated: (updated: CompanyWithNextStep) => void;
}

export default function CompanyDetailModal({ company, onClose, onDeleted, onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'stages' | 'offer'>('timeline');
  const [stages, setStages] = useState<InterviewStage[]>([]);
  const [offer, setOffer] = useState<CompanyOffer | null>(null);
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
      fetch(`/api/companies/${company.id}/offer`).then((r) => {
        if (!r.ok) return null;
        return r.json() as Promise<CompanyOffer | null>;
      }),
    ])
      .then(([roadmap, timeline, offerData]) => {
        setStages(roadmap);
        setEvents(timeline);
        setOffer(offerData);
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
          <button
            className={`${styles.tab} ${activeTab === 'offer' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('offer')}
          >
            Offer{offer && <span className={styles.tabCount}>✓</span>}
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

          {activeTab === 'offer' && (
            <OfferSection
              companyId={company.id}
              offer={offer}
              onUpdated={setOffer}
            />
          )}

          {activeTab === 'stages' && (
            <div className={styles.roadmapSection}>
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
