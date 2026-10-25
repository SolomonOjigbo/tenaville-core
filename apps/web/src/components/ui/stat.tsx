import type { ReactNode } from 'react';

import { Card } from './card';

/**
 * A single portfolio figure.
 *
 * `hint` exists so a number can carry its own caveat — "excludes units marked
 * inactive" matters when the occupancy denominator is configurable (AN-3), and
 * a figure whose definition is invisible invites the wrong conclusion. AN-10
 * asks for metric definitions in the product for the same reason.
 */
export const Stat = ({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: ReactNode;
  readonly hint?: string | undefined;
}) => (
  <Card className="px-5 py-4">
    <p className="text-sm text-muted">{label}</p>
    <p className="mt-1 font-display text-2xl text-text">{value}</p>
    {hint !== undefined && <p className="mt-1 text-xs text-subtle">{hint}</p>}
  </Card>
);
