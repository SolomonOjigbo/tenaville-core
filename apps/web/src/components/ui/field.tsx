import { clsx } from 'clsx';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

const controlClasses = (invalid: boolean) =>
  clsx(
    'w-full rounded-md border bg-surface px-3 text-base text-text',
    // 44px: the kit's touch target. A field a caretaker cannot hit on a phone
    // is a field that does not get filled in (PRD principle 6).
    'min-h-[44px]',
    'placeholder:text-subtle disabled:cursor-not-allowed disabled:opacity-50',
    invalid ? 'border-danger' : 'border-border',
  );

/**
 * A labelled form control.
 *
 * The label is always rendered and always tied to the control by id — a
 * placeholder is not a label, and a form whose fields are only identified by
 * placeholder is unusable once a value is typed and unusable to a screen reader
 * throughout (PRD §12).
 *
 * `error` is rendered with `role="alert"` and referenced by `aria-describedby`,
 * so validation reaches assistive technology instead of only appearing in red.
 */
export const Field = ({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly children: ReactNode;
}) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium text-text">
      {label}
      {required === true && (
        <span className="ml-1 text-danger-text" aria-hidden="true">
          *
        </span>
      )}
    </label>
    {hint !== undefined && (
      <p id={`${id}-hint`} className="text-xs text-subtle">
        {hint}
      </p>
    )}
    {children}
    {error !== undefined && (
      <p id={`${id}-error`} role="alert" className="text-xs text-danger-text">
        {error}
      </p>
    )}
  </div>
);

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  readonly id: string;
  readonly invalid?: boolean;
  readonly describedBy?: string;
}

export const TextInput = ({
  id,
  invalid = false,
  describedBy,
  className,
  ...rest
}: TextInputProps) => (
  <input
    id={id}
    aria-invalid={invalid || undefined}
    aria-describedby={describedBy}
    className={clsx(controlClasses(invalid), className)}
    {...rest}
  />
);

/**
 * A naira amount field.
 *
 * `inputMode="decimal"` brings up a numeric keypad on a phone, and the value is
 * parsed by @tenaville/money rather than by the component — the same rule that
 * keeps formatting in one place (ADR 0003). Tabular figures so a typed amount
 * lines up with the ones displayed around it.
 */
export const MoneyInput = ({
  id,
  invalid = false,
  describedBy,
  className,
  ...rest
}: TextInputProps) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
      ₦
    </span>
    <input
      id={id}
      inputMode="decimal"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={clsx(controlClasses(invalid), 'tabular pl-7', className)}
      {...rest}
    />
  </div>
);

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  readonly id: string;
  readonly invalid?: boolean;
  readonly describedBy?: string;
  readonly children: ReactNode;
}

export const Select = ({
  id,
  invalid = false,
  describedBy,
  className,
  children,
  ...rest
}: SelectProps) => (
  <select
    id={id}
    aria-invalid={invalid || undefined}
    aria-describedby={describedBy}
    className={clsx(controlClasses(invalid), 'pr-8', className)}
    {...rest}
  >
    {children}
  </select>
);
