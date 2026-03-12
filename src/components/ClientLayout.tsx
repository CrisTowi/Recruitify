'use client';

import { ToastProvider } from './Toast/ToastProvider';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
