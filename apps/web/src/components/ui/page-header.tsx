import type { ReactNode } from 'react';

export const PageHeader = ({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}) => (
  <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 className="font-display text-2xl text-text">{title}</h1>
      {description !== undefined && (
        <p className="mt-1 max-w-prose text-sm text-muted">{description}</p>
      )}
    </div>
    {action}
  </header>
);
