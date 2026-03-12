'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import styles from './ToastProvider.module.css';

export type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toastItem) => toastItem.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((toastItem) => toastItem.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className={styles.container} aria-live="polite" aria-atomic="false">
        {toasts.map((toastItem) => (
          <div key={toastItem.id} className={`${styles.toast} ${styles[toastItem.type]}`} role="alert">
            <span className={styles.message}>{toastItem.message}</span>
            <button
              className={styles.dismiss}
              onClick={() => dismiss(toastItem.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
