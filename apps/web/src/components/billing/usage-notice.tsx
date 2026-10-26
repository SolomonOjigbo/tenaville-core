import { shouldPrompt, warningHeadline, type UsageWarning } from '@tenaville/core/billing';

import { Money } from '../ui';

/**
 * The 80% and 100% prompt (BILL-3 §3.7, TV-148).
 *
 * Renders nothing when there is nothing to say. A banner that is always there
 * is a banner nobody reads, and §3.7 asks for a prompt at two specific points
 * rather than a permanent reminder of how big the plan is.
 *
 * The band comes from the database so that this and a reminder email cannot
 * disagree about what "nearly full" means.
 */
export const UsageNotice = ({
  warnings,
  only,
}: {
  readonly warnings: readonly UsageWarning[];
  /** Limit the notice to one metric, for a page about that one thing. */
  readonly only?: UsageWarning['metric'] | undefined;
}) => {
  const worth = warnings
    .filter((warning) => only === undefined || warning.metric === only)
    .filter(shouldPrompt);

  if (worth.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {worth.map((warning) => (
        <p
          key={warning.metric}
          className={
            warning.band === 'reached'
              ? 'rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text'
              : 'rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-text'
          }
        >
          {warningHeadline(warning)}
          {warning.overageKobo !== null && warning.band === 'reached' && (
            <>
              {' '}
              <Money kobo={warning.overageKobo.toString()} /> each.
            </>
          )}
        </p>
      ))}
    </div>
  );
};
