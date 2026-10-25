'use client';

import { useEffect, useState } from 'react';

import { applyTheme, storedTheme, type ThemePreference } from '../../lib/theme';

const OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export const ThemeToggle = () => {
  // Starts as 'system' and corrects after mount: the stored value lives in
  // localStorage, which the server cannot read. The inline script in the head
  // has already stamped the attribute, so there is no flash — only this
  // control's own highlight settles a moment later.
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    setPreference(storedTheme());
  }, []);

  const choose = (next: ThemePreference) => {
    setPreference(next);
    applyTheme(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-md border border-border bg-surface p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={preference === option.value}
          onClick={() => choose(option.value)}
          className={
            preference === option.value
              ? 'rounded px-2.5 py-1 text-xs font-medium bg-primary-soft text-info-text'
              : 'rounded px-2.5 py-1 text-xs text-muted hover:text-text'
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
