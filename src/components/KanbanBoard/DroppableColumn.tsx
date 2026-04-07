'use client';

import { useDroppable } from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import DraggableCard from '@/components/CompanyCard/DraggableCard';
import type { ApplicationStatus, CompanyWithNextStep, DroppableColumnData } from '@/types';
import styles from './KanbanBoard.module.css';

interface Props {
  status: ApplicationStatus;
  cards: CompanyWithNextStep[];
  onCardClick: (company: CompanyWithNextStep) => void;
  isMobile?: boolean;
  onMoveCard?: (company: CompanyWithNextStep, newStatus: ApplicationStatus) => void;
  onLongPress?: (company: CompanyWithNextStep) => void;
}

export default function DroppableColumn({ status, cards, onCardClick, isMobile, onMoveCard, onLongPress }: Props) {
  const data: DroppableColumnData = { type: 'column', status };
  const { setNodeRef, isOver } = useDroppable({ id: status, data });
  const tStatuses = useTranslations('statuses');
  const tBoard = useTranslations('board');

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <span className={styles.columnDot} data-status={status.toLowerCase()} />
        <h2 className={styles.columnTitle}>{tStatuses(status)}</h2>
        <span className={styles.columnCount}>{cards.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`${styles.cardList} ${isOver ? styles.cardListOver : ''}`}
      >
        {cards.length === 0 ? (
          <p className={styles.empty}>{tBoard('noCompanies')}</p>
        ) : (
          cards.map((company) => (
            <DraggableCard
              key={company.id}
              company={company}
              onCardClick={onCardClick}
              isMobile={isMobile}
              onMoveCard={onMoveCard}
              onLongPress={onLongPress}
            />
          ))
        )}
      </div>
    </div>
  );
}
