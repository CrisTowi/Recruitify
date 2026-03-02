'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import CompanyCard from './CompanyCard';
import type { CompanyWithNextStep, DraggableCardData } from '@/types';
import styles from './DraggableCard.module.css';

interface Props {
  company: CompanyWithNextStep;
  onCardClick?: (company: CompanyWithNextStep) => void;
}

export default function DraggableCard({ company, onCardClick }: Props) {
  const data: DraggableCardData = { type: 'card', company };
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: company.id,
    data,
  });

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
