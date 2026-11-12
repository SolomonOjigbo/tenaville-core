'use client';

import { useActionState, useEffect, useRef } from 'react';

import { Button, Field, LinkButton, MoneyInput, Select, TextInput } from '../ui';
import { PAYMENT_METHODS, paymentMethodLabel } from '../../lib/payments';
import { recordPaymentAction } from '../../server/payment-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface LeaseOption {
  readonly id: string;
  readonly label: string;
}

/**
 * Record money received (RENT-2, TV-022).
 *
 * Allocation is deliberately not editable here. The default rule — oldest
 * unpaid charge first — is the one agencies use for almost every payment, and
 * a manual split is a permissioned override (RENT-14) that belongs behind its
 * own screen rather than in the path a caretaker uses twenty times a day.
 */
export const RecordPaymentForm = ({
  leases,
  today,
}: {
  readonly leases: readonly LeaseOption[];
  readonly today: string;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(recordPaymentAction, {});
  const mutationRef = useRef<HTMLInputElement>(null);

  // A stable key for this form means a double-tapping caretaker on a slow
  // connection gets one payment, not two (PRD §10.5). Set after mount so the
  // server-rendered markup and the hydrated markup cannot disagree.
  useEffect(() => {
    if (mutationRef.current !== null && mutationRef.current.value === '') {
      mutationRef.current.value = globalThis.crypto?.randomUUID?.() ?? '';
    }
  }, []);

  return (
    <form action={action} className="space-y-4">
      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {state.error}
        </p>
      )}

      <input ref={mutationRef} type="hidden" name="clientMutationId" defaultValue="" />

      <Field
        id="payment-lease"
        label="Tenancy"
        required
        hint="Only active leases you can reach are listed."
        error={state.fieldErrors?.leaseId}
      >
        <Select
          id="payment-lease"
          name="leaseId"
          required
          defaultValue={leases[0]?.id ?? ''}
          invalid={state.fieldErrors?.leaseId !== undefined}
        >
          {leases.map((lease) => (
            <option key={lease.id} value={lease.id}>
              {lease.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="payment-amount"
          label="Amount received"
          required
          hint="Applied to the oldest unpaid charge first. Any excess is held as tenant credit."
          error={state.fieldErrors?.amount}
        >
          <MoneyInput
            id="payment-amount"
            name="amount"
            required
            placeholder="1,250,000.00"
            autoComplete="off"
            invalid={state.fieldErrors?.amount !== undefined}
          />
        </Field>

        <Field
          id="payment-method"
          label="How it was received"
          required
          error={state.fieldErrors?.method}
        >
          <Select
            id="payment-method"
            name="method"
            defaultValue="bank_transfer"
            invalid={state.fieldErrors?.method !== undefined}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {paymentMethodLabel(method)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          id="payment-date"
          label="Date received"
          required
          hint="The date the money changed hands, for the daily cash-up."
          error={state.fieldErrors?.paidOn}
        >
          <TextInput
            id="payment-date"
            name="paidOn"
            type="date"
            required
            defaultValue={today}
            invalid={state.fieldErrors?.paidOn !== undefined}
          />
        </Field>

        <Field
          id="payment-reference"
          label="Reference"
          hint="Teller number, transfer reference, or cheque number."
        >
          <TextInput
            id="payment-reference"
            name="reference"
            placeholder="e.g. GTB/2026/00418"
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Recording…' : 'Record payment and issue receipt'}
        </Button>
        <LinkButton href="/rent" variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
};
