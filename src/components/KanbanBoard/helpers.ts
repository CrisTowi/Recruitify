import type { ApplicationStatus, KanbanBoard as KanbanBoardType } from '@/types';

export const COLUMNS: ApplicationStatus[] = ['Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Ghosted'];

export function fetchBoard(): Promise<KanbanBoardType> {
  return fetch('/api/companies').then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<KanbanBoardType>;
  });
}

export async function patchStatus(id: string, status: ApplicationStatus): Promise<void> {
  const res = await fetch(`/api/companies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
}
