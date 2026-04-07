'use client';

import { useEffect, useRef, useState } from 'react';
import type { ApplicationStatus } from '@/types';
import { STATUSES } from './helpers';
import { useToast } from '@/components/Toast/ToastProvider';
import { useTranslations } from 'next-intl';
import styles from './AddCompanyModal.module.css';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function AddCompanyModal({ onClose, onCreated }: Props) {
  const { toast } = useToast();
  const t = useTranslations('addCompany');
  const tStatuses = useTranslations('statuses');
  const tCommon = useTranslations('common');
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Wishlist');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus name input on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError(t('nameRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logo_url: logoUrl || null, status }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('nameRequired');
      setError(message);
      toast(message);
      setSubmitting(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className={styles.title}>{t('title')}</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="company-name" className={styles.label}>
              {t('nameLabel')} <span className={styles.required}>*</span>
            </label>
            <input
              ref={nameRef}
              id="company-name"
              type="text"
              className={styles.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('namePlaceholder')}
              disabled={submitting}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="logo-url" className={styles.label}>
              {t('logoLabel')} <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="logo-url"
              type="url"
              className={styles.input}
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder={t('logoPlaceholder')}
              disabled={submitting}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="status" className={styles.label}>{t('statusLabel')}</label>
            <select
              id="status"
              className={styles.select}
              value={status}
              onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
              disabled={submitting}
            >
              {STATUSES.map((statusOption) => (
                <option key={statusOption} value={statusOption}>{tStatuses(statusOption)}</option>
              ))}
            </select>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={submitting}
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? t('submitting') : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
