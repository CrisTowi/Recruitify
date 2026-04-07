import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import messages from '../../messages/en.json';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <ToastProvider>{children}</ToastProvider>
    </NextIntlClientProvider>
  );
}

export function renderWithProviders(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Wrapper, ...options });
}
