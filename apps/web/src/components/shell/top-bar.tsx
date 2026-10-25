import { Badge } from '../ui/badge';
import { statusLabel } from '../ui/badge';
import { ThemeToggle } from './theme-toggle';

export const TopBar = ({
  userLabel,
  role,
}: {
  readonly userLabel: string;
  readonly role: string;
}) => (
  <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">
    <div className="flex items-center gap-3">
      <span className="text-sm text-text">{userLabel}</span>
      <Badge tone="info">{statusLabel(role)}</Badge>
    </div>
    <ThemeToggle />
  </header>
);
