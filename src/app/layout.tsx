import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recruitify',
  description: 'Personal tech interview tracker — manage multiple processes in parallel.',
};

async function getAuthUser() {
  if (process.env.SUPABASE_AUTH !== 'true' || process.env.STORAGE_MODE === 'sqlite') {
    return null;
  }
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  const authEnabled = process.env.SUPABASE_AUTH === 'true' && process.env.STORAGE_MODE !== 'sqlite';

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <header className="site-header">
          <span className="site-logo">Recruitify</span>
          {authEnabled && user && (
            <form
              action="/api/auth/signout"
              method="POST"
              style={{ marginLeft: 'auto' }}
            >
              <button
                type="submit"
                style={{
                  background: 'none',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  padding: '6px 14px',
                  transition: 'border-color 0.15s ease, color 0.15s ease',
                }}
              >
                Sign out
              </button>
            </form>
          )}
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
