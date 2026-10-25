import type { ReactNode } from 'react';

/**
 * What a screen shows before there is anything on it.
 *
 * Deliberately a first-class component: an agency's first week is spent
 * entirely in empty states, and the PRD's activation target is 10 units
 * imported within 7 days (§4.4). An empty screen that says what to do next is
 * the difference between importing and giving up.
 */
export const EmptyState = ({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode | undefined;
}) => (
  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
    <h3 className="font-display text-lg text-text">{title}</h3>
    <p className="max-w-prose text-sm text-muted">{description}</p>
    {action !== undefined && <div className="mt-2">{action}</div>}
  </div>
);
