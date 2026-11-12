import { describe, expect, it } from 'vitest';

import type { UserClient } from '@tenaville/db';

import { resolveAccess } from '../application/resolve-access';

const fakeClient = ({
  user,
  membership,
  error = null,
}: {
  user: { id: string } | null;
  membership: Record<string, unknown> | null;
  error?: { message: string } | null;
}) => {
  const filters: [string, unknown][] = [];
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      filters.push([column, value]);
      return builder;
    },
    maybeSingle: async () => ({ data: membership, error }),
  };

  const client = {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
    from: () => builder,
  } as unknown as UserClient;

  return { client, filters };
};

const membership = {
  user_id: 'user-1',
  organisation_id: 'org-1',
  role: 'owner',
  branch_id: null,
};

describe('resolveAccess', () => {
  it('scopes the membership query to the caller', async () => {
    // RLS lets staff read every membership in the organisation. Without the
    // user_id filter this query returns several rows and .maybeSingle() throws
    // as soon as a second member exists.
    const { client, filters } = fakeClient({ user: { id: 'user-1' }, membership });

    const access = await resolveAccess(client, 'org-1', 'user-1');

    expect(access?.role).toBe('owner');
    expect(access?.isStaff).toBe(true);
    expect(filters).toContainEqual(['organisation_id', 'org-1']);
    expect(filters).toContainEqual(['user_id', 'user-1']);
    expect(filters).toContainEqual(['status', 'active']);
  });

  it('finds the caller from auth when no user id is passed', async () => {
    const { client, filters } = fakeClient({ user: { id: 'user-1' }, membership });

    const access = await resolveAccess(client, 'org-1');

    expect(access?.userId).toBe('user-1');
    expect(filters).toContainEqual(['user_id', 'user-1']);
  });

  it('returns null when nobody is signed in', async () => {
    const { client } = fakeClient({ user: null, membership });

    await expect(resolveAccess(client, 'org-1')).resolves.toBeNull();
  });

  it('returns null when the caller has no membership in that organisation', async () => {
    const { client } = fakeClient({ user: { id: 'user-1' }, membership: null });

    await expect(resolveAccess(client, 'org-1', 'user-1')).resolves.toBeNull();
  });
});
