import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export const Card = ({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) => (
  <div className={clsx('rounded-lg border border-border bg-surface shadow-sm', className)}>
    {children}
  </div>
);

export const CardHeader = ({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
    <div>
      <h2 className="font-display text-lg text-text">{title}</h2>
      {description !== undefined && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
    {action}
  </div>
);

export const CardBody = ({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) => <div className={clsx('px-5 py-4', className)}>{children}</div>;
