'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import DroppableColumn from './DroppableColumn';
import CompanyCard from '@/components/CompanyCard/CompanyCard';
import AddCompanyModal from '@/components/AddCompanyModal/AddCompanyModal';
import CompanyDetailModal from '@/components/CompanyDetailModal/CompanyDetailModal';
import OfferModal from '@/components/OfferModal/OfferModal';
import AISettingsModal from '@/components/AISettingsModal/AISettingsModal';
import DryRunConfigModal from '@/components/DryRunConfigModal/DryRunConfigModal';
import StatusPickerSheet from '@/components/StatusPickerSheet/StatusPickerSheet';
import type { ApplicationStatus, CompanyWithNextStep, KanbanBoard as KanbanBoardType } from '@/types';
import { COLUMNS, fetchBoard, patchStatus } from './helpers';
import { useToast } from '@/components/Toast/ToastProvider';
import { useAIKeyStatus } from '@/hooks/useAIKeyStatus';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import styles from './KanbanBoard.module.css';

export default function KanbanBoard() {
  const { toast } = useToast();
  const hasAIKey = useAIKeyStatus();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const [board, setBoard] = useState<KanbanBoardType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showDryRun, setShowDryRun] = useState(false);
  const [activeCard, setActiveCard] = useState<CompanyWithNextStep | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithNextStep | null>(null);
  const [offerModalCompany, setOfferModalCompany] = useState<CompanyWithNextStep | null>(null);
  const [statusPickerCompany, setStatusPickerCompany] = useState<CompanyWithNextStep | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: isMobile ? Number.MAX_SAFE_INTEGER : 5 },
    })
  );

  useEffect(() => {
    async function load() {
      try {
        setBoard(await fetchBoard());
      } catch (err) {
        const message = (err as Error).message;
        setLoadError(message);
        toast(message);
      }
    }
    load();
  }, [toast]);

  const handleMoveCard = useCallback(async (company: CompanyWithNextStep, newStatus: ApplicationStatus) => {
    if (!board) return;
    const oldStatus = company.status;
    if (oldStatus === newStatus) return;

    const cardId = company.id;
    const snapshot = board;

    setBoard((prev) => {
      if (!prev) return prev;
      const updatedCard: CompanyWithNextStep = { ...company, status: newStatus };
      return {
        ...prev,
        [oldStatus]: prev[oldStatus].filter((c) => c.id !== cardId),
        [newStatus]: [updatedCard, ...prev[newStatus]],
      };
    });

    try {
      await patchStatus(cardId, newStatus);

      void (async () => {
        try {
          await fetch(`/api/companies/${cardId}/timeline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: 'status_change', title: oldStatus, body: newStatus }),
          });
        } catch { /* fire-and-forget */ }
      })();

      if (newStatus === 'Offer') {
        setOfferModalCompany({ ...company, status: 'Offer' });
      }
    } catch {
      setBoard(snapshot);
      toast('Failed to move card. Please try again.');
    }
  }, [board, toast]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as { company: CompanyWithNextStep } | undefined;
    if (data?.company) setActiveCard(data.company);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !board) return;

    const newStatus = over.id as ApplicationStatus;
    const data = active.data.current as { company: CompanyWithNextStep } | undefined;
    if (!data?.company) return;

    await handleMoveCard(data.company, newStatus);
  }, [board, handleMoveCard]);

  const handleCardClick = useCallback((company: CompanyWithNextStep) => {
    setSelectedCompany(company);
  }, []);

  if (loadError) return <p className={styles.error}>Failed to load board: {loadError}</p>;
  if (!board) return <p className={styles.loading}>Loading…</p>;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={styles.toolbar}>
        <button className={styles.settingsButton} onClick={() => setShowAISettings(true)} aria-label="AI Settings">
          ⚙<span className={styles.buttonLabel}> AI</span>
        </button>
        <span
          className={hasAIKey === false ? styles.disabledTooltip : undefined}
          data-tooltip={hasAIKey === false ? 'Add an API key in AI Settings to enable simulations' : undefined}
        >
          <button
            className={styles.practiceButton}
            onClick={() => setShowDryRun(true)}
            disabled={hasAIKey !== true}
            aria-label="Practice Interview"
          >
            🎤<span className={styles.buttonLabel}> Practice Interview</span>
          </button>
        </span>
        <button className={styles.addButton} onClick={() => setShowModal(true)} aria-label="Add Company">
          +<span className={styles.buttonLabel}> Add Company</span>
        </button>
      </div>
      <section className={styles.board}>
        {COLUMNS.map((status) => (
          <DroppableColumn
            key={status}
            status={status}
            cards={board[status]}
            onCardClick={handleCardClick}
            isMobile={isMobile}
            onMoveCard={handleMoveCard}
            onLongPress={setStatusPickerCompany}
          />
        ))}
      </section>
      <DragOverlay dropAnimation={null}>
        {activeCard ? <CompanyCard company={activeCard} /> : null}
      </DragOverlay>
      {showModal && (
        <AddCompanyModal
          onClose={() => setShowModal(false)}
          onCreated={async () => {
            setShowModal(false);
            try {
              setBoard(await fetchBoard());
            } catch (err) {
              toast((err as Error).message);
            }
          }}
        />
      )}
      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onDeleted={(id) => {
            setSelectedCompany(null);
            setBoard((prev) => {
              if (!prev) return prev;
              const status = selectedCompany.status;
              return { ...prev, [status]: prev[status].filter((company) => company.id !== id) };
            });
          }}
          onUpdated={(updated) => {
            setSelectedCompany(updated);
            setBoard((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                [updated.status]: prev[updated.status].map((company) => company.id === updated.id ? updated : company),
              };
            });
          }}
        />
      )}
      {offerModalCompany && (
        <OfferModal
          company={offerModalCompany}
          onSaved={() => setOfferModalCompany(null)}
          onSkip={() => setOfferModalCompany(null)}
        />
      )}
      {showAISettings && (
        <AISettingsModal onClose={() => setShowAISettings(false)} />
      )}
      {showDryRun && (
        <DryRunConfigModal onClose={() => setShowDryRun(false)} />
      )}
      {statusPickerCompany && (
        <StatusPickerSheet
          company={statusPickerCompany}
          onSelect={(newStatus) => {
            void handleMoveCard(statusPickerCompany, newStatus);
            setStatusPickerCompany(null);
          }}
          onClose={() => setStatusPickerCompany(null)}
        />
      )}
    </DndContext>
  );
}
