'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { Button, Field, LinkButton, MoneyInput, Select, TextInput } from '../ui';
import { PAYMENT_METHODS, paymentMethodLabel } from '../../lib/payments';
import { recordPaymentAction } from '../../server/payment-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface LeaseChargeOption {
  readonly id: string;
  readonly label: string;
  readonly outstandingLabel: string;
}

export interface LeaseOption {
  readonly id: string;
  readonly label: string;
  readonly charges: readonly LeaseChargeOption[];
}

/**
 * Record money received (RENT-2, TV-022).
 *
 * Allocation defaults to the oldest unpaid charge first, which is the rule
 * agencies use for almost every payment. A manual split is a permissioned
 * override (RENT-14) and stays collapsed: the person at the counter should not
 * meet six amount fields unless they went looking for them.
 */
export const RecordPaymentForm = ({
  leases,
  today,
  canOverride,
}: {
  readonly leases: readonly LeaseOption[];
  readonly today: string;
  readonly canOverride: boolean;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(recordPaymentAction, {});
  const mutationRef = useRef<HTMLInputElement>(null);
  const [selectedLeaseId, setSelectedLeaseId] = useState(leases[0]?.id ?? '');
  const [manual, setManual] = useState(false);

  // A stable key for this form means a double-tapping caretaker on a slow
  // connection gets one payment, not two (PRD §10.5). Set after mount so the
  // server-rendered markup and the hydrated markup cannot disagree.
  useEffect(() => {
    if (mutationRef.current !== null && mutationRef.current.value === '') {
      mutationRef.current.value = globalThis.crypto?.randomUUID?.() ?? '';
    }
  }, []);

  const selectedLease = leases.find((lease) => lease.id === selectedLeaseId) ?? leases[0];

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
          value={selectedLeaseId}
          onChange={(event) => setSelectedLeaseId(event.target.value)}
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

      {canOverride && (
        <div className="rounded-md border border-border p-4">
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={manual}
              onChange={(event) => setManual(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border"
            />
            <span>
              Allocate manually
              <span className="block text-xs text-muted">
                Overrides oldest-charge-first for this payment. Leave a row blank to let the
                remainder follow the default, and any unallocated balance becomes tenant credit.
              </span>
            </span>
          </label>

          {manual && (
            <div key={selectedLeaseId} className="mt-4 space-y-4">
              {selectedLease === undefined || selectedLease.charges.length === 0 ? (
                <p className="text-sm text-muted">
                  This tenancy has nothing outstanding, so the payment will be held as credit.
                </p>
              ) : (
                selectedLease.charges.map((charge) => {
                  const fieldKey = `allocation-${charge.id}`;
                  return (
                    <div
                      key={charge.id}
                      className="grid gap-3 sm:grid-cols-[1fr_12rem] sm:items-end"
                    >
                      <div>
                        <p className="text-sm text-text">{charge.label}</p>
                        <p className="text-xs text-subtle">{charge.outstandingLabel} outstanding</p>
                      </div>
                      <Field id={fieldKey} label="Allocate" error={state.fieldErrors?.[fieldKey]}>
                        <MoneyInput
                          id={fieldKey}
                          name={`allocation_${charge.id}`}
                          placeholder="0.00"
                          autoComplete="off"
                          invalid={state.fieldErrors?.[fieldKey] !== undefined}
                        />
                      </Field>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

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
