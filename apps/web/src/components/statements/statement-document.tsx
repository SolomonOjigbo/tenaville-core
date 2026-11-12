import Link from 'next/link';

import {
  Badge,
  Card,
  CardBody,
  Money,
  Table,
  TableEmpty,
  Td,
  Th,
  statementStatusTone,
  statusLabel,
} from '../ui';
import { formatDate } from '../../lib/format';

export interface StatementLineView {
  readonly id: string;
  readonly occurredOn: string;
  readonly kind: string;
  readonly fundsClass: string;
  readonly description: string;
  readonly amountKobo: number;
}

export interface StatementView {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly revisionNumber: number;
  readonly status: string;
  readonly openingKobo: number;
  readonly closingKobo: number;
  readonly issuedOn: string | null;
}

export interface LinkedStatement {
  readonly id: string;
  readonly revisionNumber: number;
  readonly status?: string | undefined;
}

/** The printable statement itself, shared by the portal and the staff screen. */
export const StatementDocument = ({
  organisationName,
  landlordName,
  statement,
  lines,
  supersedes,
  supersededBy,
}: {
  readonly organisationName: string;
  readonly landlordName: string;
  readonly statement: StatementView;
  readonly lines: readonly StatementLineView[];
  readonly supersedes: LinkedStatement | null;
  readonly supersededBy: LinkedStatement | null;
}) => {
  const movement = lines.reduce((total, line) => total + BigInt(line.amountKobo), 0n);

  return (
    <Card className="mx-auto max-w-3xl print:max-w-none print:border-0 print:shadow-none">
      <CardBody className="space-y-6 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="font-display text-lg text-text">{organisationName}</p>
            <p className="text-sm text-muted">Landlord statement · {landlordName}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg text-text">Revision {statement.revisionNumber}</p>
            <Badge tone={statementStatusTone(statement.status)}>
              {statusLabel(statement.status)}
            </Badge>
          </div>
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-subtle">Opening balance</dt>
            <dd className="mt-0.5 text-text">
              <Money kobo={String(statement.openingKobo)} />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-subtle">Movements</dt>
            <dd className="mt-0.5 text-text">
              <Money kobo={movement.toString()} />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-subtle">Closing balance</dt>
            <dd className="mt-0.5 text-text">
              <Money kobo={String(statement.closingKobo)} />
            </dd>
          </div>
        </dl>

        <Table caption="Statement lines">
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Funds</Th>
              <Th numeric>Amount</Th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <TableEmpty colSpan={4} message="No movements in this period." />
            ) : (
              lines.map((line) => (
                <tr key={line.id}>
                  <Td>{formatDate(line.occurredOn)}</Td>
                  <Td>
                    {line.description}
                    <span className="block text-xs text-subtle">{statusLabel(line.kind)}</span>
                  </Td>
                  <Td>
                    <Badge tone={line.fundsClass === 'agency_income' ? 'warning' : 'info'}>
                      {statusLabel(line.fundsClass)}
                    </Badge>
                  </Td>
                  <Td numeric>
                    <Money kobo={String(line.amountKobo)} />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>

        <div className="border-t border-border pt-4 text-xs text-subtle">
          <p>
            {statement.issuedOn === null
              ? 'This statement is not yet issued.'
              : `Issued ${formatDate(statement.issuedOn)}. An issued statement cannot be changed.`}
          </p>
          {supersedes !== null && (
            <p className="mt-1">
              <Link
                href={`/portfolio/statements/${supersedes.id}`}
                className="text-info-text underline-offset-2 hover:underline"
              >
                Replaces revision {supersedes.revisionNumber}
              </Link>
              .
            </p>
          )}
          {supersededBy !== null && (
            <p className="mt-1">
              <Link
                href={`/portfolio/statements/${supersededBy.id}`}
                className="text-info-text underline-offset-2 hover:underline"
              >
                Superseded by revision {supersededBy.revisionNumber}
                {supersededBy.status === undefined ? '' : ` (${statusLabel(supersededBy.status)})`}
              </Link>
              .
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
