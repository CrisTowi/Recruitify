'use client';

import { useState } from 'react';
import type { InterviewStage } from '@/types';
import styles from './CompanyDetailModal.module.css';

export default function StageAddForm({ companyId, onCreated }: { companyId: string; onCreated: (s: InterviewStage) => void }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        onChange={(e) => setName(e.target.value)}
        placeholder="Stage name (e.g. Technical screen)"
        disabled={submitting}
      />
      <input
        className={styles.stageAddDate}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        disabled={submitting}
        title="Scheduled date (optional)"
      />
      <button className={styles.submitButton} type="submit" disabled={submitting || !name.trim()}>
        {submitting ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}
