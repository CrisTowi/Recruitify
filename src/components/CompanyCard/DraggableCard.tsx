'use client';

import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import CompanyCard from './CompanyCard';
import type { ApplicationStatus, CompanyWithNextStep, DraggableCardData } from '@/types';
import { COLUMNS } from '@/components/KanbanBoard/helpers';
import styles from './DraggableCard.module.css';

interface Props {
  company: CompanyWithNextStep;
  onCardClick?: (company: CompanyWithNextStep) => void;
  isMobile?: boolean;
  onMoveCard?: (company: CompanyWithNextStep, newStatus: ApplicationStatus) => void;
  onLongPress?: (company: CompanyWithNextStep) => void;
}

export default function DraggableCard({ company, onCardClick, isMobile, onMoveCard, onLongPress }: Props) {
  const data: DraggableCardData = { type: 'card', company };
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: company.id,
    data,
    disabled: isMobile,
  });

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPress = useRef(false);

  const currentIndex = COLUMNS.indexOf(company.status);
  const prevStatus = currentIndex > 0 ? COLUMNS[currentIndex - 1] : null;
  const nextStatus = currentIndex < COLUMNS.length - 1 ? COLUMNS[currentIndex + 1] : null;

  function handleTouchStart() {
    if (!onLongPress) return;
    wasLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      wasLongPress.current = true;
      onLongPress(company);
    }, 500);
  }

  function handleTouchMove() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleClick() {
    if (wasLongPress.current) {
      wasLongPress.current = false;
      return;
    }
    onCardClick?.(company);
  }

  if (isMobile) {
    return (
      <div
        className={styles.wrapperMobile}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <CompanyCard
          company={company}
          onMoveLeft={prevStatus && onMoveCard ? () => onMoveCard(company, prevStatus) : undefined}
          onMoveRight={nextStatus && onMoveCard ? () => onMoveCard(company, nextStatus) : undefined}
          prevLabel={prevStatus ?? undefined}
          nextLabel={nextStatus ?? undefined}
        />
      </div>
    );
  }

  const style = transform ? { transform: CSS.Transform.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${styles.wrapper} ${isDragging ? styles.dragging : ''}`}
      onClick={onCardClick ? () => onCardClick(company) : undefined}
    >
      <CompanyCard company={company} />
    </div>
  );
}
