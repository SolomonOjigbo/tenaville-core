'use client';

import { useActionState } from 'react';

import { Button } from '../ui';
import { FormBanner } from './form-banner';
import {
  revokeAllSessionsAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
} from '../../server/session-actions';
import type { ActionResult } from '../../server/auth-actions';

export const RevokeSessionForm = ({ sessionId }: { readonly sessionId: string }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(revokeSessionAction, {});
  return (
    <form action={action} className="space-y-2">
      <FormBanner state={state} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? 'Signing out…' : 'Sign out device'}
      </Button>
    </form>
  );
};

export const RevokeOtherSessionsForm = () => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    revokeOtherSessionsAction,
    {},
  );
  return (
    <form action={action} className="space-y-2">
      <FormBanner state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Signing out…' : 'Sign out other devices'}
      </Button>
    </form>
  );
};

export const RevokeAllSessionsForm = () => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    revokeAllSessionsAction,
    {},
  );
  return (
    <form action={action} className="space-y-2">
      <FormBanner state={state} />
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? 'Signing out…' : 'Sign out everywhere'}
      </Button>
    </form>
  );
};
