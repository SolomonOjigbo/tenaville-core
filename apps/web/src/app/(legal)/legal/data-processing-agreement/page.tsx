import { LegalList, LegalPage, LegalSection } from '../../../../components/legal/legal-page';

export const metadata = {
  title: 'Data Processing Agreement — Tenaville',
  description:
    'Draft controller-to-processor terms for agencies using Tenaville to process tenancy, landlord and property data.',
};

const SECTIONS = [
  { id: 'parties', label: 'Parties and status' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'roles', label: 'Roles and scope' },
  { id: 'customer', label: 'Customer obligations' },
  { id: 'processor', label: 'Tenaville obligations' },
  { id: 'subprocessors', label: 'Subprocessors' },
  { id: 'security', label: 'Security' },
  { id: 'breach', label: 'Personal data breaches' },
  { id: 'requests', label: 'Data subject requests' },
  { id: 'transfers', label: 'International transfers' },
  { id: 'return', label: 'Return and deletion' },
  { id: 'audit', label: 'Audit and liability' },
  { id: 'schedules', label: 'Schedules' },
];

export default function DataProcessingAgreementPage() {
  return (
    <LegalPage
      title="Data Processing Agreement"
      summary="A controller-to-processor template for an agency or landlord organisation that uses Tenaville to manage personal data. It becomes effective only when incorporated into a signed order form or accepted in writing by both parties."
      sections={SECTIONS}
    >
      <LegalSection id="parties" title="1. Parties and status">
        <p>
          <strong>Customer:</strong> the agency or landlord organisation identified in the order form.
        </p>
        <p>
          <strong>Processor:</strong> the Tenaville contracting entity to be identified before launch.
          “Tenaville” is currently a working product name.
        </p>
        <p>
          This is a draft template. It has not been executed, does not create a processing
          relationship on its own, and must be reviewed by Nigerian counsel. If there is a conflict
          between this DPA and the main services agreement on data protection, this DPA should prevail
          once executed.
        </p>
      </LegalSection>

      <LegalSection id="definitions" title="2. Definitions">
        <LegalList>
          <li>
            <strong>NDPA</strong> means the Nigeria Data Protection Act 2023, together with applicable
            NDPC guidance and regulations.
          </li>
          <li>
            <strong>Personal data</strong>, <strong>processing</strong>, <strong>controller</strong>,
            <strong>processor</strong>, <strong>data subject</strong> and <strong>personal data
            breach</strong> have the meanings given in the NDPA.
          </li>
          <li>
            <strong>Customer data</strong> means personal data the Customer submits to the service or
            that Tenaville processes on the Customer's behalf.
          </li>
          <li>
            <strong>Services</strong> means the Tenaville property-management platform and related
            support described in the order form.
          </li>
          <li>
            <strong>Subprocessor</strong> means a processor engaged by Tenaville to process Customer
            data for the Services.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="roles" title="3. Roles and scope">
        <p>
          The Customer is the controller of Customer data. Tenaville is the processor. The Customer
          decides the purposes and lawful bases; Tenaville processes only to provide the Services, on
          documented instructions, and as required by law.
        </p>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-border">
              <tr><td className="px-4 py-3 font-medium">Subject matter</td><td className="px-4 py-3">Property management, tenancy administration, rent records, maintenance, documents, communications and related reporting.</td></tr>
              <tr><td className="px-4 py-3 font-medium">Duration</td><td className="px-4 py-3">The term of the services agreement, plus the return/deletion period in clause 12.</td></tr>
              <tr><td className="px-4 py-3 font-medium">Nature of processing</td><td className="px-4 py-3">Collection, storage, retrieval, organisation, disclosure to authorised users, messaging through configured providers, export and deletion.</td></tr>
              <tr><td className="px-4 py-3 font-medium">Data subjects</td><td className="px-4 py-3">The Customer's staff, landlords, tenants, prospective tenants, vendors/contractors and authorised contacts.</td></tr>
              <tr><td className="px-4 py-3 font-medium">Data categories</td><td className="px-4 py-3">Identity and contact, property and tenancy, financial and rent records, maintenance, documents, communications, technical and audit data.</td></tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="customer" title="4. Customer obligations">
        <LegalList>
          <li>Provide lawful, documented instructions and ensure it has a lawful basis for the data.</li>
          <li>Give privacy notices and obtain consent where required, including marketing consent and any sensitive-data consent.</li>
          <li>Limit data and documents to what the tenancy or property purpose needs.</li>
          <li>Manage users, roles, assignments and access, and remove users who should no longer have access.</li>
          <li>Verify the accuracy of instructions that affect money, approvals or legal notices.</li>
          <li>Respond to data subject requests or instruct Tenaville where assistance is needed.</li>
          <li>Do not instruct processing that is unlawful or that Tenaville has reasonably objected to.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="processor" title="5. Tenaville obligations">
        <LegalList>
          <li>Process Customer data only on documented instructions, including transfers, unless required by law.</li>
          <li>Ensure personnel who access Customer data are bound by confidentiality and access only what their role needs.</li>
          <li>Implement the security measures in Schedule B and maintain the audit and access controls described there.</li>
          <li>Assist the Customer with data subject requests, DPIAs and consultations with the NDPC, taking into account the nature of the processing.</li>
          <li>Notify the Customer of a personal data breach without undue delay after becoming aware.</li>
          <li>Engage subprocessors only under written terms that provide protections no less protective than this DPA.</li>
          <li>Return or delete Customer data at the end of the services, subject to legal retention.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="subprocessors" title="6. Subprocessors">
        <p>
          The Customer authorises the subprocessors needed to provide the Services. Tenaville will
          give notice of a new subprocessor that processes Customer data where required, and the
          Customer may object on reasonable data-protection grounds. The current list is in Schedule C.
          The list must be completed and provider contracts executed before launch.
        </p>
      </LegalSection>

      <LegalSection id="security" title="7. Security">
        <p>
          Tenaville maintains the measures in Schedule B, including organisation-level row security,
          role-scoped access, private document storage, short-lived signed downloads, audit of
          sensitive actions and append-only financial records. Security is reviewed as the product and
          provider list change.
        </p>
        <p>
          The Customer is responsible for its own device security, account credentials, user training
          and the lawful configuration of roles and assignments.
        </p>
      </LegalSection>

      <LegalSection id="breach" title="8. Personal data breaches">
        <p>
          Tenaville will notify the Customer without undue delay after becoming aware of a personal
          data breach affecting Customer data, and will provide information reasonably available about
          the nature of the breach, affected data, likely consequences and measures taken or proposed.
          Tenaville will cooperate with the Customer's notifications to data subjects or the NDPC and
          will not make public statements attributing fault without consultation, except where legally
          required.
        </p>
        <p>
          Notification is not an admission of liability. The Customer remains responsible for deciding
          whether it must notify the NDPC or affected data subjects.
        </p>
      </LegalSection>

      <LegalSection id="requests" title="9. Data subject requests">
        <p>
          If a data subject contacts Tenaville about Customer data, Tenaville will refer the request to
          the Customer where the Customer is the controller, or assist the Customer in responding.
          Tenaville will not delete, correct or export Customer data in response to a third-party
          request without the Customer's documented instruction or a lawful obligation.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="10. International transfers">
        <p>
          The Customer authorises transfers necessary to use the Services, subject to NDPA transfer
          requirements. Tenaville will use a recognised safeguard (adequacy, standard contractual
          clauses or another lawful mechanism), maintain a transfer register and require subprocessors
          to protect transferred data. The final transfer mapping is part of Schedule C and must be
          completed before launch.
        </p>
      </LegalSection>

      <LegalSection id="return" title="11. Return and deletion">
        <p>
          During the term, the Customer can export its data through the export features that are made
          available. On termination, Tenaville will make Customer data available for export for the
          period stated in the order form, then delete or return it on the Customer's instruction,
          subject to legal retention. Deletion from active systems does not immediately remove copies
          from backup cycles; those copies are protected and deleted on the normal cycle.
        </p>
        <p>
          Financial, audit and dispute records may be retained where Nigerian law or a legal claim
          requires it. Tenaville will not delete operational customer data solely because a
          subscription is unpaid.
        </p>
      </LegalSection>

      <LegalSection id="audit" title="12. Audit and liability">
        <p>
          Tenaville will provide the information reasonably needed to demonstrate compliance, such as
          security summaries, audit reports and subprocessor details. On-site audits are available only
          where required by law or agreed in the order form, with reasonable notice, confidentiality
          and no disruption to other customers.
        </p>
        <p>
          Liability is governed by the executed services agreement. Nothing in this template creates a
          final liability position. The parties will review the allocation after Nigerian counsel
          advice and before signature.
        </p>
      </LegalSection>

      <LegalSection id="schedules" title="Schedules">
        <h3 className="font-display text-lg text-text">Schedule A — Data categories and subjects</h3>
        <p>
          Identity and contact details; organisation and role; property and unit; tenancy and lease;
          rent, deposit, payment, receipt, ledger, commission and remittance records; maintenance
          requests, vendors, approvals and costs; documents and photos; communications, message
          metadata and preferences; audit and technical logs.
        </p>
        <h3 className="pt-2 font-display text-lg text-text">Schedule B — Security measures</h3>
        <LegalList>
          <li>Organisation-level row-level security and role/property scoping.</li>
          <li>Authentication and session handling through Supabase Auth; access limited to active memberships.</li>
          <li>Private document buckets; downloads through short-lived signed URLs; document access recorded in the audit trail.</li>
          <li>Append-only financial records and audit events for sensitive changes.</li>
          <li>Encryption in transit; provider encryption at rest; access logging and least-privilege administration.</li>
          <li>Provider backup capability, with a documented and tested restore procedure required before production launch.</li>
          <li>Incident response, vulnerability management and provider review as the service matures.</li>
        </LegalList>
        <h3 className="pt-2 font-display text-lg text-text">Schedule C — Subprocessors</h3>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface2 text-xs uppercase tracking-wide text-subtle">
              <tr><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Purpose</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr><td className="px-4 py-3">Supabase</td><td className="px-4 py-3">Postgres, authentication and private object storage</td><td className="px-4 py-3">In use</td></tr>
              <tr><td className="px-4 py-3">Cloud hosting provider</td><td className="px-4 py-3">Web application hosting and logs</td><td className="px-4 py-3">To be confirmed</td></tr>
              <tr><td className="px-4 py-3">WhatsApp Business provider</td><td className="px-4 py-3">Business messaging and delivery status</td><td className="px-4 py-3">Not yet connected</td></tr>
              <tr><td className="px-4 py-3">SMS provider</td><td className="px-4 py-3">SMS delivery and status</td><td className="px-4 py-3">Not yet connected</td></tr>
              <tr><td className="px-4 py-3">Email provider</td><td className="px-4 py-3">Transactional email delivery</td><td className="px-4 py-3">Not yet connected</td></tr>
              <tr><td className="px-4 py-3">Payment/subscription partner</td><td className="px-4 py-3">Card or transfer checkout and settlement</td><td className="px-4 py-3">Not yet selected</td></tr>
            </tbody>
          </table>
        </div>
        <h3 className="pt-2 font-display text-lg text-text">Execution block</h3>
        <p className="text-muted">
          Customer legal name, registered address, signatory and date: ______________________
          <br />
          Tenaville contracting entity, registered address, signatory and date: ______________________
        </p>
      </LegalSection>
    </LegalPage>
  );
}
