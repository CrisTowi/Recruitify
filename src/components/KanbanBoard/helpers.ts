import type { ApplicationStatus, KanbanBoard as KanbanBoardType } from '@/types';

export const COLUMNS: ApplicationStatus[] = ['Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Ghosted'];

export async function fetchBoard(): Promise<KanbanBoardType> {
  const res = await fetch('/api/companies');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<KanbanBoardType>;
}

export async function patchStatus(id: string, status: ApplicationStatus): Promise<void> {
  const res = await fetch(`/api/companies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    let json: { error?: string } = {};
    try { json = await res.json(); } catch { /* ignore */ }
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
}
