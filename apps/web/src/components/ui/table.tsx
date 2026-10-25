import { clsx } from 'clsx';
import type { ReactNode } from 'react';

/**
 * A data table.
 *
 * Wrapped in its own horizontally scrolling container: a rent roll has more
 * columns than a phone has width, and the alternative — the page itself
 * scrolling sideways — makes every other screen harder to use. PRD §12 asks
 * for large lists to paginate and for the UI to work on small screens.
 *
 * Numeric columns are right-aligned with tabular figures, because a column of
 * naira amounts is scanned down rather than read across.
 */
export const Table = ({
  caption,
  children,
}: {
  readonly caption: string;
  readonly children: ReactNode;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
      {/* Always present, visually hidden: a table with no accessible name is
          unidentifiable to a screen reader moving between several of them. */}
      <caption className="sr-only">{caption}</caption>
      {children}
    </table>
  </div>
);

export const Th = ({
  children,
  numeric = false,
}: {
  readonly children: ReactNode;
  readonly numeric?: boolean | undefined;
}) => (
  <th
    scope="col"
    className={clsx(
      'border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-subtle',
      numeric && 'text-right',
    )}
  >
    {children}
  </th>
);

export const Td = ({
  children,
  numeric = false,
}: {
  readonly children: ReactNode;
  readonly numeric?: boolean | undefined;
}) => (
  <td
    className={clsx(
      'border-b border-border px-3 py-2.5 text-text',
      numeric && 'tabular text-right',
    )}
  >
    {children}
  </td>
);

export const TableEmpty = ({
  colSpan,
  message,
}: {
  readonly colSpan: number;
  readonly message: string;
}) => (
  <tr>
    <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-muted">
      {message}
    </td>
  </tr>
);
