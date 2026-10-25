import { clsx } from 'clsx';
import { formatNaira, fromTransport } from '@tenaville/money';

/**
 * A naira amount.
 *
 * Takes integer kobo as a transport string and formats it through
 * @tenaville/money — never by the component, so one rounding and grouping rule
 * applies everywhere (ADR 0003). Tabular figures because amounts are read as a
 * column.
 */
export const Money = ({
  kobo,
  className,
  symbol = true,
  tone = 'default',
}: {
  readonly kobo: string;
  readonly className?: string;
  readonly symbol?: boolean;
  /** `owed` for arrears, `paid` for settled amounts. */
  readonly tone?: 'default' | 'owed' | 'paid';
}) => {
  const amount = fromTransport(kobo);
  const tones = {
    default: 'text-text',
    owed: amount > 0n ? 'text-danger-text' : 'text-muted',
    paid: 'text-success-text',
  } as const;

  return (
    <span className={clsx('tabular', tones[tone], className)}>
      {formatNaira(amount, { symbol })}
    </span>
  );
};
