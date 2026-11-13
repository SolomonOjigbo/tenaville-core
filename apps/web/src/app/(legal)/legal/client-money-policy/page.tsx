import { LegalList, LegalPage, LegalSection } from '../../../../components/legal/legal-page';

export const metadata = {
  title: 'Client Money Policy — Tenaville',
  description:
    'How rent, deposits and landlord funds are separated, recorded, reconciled and remitted in Tenaville.',
};

const SECTIONS = [
  { id: 'scope', label: 'Scope and status' },
  { id: 'definition', label: 'What client money means' },
  { id: 'separation', label: 'Ledger separation' },
  { id: 'rent', label: 'Rent and receipts' },
  { id: 'deposits', label: 'Deposits' },
  { id: 'costs', label: 'Costs and commission' },
  { id: 'remittance', label: 'Remittances' },
  { id: 'reconciliation', label: 'Reconciliation' },
  { id: 'partners', label: 'Payment partners' },
  { id: 'responsibility', label: 'Agency responsibility' },
  { id: 'concerns', label: 'Reporting concerns' },
];

export default function ClientMoneyPolicyPage() {
  return (
    <LegalPage
      title="Client Money Policy"
      summary="How Tenaville records money held for landlords and tenants. The platform is a record-keeping and coordination tool; it is not a bank, escrow service or payment institution."
      sections={SECTIONS}
    >
      <LegalSection id="scope" title="1. Scope and current status">
        <p>
          This policy applies to rent, caution deposits, service charges, repair recharges, landlord
          remittances and related client funds recorded in Tenaville. It reflects the current R1 build:
          agencies record money they have received; Tenaville does not receive or hold customer funds.
        </p>
        <p className="rounded-md bg-warning-soft px-4 py-3 text-warning-text">
          <strong>Current build status:</strong> subscription gateway payments are not enabled, and
          no payment partner receives rent or deposits through Tenaville. When a licensed payment
          partner is connected, the settlement model, contracting entity and account flow must be
          documented and legally reviewed before any customer money moves.
        </p>
      </LegalSection>

      <LegalSection id="definition" title="2. What client money means">
        <p>
          Client money is money received by an agency or landlord organisation for or on behalf of
          another person. It includes rent collected for a landlord, caution deposits held for a
          tenant, service charges, and repair costs collected for a landlord. Agency commission and
          fees become agency income only when they are earned and recorded as such.
        </p>
        <p>
          Tenaville itself does not become a trustee or holder of these funds merely because it records
          them.
        </p>
      </LegalSection>

      <LegalSection id="separation" title="3. Ledger separation">
        <p>
          The landlord ledger separates <strong>client funds</strong> from <strong>agency income</strong>.
          Rent collected and other client money are tracked as client funds. Commission is posted as
          agency income when rent is received, at the rate and basis frozen in the management mandate.
          A deduction that is not permitted by the mandate should not be taken.
        </p>
        <LegalList>
          <li>Client funds are not mixed with agency income in the ledger or statements.</li>
          <li>Every movement has a date, description, amount and link to its source record where applicable.</li>
          <li>Entries are append-only; corrections are reversing or adjustment entries, not silent edits.</li>
          <li>A landlord statement shows opening balance, movements, deductions and closing balance.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="rent" title="4. Rent, payments and receipts">
        <LegalList>
          <li>A payment is recorded when the agency has actually received it, not when it is promised.</li>
          <li>Payments are allocated to charges, with any unallocated amount shown as tenant credit.</li>
          <li>A receipt is issued with a unique sequential number after the payment is recorded; a reversal keeps the original number and creates a linked correcting record.</li>
          <li>A recorded payment is not the same as a partner-confirmed or bank-reconciled payment. The status must say which it is.</li>
          <li>Cash-up reconciles the day's recorded payments by user and method against cash and bank evidence.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="deposits" title="5. Caution deposits">
        <p>
          A deposit is recorded as client money with its custody arrangement (agency or landlord).
          Deductions require evidence, a reason and the approval configured for the tenancy. The
          remainder is refunded or transferred at move-out. Every step should be traceable in the
          deposit and ledger history, and a deduction must not consume the deposit without a recorded
          basis.
        </p>
        <p>
          The legal treatment of deposits and the account in which they are held are still subject to
          Nigerian legal and accounting review. This policy does not state that Tenaville holds
          deposits.
        </p>
      </LegalSection>

      <LegalSection id="costs" title="6. Maintenance costs and commission">
        <LegalList>
          <li>A repair cost is allocated to the landlord, tenant, agency, service charge or another payer with a reason.</li>
          <li>A landlord-borne cost becomes a ledger deduction after the required approval; it is not taken before approval.</li>
          <li>A tenant-borne cost becomes a repair charge on the tenancy and follows the normal allocation, receipt and arrears process.</li>
          <li>Commission is recognised when rent is received by default, at the rate and base in the mandate. A different basis requires a documented mandate.</li>
          <li>Fees and taxes must be separately identifiable and not hidden inside a client-funds movement.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="remittance" title="7. Remittances">
        <p>
          A remittance is money paid out to a landlord. It is recorded as a debit against the landlord
          ledger with the date, amount, method and reference. The platform should prevent a remittance
          from exceeding the available client-funds balance and should keep the bank or payment
          evidence with the record.
        </p>
      </LegalSection>

      <LegalSection id="reconciliation" title="8. Reconciliation">
        <p>
          Agencies should reconcile recorded receipts and remittances to bank statements, POS
          settlements and cash counts regularly, and investigate differences rather than overwrite
          them. Daily cash-up supports this at the payment level; monthly statements support it at the
          landlord level. A discrepancy should be corrected by a documented adjustment or reversal
          with a reason.
        </p>
      </LegalSection>

      <LegalSection id="partners" title="9. Payment partners and settlement">
        <p>
          Any future collection of rent, deposits or subscription fees through a payment partner must
          use a licensed provider and a legally reviewed settlement model. The partner may hold or
          settle funds; Tenaville must not describe itself as holding customer funds unless the
          necessary licence and safeguards exist. The chosen model must say who contracts with the
          payer, where funds settle, who bears chargebacks and how reconciliation works.
        </p>
      </LegalSection>

      <LegalSection id="responsibility" title="10. Agency responsibility, interest and insolvency">
        <p>
          The agency or landlord organisation is responsible for holding client money in accordance
          with its professional, contractual and regulatory obligations, including any client-account
          rules. Tenaville provides records, not a banking or trust service. Tenaville does not pay
          interest on client funds. If an agency becomes insolvent or fails to remit, Tenaville cannot
          recover funds it never held; the agency and its advisers are responsible for the client-money
          arrangements.
        </p>
      </LegalSection>

      <LegalSection id="concerns" title="11. Reporting concerns">
        <p>
          Report suspected misappropriation, a missing remittance, a manipulated receipt or a
          reconciliation discrepancy to the agency's principal and to{' '}
          <a className="text-info-text underline" href="mailto:security@tenaville.ng">
            security@tenaville.ng
          </a>
          . Tenaville may preserve audit records and suspend access where a serious financial-integrity
          concern is raised. This policy is a draft for legal and accounting review and does not
          replace professional advice.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
