import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recruitify',
  description: 'Personal tech interview tracker — manage multiple processes in parallel.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <span className="site-logo">Recruitify</span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
