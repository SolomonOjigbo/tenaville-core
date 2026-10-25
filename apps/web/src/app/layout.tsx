import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import { THEME_INIT_SCRIPT } from '../lib/theme';
import './globals.css';

const body = Inter({ subsets: ['latin'], variable: '--tv-font-body', display: 'swap' });
const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--tv-font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tenaville',
  description: 'Property management for Nigerian agencies, managers and landlords.',
  // PROP-9 and ADR 0007: no part of this product is a public surface.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // Both schemes are declared so the browser chrome matches the page in either.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F8FB' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1220' },
  ],
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <head>
        {/*
          Stamps data-theme before first paint. Without it the page renders in
          the default scheme and then flips, which is more jarring than either
          theme on its own. suppressHydrationWarning above is because this
          script legitimately changes the attribute the server rendered.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${body.variable} ${display.variable} bg-bg text-text antialiased`}>
        {children}
      </body>
    </html>
  );
}
