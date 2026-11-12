/**
 * The staff shell's loading state.
 *
 * A skeleton rather than a spinner: the shape of the screen arrives before its
 * data, so the page does not jump when the numbers land. It is announced to
 * assistive technology once, not per block.
 */
export default function StaffLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded bg-surface2" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-surface2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <div className="h-3 w-24 animate-pulse rounded bg-surface2" />
            <div className="mt-3 h-6 w-32 animate-pulse rounded bg-surface2" />
            <div className="mt-3 h-3 w-40 animate-pulse rounded bg-surface2" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <div className="h-5 w-40 animate-pulse rounded bg-surface2" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }, (_, row) => (
                <div key={row} className="h-4 w-full animate-pulse rounded bg-surface2" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
