import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { ToastProvider } from '@/components/Toast/ToastProvider';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

export function renderWithProviders(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Wrapper, ...options });
}
