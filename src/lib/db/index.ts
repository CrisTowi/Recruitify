import type { DbAdapter } from './types';

export type { DbAdapter, GoogleTokens } from './types';
export { DuplicateCalendarEventError } from './types';

export async function getDb(req?: Request): Promise<DbAdapter> {
  if (process.env.STORAGE_MODE === 'sqlite') {
    const { SqliteAdapter } = await import('./sqlite-adapter');
    return new SqliteAdapter();
  }

  // Default: Supabase mode
  const { SupabaseAdapter } = await import('./supabase-adapter');
  return new SupabaseAdapter(req);
}
