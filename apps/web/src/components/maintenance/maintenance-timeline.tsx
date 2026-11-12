import { Badge } from '../ui';
import { formatDateTime } from '../../lib/format';

export interface MaintenanceEventView {
  readonly id: string;
  readonly kind: string;
  readonly actor_label: string | null;
  readonly body: string | null;
  readonly visible_to_tenant: boolean;
  readonly created_at: string;
}

/** The repair's activity timeline (MAINT-5). */
export const MaintenanceTimeline = ({
  events,
  showInternal = true,
}: {
  readonly events: readonly MaintenanceEventView[];
  readonly showInternal?: boolean;
}) => {
  const visible = showInternal ? events : events.filter((event) => event.visible_to_tenant);

  if (visible.length === 0) {
    return <p className="text-sm text-subtle">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {visible.map((event) => (
        <li key={event.id} className="relative border-l border-border pl-4">
          <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-accent" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{event.kind.replace(/_/g, ' ')}</Badge>
            {!event.visible_to_tenant && <Badge tone="warning">Internal</Badge>}
            <span className="text-xs text-subtle">{formatDateTime(event.created_at)}</span>
          </div>
          {event.body !== null && <p className="mt-1 text-sm text-text">{event.body}</p>}
          {event.actor_label !== null && (
            <p className="mt-0.5 text-xs text-subtle">{event.actor_label}</p>
          )}
        </li>
      ))}
    </ol>
  );
};
