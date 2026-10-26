/**
 * How full an allowance is.
 *
 * Renders nothing for an unlimited allowance: a bar at 0% beside the word
 * "unlimited" reads as a fault rather than as freedom.
 *
 * The number is also written in text next to this bar by the page, because a
 * bar alone is unreadable to a screen reader and unreliable at a glance — and
 * because "10 of 10" is the sentence someone repeats on the phone to support.
 */
export const UsageBar = ({ percentage }: { readonly percentage: number | null }) => {
  if (percentage === null) return null;

  const tone = percentage >= 100 ? 'bg-danger' : percentage >= 80 ? 'bg-warning' : 'bg-accent';

  return (
    <span
      className="mt-2 block h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-border"
      role="presentation"
    >
      <span className={`block h-full rounded-full ${tone}`} style={{ width: `${percentage}%` }} />
    </span>
  );
};
