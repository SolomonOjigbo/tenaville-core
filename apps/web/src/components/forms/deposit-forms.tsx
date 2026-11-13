'use client';

import { useActionState } from 'react';

import { Button, Field, MoneyInput, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import {
  approveDepositDeductionAction,
  proposeDepositDeductionAction,
  recordDepositReceiptAction,
  settleDepositAction,
} from '../../server/tenancy-actions';
import type { ActionResult } from '../../server/auth-actions';

const textareaClass =
  'min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-subtle';

const useAction = (action: (previous: ActionResult, form: FormData) => Promise<ActionResult>) =>
  useActionState<ActionResult, FormData>(action, {});

export const RecordDepositReceiptForm = ({
  leaseId,
  depositId,
}: {
  readonly leaseId: string;
  readonly depositId: string;
}) => {
  const [state, action, pending] = useAction(recordDepositReceiptAction);
  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="leaseId" value={leaseId} />
      <input type="hidden" name="depositId" value={depositId} />
      <Field id="deposit-received-on" label="Date received" required>
        <TextInput id="deposit-received-on" name="receivedOn" type="date" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Recording…' : 'Mark deposit as held'}
      </Button>
    </form>
  );
};

export const ProposeDeductionForm = ({
  leaseId,
  depositId,
}: {
  readonly leaseId: string;
  readonly depositId: string;
}) => {
  const [state, action, pending] = useAction(proposeDepositDeductionAction);
  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="leaseId" value={leaseId} />
      <input type="hidden" name="depositId" value={depositId} />
      <Field id="deduction-amount" label="Amount" required error={state.fieldErrors?.amount}>
        <MoneyInput id="deduction-amount" name="amount" required autoComplete="off" />
      </Field>
      <Field
        id="deduction-reason"
        label="What is it for?"
        required
        error={state.fieldErrors?.reason}
      >
        <textarea
          id="deduction-reason"
          name="reason"
          required
          minLength={5}
          maxLength={1000}
          className={textareaClass}
          placeholder="Cracked bathroom basin, replacement quoted by the vendor."
        />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Proposing…' : 'Propose deduction'}
      </Button>
    </form>
  );
};

export const ApproveDeductionForm = ({
  leaseId,
  deductionId,
}: {
  readonly leaseId: string;
  readonly deductionId: string;
}) => {
  const [state, action, pending] = useAction(approveDepositDeductionAction);
  return (
    <form action={action} className="inline">
      <FormBanner state={state} />
      <input type="hidden" name="leaseId" value={leaseId} />
      <input type="hidden" name="deductionId" value={deductionId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Approving…' : 'Approve'}
      </Button>
    </form>
  );
};

export const SettleDepositForm = ({
  leaseId,
  depositId,
  leases,
  suggestedDate,
}: {
  readonly leaseId: string;
  readonly depositId: string;
  readonly leases: readonly { readonly id: string; readonly label: string }[];
  readonly suggestedDate: string;
}) => {
  const [state, action, pending] = useAction(settleDepositAction);
  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="leaseId" value={leaseId} />
      <input type="hidden" name="depositId" value={depositId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="settle-outcome" label="Outcome" required error={state.fieldErrors?.outcome}>
          <Select id="settle-outcome" name="outcome" defaultValue="refund">
            <option value="refund">Refund the balance to the tenant</option>
            <option value="forfeit">Forfeit the deposit</option>
            <option value="transfer">Transfer to another tenancy</option>
          </Select>
        </Field>
        <Field id="settle-date" label="Settled on" required>
          <TextInput
            id="settle-date"
            name="settledOn"
            type="date"
            required
            defaultValue={suggestedDate}
          />
        </Field>
      </div>
      <Field
        id="settle-transfer"
        label="Transfer to"
        hint="Only needed when the outcome is a transfer."
      >
        <Select id="settle-transfer" name="transferredToLeaseId" defaultValue="">
          <option value="">Not a transfer</option>
          {leases
            .filter((lease) => lease.id !== leaseId)
            .map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.label}
              </option>
            ))}
        </Select>
      </Field>
      <Field id="settle-notes" label="Notes">
        <textarea id="settle-notes" name="notes" maxLength={2000} className={textareaClass} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Settling…' : 'Settle deposit'}
      </Button>
    </form>
  );
};
