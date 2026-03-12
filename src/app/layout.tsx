import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import ClientLayout from '@/components/ClientLayout';
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
          {(!authEnabled || user) && (
            <nav className="site-nav">
              <Link href="/" className="site-nav-link">Board</Link>
              <Link href="/compare" className="site-nav-link">Compare Offers</Link>
            </nav>
          )}
          {authEnabled && user && (
            <form action="/api/auth/signout" method="POST" className="signout-form">
              <button type="submit" className="signout-button">
                Sign out
              </button>
            </form>
          )}
        </header>
        <ClientLayout>
          <main>{children}</main>
        </ClientLayout>
      </body>
    </html>
  );
}
