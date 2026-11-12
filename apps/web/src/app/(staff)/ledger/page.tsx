import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
} from '../../../components/ui';
import { formatDate } from '../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/**
 * Landlords and what the agency currently holds for each (LEDGER-1, LEDGER-5).
 *
 * The balance is the sum of signed ledger entries, never a stored figure. A
 * negative balance means more has been paid out than collected — it happens
 * after a remittance is followed by a reversal, and hiding it would hide a
 * real liability.
 */
export default async function LedgerPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('ledger.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see the landlord ledger"
          description="The ledger follows the money permission. Ask an owner, administrator or accountant."
          action={
            <LinkButton href="/dashboard" variant="secondary">
              Back to dashboard
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();

  const [{ data: landlords }, { data: entries }] = await Promise.all([
    supabase.from('landlords').select('id, display_name').order('display_name'),
    supabase
      .from('landlord_ledger_entries')
      .select('landlord_id, amount_kobo, occurred_on')
      .order('occurred_on', { ascending: false })
      .limit(2000),
  ]);

  const balanceByLandlord = new Map<string, { balance: bigint; count: number; last: string }>();
  for (const entry of entries ?? []) {
    const current = balanceByLandlord.get(entry.landlord_id) ?? {
      balance: 0n,
      count: 0,
      last: entry.occurred_on,
    };
    balanceByLandlord.set(entry.landlord_id, {
      balance: current.balance + BigInt(entry.amount_kobo),
      count: current.count + 1,
      last: current.last > entry.occurred_on ? current.last : entry.occurred_on,
    });
  }

  const rows = (landlords ?? []).map((landlord) => ({
    ...landlord,
    ...(balanceByLandlord.get(landlord.id) ?? { balance: 0n, count: 0, last: null }),
  }));

  const totalHeld = rows.reduce((total, row) => total + row.balance, 0n);

  return (
    <>
      <PageHeader
        title="Landlord ledger"
        description="What each landlord is owed, from rent collected, commission, remittances and reversals."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/rent" variant="secondary">
              Rent and arrears
            </LinkButton>
            <LinkButton href="/reports" variant="secondary">
              Reports
            </LinkButton>
          </div>
        }
      />

      <Card>
        <CardHeader
          title="Balances"
          description="Positive is held for the landlord; negative means the agency has paid out more than it collected."
          action={
            <span className="text-sm text-subtle">
              Held in total <Money kobo={totalHeld.toString()} />
            </span>
          }
        />
        <CardBody className="p-0">
          <Table caption="Landlord balances">
            <thead>
              <tr>
                <Th>Landlord</Th>
                <Th numeric>Entries</Th>
                <Th>Last activity</Th>
                <Th numeric>Balance</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={4} message="No landlords yet." />
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <Link
                        href={`/ledger/${row.id}`}
                        className="text-info-text underline-offset-2 hover:underline"
                      >
                        {row.display_name}
                      </Link>
                    </Td>
                    <Td numeric>{row.count}</Td>
                    <Td>{row.last === null ? '—' : formatDate(row.last)}</Td>
                    <Td numeric>
                      <Money
                        kobo={row.balance.toString()}
                        tone={row.balance < 0n ? 'owed' : 'paid'}
                      />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      {rows.every((row) => row.count === 0) && (
        <p className="mt-4 text-sm text-subtle">
          Recording a rent payment posts to the ledger automatically. Remittances are recorded on a
          landlord&apos;s ledger screen.
        </p>
      )}
    </>
  );
}
