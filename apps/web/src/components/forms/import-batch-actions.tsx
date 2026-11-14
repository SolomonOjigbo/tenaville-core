'use client';

import { useActionState } from 'react';

import { Button } from '../ui';
import { FormBanner } from './form-banner';
import { applyImportAction, rollbackImportAction } from '../../server/import-actions';
import type { ActionResult } from '../../server/auth-actions';

export const ImportBatchActions = ({
  batchId,
  status,
}: {
  readonly batchId: string;
  readonly status: string;
}) => {
  const [applyState, apply, applying] = useActionState<ActionResult, FormData>(
    applyImportAction,
    {},
  );
  const [rollbackState, rollback, rollingBack] = useActionState<ActionResult, FormData>(
    rollbackImportAction,
    {},
  );

  return (
    <div className="space-y-4">
      <FormBanner state={applyState} />
      <FormBanner state={rollbackState} />
      <div className="flex flex-wrap items-center gap-3">
        {status === 'validated' && (
          <form action={apply}>
            <input type="hidden" name="batchId" value={batchId} />
            <Button type="submit" disabled={applying}>
              {applying ? 'Applying…' : 'Apply import'}
            </Button>
          </form>
        )}
        {status === 'applied' && (
          <form action={rollback}>
            <input type="hidden" name="batchId" value={batchId} />
            <Button type="submit" variant="danger" disabled={rollingBack}>
              {rollingBack ? 'Rolling back…' : 'Roll back import'}
            </Button>
          </form>
        )}
      </div>
      {status === 'applied' && (
        <p className="text-xs text-muted">
          Rollback is refused if the imported records have since acquired leases, payments or
          repairs. Opening balances are reversed with labelled adjustments instead of deleted.
        </p>
      )}
    </div>
  );
};
