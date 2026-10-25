import type { ReactNode } from 'react';

/**
 * The unauthenticated shell: one centred card, nothing else.
 *
 * No navigation, because there is nowhere to go yet, and no product chrome to
 * imply otherwise.
 */
export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="font-display text-2xl text-text">Tenaville</p>
          <p className="mt-1 text-sm text-muted">Property management for Nigerian agencies</p>
        </div>
        {children}
      </div>
    </main>
  );
}
