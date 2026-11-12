import type { ActionResult } from '../../server/auth-actions';

/** The shared error/success banner for a form driven by a server action. */
export const FormBanner = ({ state }: { readonly state: ActionResult }) => (
  <>
    {state.error !== undefined && (
      <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
        {state.error}
      </p>
    )}
    {state.message !== undefined && (
      <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-success-text">
        {state.message}
      </p>
    )}
  </>
);
