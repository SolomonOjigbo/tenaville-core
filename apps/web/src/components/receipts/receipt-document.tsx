import {
  Badge,
  Card,
  CardBody,
  Money,
  receiptStatusTone,
  statusLabel,
} from '../ui';
import { formatDate } from '../../lib/format';
import { paymentMethodLabel } from '../../lib/payments';

export interface ReceiptView {
  readonly number: string;
  readonly status: string;
  readonly issuedOn: string;
  readonly verificationCode: string;
}

export interface ReceiptPaymentView {
  readonly amountKobo: number;
  readonly method: string;
  readonly reference: string | null;
  readonly paidOn: string;
  readonly status: string;
  readonly reversalReason: string | null;
}

/** A printable receipt, shared by the staff screen and the tenant portal. */
export const ReceiptDocument = ({
  organisationName,
  branchName,
  receipt,
  payment,
  tenant,
  propertyName,
  unitLabel,
  address,
  leaseReference,
  voidReason,
}: {
  readonly organisationName: string;
  readonly branchName: string | null;
  readonly receipt: ReceiptView;
  readonly payment: ReceiptPaymentView | null;
  readonly tenant: string;
  readonly propertyName: string;
  readonly unitLabel: string;
  readonly address: string | null;
  readonly leaseReference: string;
  readonly voidReason: string | null;
}) => {
  const reversed =
    receipt.status === 'reversed' || receipt.status === 'void' || payment?.status === 'reversed';

  return (
    <>
      {reversed && (
        <div
          role="status"
          className="mx-auto mb-4 max-w-2xl rounded-md bg-warning-soft px-4 py-3 text-sm text-warning-text print:hidden"
        >
          <strong>This receipt is {statusLabel(receipt.status).toLowerCase()}.</strong>{' '}
          {voidReason ?? payment?.reversalReason ?? 'The payment it records was reversed.'}
        </div>
      )}

      <Card className="mx-auto max-w-2xl print:max-w-none print:border-0 print:shadow-none">
        <CardBody className="space-y-6 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="font-display text-lg text-text">{organisationName}</p>
              <p className="text-sm text-muted">
                Official receipt{branchName === null ? '' : ` · ${branchName}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg text-text">{receipt.number}</p>
              <Badge tone={receiptStatusTone(receipt.status)}>{statusLabel(receipt.status)}</Badge>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-subtle">Amount received</p>
            <p className="mt-1 text-3xl">
              <Money kobo={String(payment?.amountKobo ?? 0)} />
            </p>
          </div>

          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Received from</dt>
              <dd className="mt-0.5 text-text">{tenant}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Issued on</dt>
              <dd className="mt-0.5 text-text">{formatDate(receipt.issuedOn)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Property</dt>
              <dd className="mt-0.5 text-text">
                {propertyName}
                <span className="block text-xs text-muted">
                  {unitLabel}
                  {address === null ? '' : ` · ${address}`}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Tenancy</dt>
              <dd className="mt-0.5 text-text">{leaseReference}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Payment date</dt>
              <dd className="mt-0.5 text-text">
                {payment === null ? formatDate(receipt.issuedOn) : formatDate(payment.paidOn)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Method</dt>
              <dd className="mt-0.5 text-text">
                {payment === null ? '—' : paymentMethodLabel(payment.method)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Reference</dt>
              <dd className="mt-0.5 text-text">{payment?.reference ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Payment status</dt>
              <dd className="mt-0.5 text-text">
                {payment === null ? '—' : statusLabel(payment.status)}
              </dd>
            </div>
          </dl>

          <div className="border-t border-border pt-4 text-xs text-subtle">
            <p>
              Verification code:{' '}
              <span className="tabular font-mono text-text">{receipt.verificationCode}</span>
            </p>
            <p className="mt-1">
              Issued by Tenaville. This receipt cannot be edited; a correction reverses the payment
              and issues a fresh receipt, and this number is never reused.
            </p>
          </div>
        </CardBody>
      </Card>
    </>
  );
};
