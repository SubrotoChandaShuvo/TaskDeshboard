import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TaskFlow | PostgreSQL Task Management Dashboard',
  description:
    'Full-stack Task Management Dashboard with PostgreSQL database persistence, real-time filters, sorting, search, and responsive modern UI.',
  keywords: ['Task Management', 'PostgreSQL', 'Next.js', 'Dashboard', 'REST API'],
  authors: [{ name: 'Engineering Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0d14',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
