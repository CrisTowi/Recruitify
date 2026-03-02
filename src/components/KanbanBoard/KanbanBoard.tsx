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
import type { ApplicationStatus, CompanyWithNextStep, KanbanBoard as KanbanBoardType } from '@/types';
import styles from './KanbanBoard.module.css';

const COLUMNS: ApplicationStatus[] = ['Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Ghosted'];

function fetchBoard(): Promise<KanbanBoardType> {
  return fetch('/api/companies').then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<KanbanBoardType>;
  });
}

async function patchStatus(id: string, status: ApplicationStatus): Promise<void> {
  const res = await fetch(`/api/companies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
}

export default function KanbanBoard() {
  const [board, setBoard] = useState<KanbanBoardType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeCard, setActiveCard] = useState<CompanyWithNextStep | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithNextStep | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetchBoard().then(setBoard).catch((err: Error) => setError(err.message));
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as { company: CompanyWithNextStep } | undefined;
    if (data?.company) setActiveCard(data.company);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !board) return;

    const newStatus = over.id as ApplicationStatus;
    const cardId = active.id as string;
    const data = active.data.current as { company: CompanyWithNextStep } | undefined;
    if (!data?.company) return;

    const oldStatus = data.company.status;
    if (oldStatus === newStatus) return;

    const snapshot = board;

    setBoard((prev) => {
      if (!prev) return prev;
      const updatedCard: CompanyWithNextStep = { ...data.company, status: newStatus };
      return {
        ...prev,
        [oldStatus]: prev[oldStatus].filter((c) => c.id !== cardId),
        [newStatus]: [updatedCard, ...prev[newStatus]],
      };
    });

    patchStatus(cardId, newStatus)
      .then(() => {
        fetch(`/api/companies/${cardId}/timeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'status_change',
            title: oldStatus,
            body: newStatus,
          }),
        }).catch(() => { /* fire-and-forget */ });
      })
      .catch(() => {
        setBoard(snapshot);
        setError('Failed to move card. Please try again.');
      });
  }, [board]);

  const handleCardClick = useCallback((company: CompanyWithNextStep) => {
    setSelectedCompany(company);
  }, []);

  if (error) return <p className={styles.error}>Failed to load board: {error}</p>;
  if (!board) return <p className={styles.loading}>Loading…</p>;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={styles.toolbar}>
        <button className={styles.addButton} onClick={() => setShowModal(true)}>
          + Add Company
        </button>
      </div>
      <section className={styles.board}>
        {COLUMNS.map((status) => (
          <DroppableColumn key={status} status={status} cards={board[status]} onCardClick={handleCardClick} />
        ))}
      </section>
      <DragOverlay dropAnimation={null}>
        {activeCard ? <CompanyCard company={activeCard} /> : null}
      </DragOverlay>
      {showModal && (
        <AddCompanyModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            fetchBoard().then(setBoard).catch((err: Error) => setError(err.message));
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
              return { ...prev, [status]: prev[status].filter((c) => c.id !== id) };
            });
          }}
          onUpdated={(updated) => {
            setSelectedCompany(updated);
            setBoard((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                [updated.status]: prev[updated.status].map((c) => c.id === updated.id ? updated : c),
              };
            });
          }}
        />
      )}
    </DndContext>
  );
}
