'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAIKeyStatus } from '@/hooks/useAIKeyStatus';
import type {
  CompanyWithNextStep,
  InterviewStage,
  TimelineEvent,
  CompanyOffer,
  InterestLevel,
} from '@/types';
import { INTEREST_LEVELS } from '@/types';
import styles from './CompanyDetailModal.module.css';
import { renderWithLinks, formatDate, EVENT_TYPE_TRANSLATION_KEYS } from './helpers';
import { useToast } from '@/components/Toast/ToastProvider';
import { useTranslations, useLocale } from 'next-intl';
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
import SimulationConfigModal from '@/components/SimulationConfigModal/SimulationConfigModal';
import SessionHistory from '@/components/SessionHistory/SessionHistory';

interface Props {
  company: CompanyWithNextStep;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onUpdated: (updated: CompanyWithNextStep) => void;
}

export default function CompanyDetailModal({ company, onClose, onDeleted, onUpdated }: Props) {
  const { toast } = useToast();
  const t = useTranslations('companyDetail');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const hasAIKey = useAIKeyStatus();
  const [activeTab, setActiveTab] = useState<'timeline' | 'stages' | 'offer' | 'simulations'>('timeline');
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
  const [simulatingStage, setSimulatingStage] = useState<InterviewStage | null>(null);
  const [interestLevel, setInterestLevel] = useState<InterestLevel | null>(company.interest_level);
  const [savingInterest, setSavingInterest] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [roadmap, timeline, offerData] = await Promise.all([
          (async () => {
            const r = await fetch(`/api/companies/${company.id}/roadmap`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json() as Promise<InterviewStage[]>;
          })(),
          (async () => {
            const r = await fetch(`/api/companies/${company.id}/timeline`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json() as Promise<TimelineEvent[]>;
          })(),
          (async () => {
            const r = await fetch(`/api/companies/${company.id}/offer`);
            if (!r.ok) return null;
            return r.json() as Promise<CompanyOffer | null>;
          })(),
        ]);
        setStages(roadmap);
        setEvents(timeline);
        setOffer(offerData);
      } catch (err) {
        const message = (err as Error).message;
        setFetchError(message);
        toast(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [company.id, toast]);

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
      toast(t('failedToUpdateInterest'));
    } finally {
      setSavingInterest(false);
    }
  }, [company, interestLevel, onUpdated, toast, t]);

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setPrepNotes(prepDraft);
      onUpdated({ ...company, prep_notes: updated.prep_notes });
      setPrepEditing(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      setPrepSaving(false);
    }
  }, [company, prepDraft, onUpdated, toast]);

  const handlePrepCancel = useCallback(() => {
    setPrepDraft(prepNotes);
    setPrepEditing(false);
  }, [prepNotes]);

  const handleSaved = useCallback((updated: TimelineEvent) => {
    setEvents((prev) => prev.map((entry) => entry.id === updated.id ? updated : entry));
    setEditingId(null);
  }, []);

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    const res = await fetch(`/api/companies/${company.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDeleted(company.id);
    } else {
      toast(t('failedToDelete'));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const { name, logo_url, status } = company;

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
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
              {deleting ? t('deleting') : confirmDelete ? t('confirmDelete') : t('delete')}
            </button>
            <button
              ref={closeButtonRef}
              className={styles.closeButton}
              onClick={onClose}
              aria-label={tCommon('close')}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Interest level selector */}
        <div className={styles.interestBar}>
          <span className={styles.interestLabel}>{t('interest')}</span>
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
            {t('tabTimeline')}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'stages' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('stages')}
          >
            {t('tabStages')}{stages.length > 0 && <span className={styles.tabCount}>{stages.length}</span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'offer' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('offer')}
          >
            {t('tabOffer')}{offer && <span className={styles.tabCount}>✓</span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'simulations' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('simulations')}
          >
            {t('tabSimulations')}
          </button>
        </div>

        {/* Scrollable body */}
        <div className={styles.modalBody}>
          {activeTab === 'timeline' && (
            <>
              <AddEntryForm companyId={company.id} onCreated={handleCreated} />

              <div className={styles.timelineSection}>
                <h3 className={styles.timelineSectionTitle}>{t('timelineSection')}</h3>

                {loading && <p className={styles.timelineLoading}>{tCommon('loading')}</p>}
                {fetchError && <p className={styles.timelineError}>{t('failedToLoad', { error: fetchError })}</p>}
                {!loading && !fetchError && events.length === 0 && (
                  <p className={styles.timelineEmpty}>{t('noEntries')}</p>
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
                              {t(EVENT_TYPE_TRANSLATION_KEYS[event.event_type] as Parameters<typeof t>[0])}
                            </span>
                            <div className={styles.itemHeaderRight}>
                              <time className={styles.eventDate} dateTime={event.created_at}>
                                {formatDate(event.created_at, locale)}
                              </time>
                              {event.event_type !== 'status_change' && editingId !== event.id && (
                                <button
                                  className={styles.editButton}
                                  onClick={() => setEditingId(event.id)}
                                >
                                  {tCommon('edit')}
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

          {activeTab === 'simulations' && (
            <div className={styles.roadmapSection}>
              <SessionHistory companyId={company.id} />
            </div>
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
              <StageAddForm companyId={company.id} onCreated={(stage) => setStages((prev) => [...prev, stage])} />

              {loading && <p className={styles.timelineLoading}>{tCommon('loading')}</p>}
              {!loading && stages.length === 0 && (
                <p className={styles.timelineEmpty}>{t('noStages')}</p>
              )}
              {!loading && stages.length > 0 && (
                <ol className={styles.roadmap}>
                  {stages.map((stage) => (
                    <StageItem
                      key={stage.id}
                      stage={stage}
                      companyId={company.id}
                      onUpdated={(updated) => setStages((prev) => prev.map((stage) => stage.id === updated.id ? updated : stage))}
                      onDeleted={(id) => setStages((prev) => prev.filter((stage) => stage.id !== id))}
                      onTimelineCreated={handleCreated}
                      onSimulate={setSimulatingStage}
                      hasAIKey={hasAIKey}
                    />
                  ))}
                </ol>
              )}

              {!loading && (
                <div className={styles.prepSection}>
                  <div className={styles.prepHeader}>
                    <span className={styles.prepLabel}>{t('prepNotes')}</span>
                    {!prepEditing && (
                      <button
                        className={styles.prepEditButton}
                        onClick={() => { setPrepDraft(prepNotes); setPrepEditing(true); }}
                      >
                        {prepNotes ? tCommon('edit') : t('addNotes')}
                      </button>
                    )}
                  </div>

                  {prepEditing ? (
                    <>
                      <textarea
                        className={styles.prepTextarea}
                        value={prepDraft}
                        onChange={(event) => setPrepDraft(event.target.value)}
                        placeholder={t('prepPlaceholder')}
                        rows={6}
                        autoFocus
                      />
                      <div className={styles.prepActions}>
                        <button
                          className={styles.cancelButton}
                          onClick={handlePrepCancel}
                          disabled={prepSaving}
                        >
                          {tCommon('cancel')}
                        </button>
                        <button
                          className={styles.submitButton}
                          onClick={handlePrepSave}
                          disabled={prepSaving}
                        >
                          {prepSaving ? tCommon('saving') : tCommon('save')}
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

      {simulatingStage && (
        <SimulationConfigModal
          company={company}
          stage={simulatingStage}
          onClose={() => setSimulatingStage(null)}
        />
      )}
    </div>
  );
}
