import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextIntlClientProvider } from 'next-intl';
import ClientLayout from '@/components/ClientLayout';
import SiteHeader from '@/components/SiteHeader/SiteHeader';
import { defaultLocale } from '@/i18n/routing';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recruitify',
  description: 'Personal tech interview tracker — manage multiple processes in parallel.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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

async function getLocaleMessages(locale: string) {
  try {
    return (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>;
  } catch {
    return (await import('../../messages/en.json')).default as Record<string, unknown>;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  const authEnabled = process.env.SUPABASE_AUTH === 'true' && process.env.STORAGE_MODE !== 'sqlite';

  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value ?? defaultLocale;
  const messages = await getLocaleMessages(locale);

  return (
    <html lang={locale}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteHeader
            authEnabled={authEnabled}
            showNav={!authEnabled || !!user}
            showSignOut={authEnabled && !!user}
          />
          <ClientLayout>
            <main>{children}</main>
          </ClientLayout>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
