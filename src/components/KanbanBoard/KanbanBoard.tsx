'use client';

import { useEffect, useState } from 'react';
import CompanyCard from '@/components/CompanyCard/CompanyCard';
import type { ApplicationStatus, CompanyWithNextStep, KanbanBoard as KanbanBoardType } from '@/types';
import styles from './KanbanBoard.module.css';

const COLUMNS: ApplicationStatus[] = [
  'Wishlist',
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected',
  'Ghosted',
];

export default function KanbanBoard() {
  const [board, setBoard] = useState<KanbanBoardType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/companies')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<KanbanBoardType>;
      })
      .then(setBoard)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return <p className={styles.error}>Failed to load board: {error}</p>;
  }

  if (!board) {
    return <p className={styles.loading}>Loading…</p>;
  }

  return (
    <section className={styles.board}>
      {COLUMNS.map((status) => (
        <KanbanColumn key={status} status={status} cards={board[status]} />
      ))}
    </section>
  );
}

// ─── Column sub-component ─────────────────────────────────────────────────────

interface ColumnProps {
  status: ApplicationStatus;
  cards: CompanyWithNextStep[];
}

function KanbanColumn({ status, cards }: ColumnProps) {
  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <span
          className={styles.columnDot}
          data-status={status.toLowerCase()}
        />
        <h2 className={styles.columnTitle}>{status}</h2>
        <span className={styles.columnCount}>{cards.length}</span>
      </div>

      <div className={styles.cardList}>
        {cards.length === 0 ? (
          <p className={styles.empty}>No companies here yet.</p>
        ) : (
          cards.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
      </div>
    </div>
  );
}
