'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Props {
  authEnabled: boolean;
  showNav: boolean;
  showSignOut: boolean;
}

export default function SiteHeader({ authEnabled, showNav, showSignOut }: Props) {
  const t = useTranslations('nav');

  return (
    <header className="site-header">
      <span className="site-logo">Recruitify</span>
      {showNav && (
        <nav className="site-nav">
          <Link href="/" className="site-nav-link">{t('board')}</Link>
          <Link href="/compare" className="site-nav-link">{t('compareOffers')}</Link>
          <Link href="/profile" className="site-nav-link">{t('profile')}</Link>
        </nav>
      )}
      {authEnabled && showSignOut && (
        <form action="/api/auth/signout" method="POST" className="signout-form">
          <button type="submit" className="signout-button">
            {t('signOut')}
          </button>
        </form>
      )}
    </header>
  );
}
