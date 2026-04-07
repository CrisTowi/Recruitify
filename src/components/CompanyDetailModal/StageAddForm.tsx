'use client';

import { useState } from 'react';
import type { InterviewStage } from '@/types';
import { useTranslations } from 'next-intl';
import styles from './CompanyDetailModal.module.css';

export default function StageAddForm({ companyId, onCreated }: { companyId: string; onCreated: (s: InterviewStage) => void }) {
  const t = useTranslations('companyDetail');
  const tCommon = useTranslations('common');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
        onChange={(event) => setName(event.target.value)}
        placeholder={t('stageNamePlaceholder')}
        disabled={submitting}
      />
      <input
        className={styles.stageAddDate}
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        disabled={submitting}
        title={tCommon('optional')}
      />
      <button className={styles.submitButton} type="submit" disabled={submitting || !name.trim()}>
        {submitting ? tCommon('adding') : tCommon('add')}
      </button>
    </form>
  );
}
