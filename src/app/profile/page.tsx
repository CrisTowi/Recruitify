import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import ProfileSettings from '@/components/ProfileSettings/ProfileSettings';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'en';

  let savedLanguage = locale;
  try {
    const db = await getDb();
    const prefs = await db.getUserPreferences();
    savedLanguage = prefs.language;
  } catch {
    // Fall back to cookie locale if DB fails
  }

  return <ProfileSettings initialLanguage={savedLanguage} />;
}
