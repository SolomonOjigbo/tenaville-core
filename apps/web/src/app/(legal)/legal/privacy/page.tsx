import {
  LegalList,
  LegalPage,
  LegalSection,
} from '../../../../components/legal/legal-page';

export const metadata = {
  title: 'Privacy Notice — Tenaville',
  description:
    'How Tenaville processes personal data under the Nigeria Data Protection Act, including roles, lawful bases, sharing, retention and rights.',
};

const SECTIONS = [
  { id: 'roles', label: 'Who is responsible' },
  { id: 'data', label: 'Data we collect' },
  { id: 'why', label: 'Why we use it' },
  { id: 'cookies', label: 'Cookies and local storage' },
  { id: 'sharing', label: 'Who we share with' },
  { id: 'transfers', label: 'International transfers' },
  { id: 'retention', label: 'Retention' },
  { id: 'security', label: 'Security' },
  { id: 'rights', label: 'Your rights' },
  { id: 'messaging', label: 'Messaging and marketing' },
  { id: 'children', label: 'Children' },
  { id: 'contact', label: 'Changes and contact' },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Notice"
      summary="This notice explains how Tenaville processes personal data when agencies, landlords, tenants and staff use the platform. It is written against the Nigeria Data Protection Act 2023 (NDPA) and is subject to review by Nigerian counsel and the Nigeria Data Protection Commission's guidance."
      sections={SECTIONS}
    >
      <LegalSection id="roles" title="1. Who is responsible for your data">
        <p>
          Tenaville is software used by property-management agencies and landlords. In most tenancy
          and property records, the agency or landlord decides what data is collected and why. That
          organisation is the <strong>controller</strong>. Tenaville processes the data on its
          instructions as a <strong>processor</strong>, under the{' '}
          <a className="text-info-text underline" href="/legal/data-processing-agreement">
            Data Processing Agreement
          </a>
          .
        </p>
        <p>
          Tenaville acts as a controller for its own account, organisation, subscription, security and
          service-usage data. If you are a tenant or landlord and want to exercise a right over your
          tenancy record, the agency is usually the first contact. We will assist the agency and will
          not override its lawful instructions.
        </p>
      </LegalSection>

      <LegalSection id="data" title="2. Data we collect">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface2 text-xs uppercase tracking-wide text-subtle">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Examples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 font-medium">Account and access</td>
                <td className="px-4 py-3">
                  Name, email, phone, password hash, organisation, role, invitations, assignment
                  scope, authentication metadata and session records.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Portfolio and tenancy</td>
                <td className="px-4 py-3">
                  Landlord, property, unit, tenant, lease, rent, deposit, contact, next-of-kin or
                  business details entered by the agency.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Financial records</td>
                <td className="px-4 py-3">
                  Charges, payments, allocations, receipts, ledger entries, commission, remittances,
                  statements, invoices and bank remittance details. Card data is not stored by
                  Tenaville; a licensed payment partner will handle it when gateway payments are
                  enabled.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Maintenance</td>
                <td className="px-4 py-3">
                  Repair descriptions, category, urgency, safety/habitability flag, access constraints,
                  preferred times, vendor details, costs, approvals, completion notes and timeline
                  events.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Documents</td>
                <td className="px-4 py-3">
                  Lease agreements, identification, ownership evidence, inspection reports, insurance,
                  receipts, invoices, notices and photographs uploaded to private storage.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Communications</td>
                <td className="px-4 py-3">
                  Recipient, channel, template, subject, message body, delivery attempts, provider
                  identifiers, errors, message cost and notification preferences.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Technical and audit</td>
                <td className="px-4 py-3">
                  IP address, user agent, request identifiers, audit events, access timestamps and
                  error information needed to operate and secure the service.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Some documents and notes may reveal sensitive information, such as identification
          documents, health or safety circumstances. Upload only what is necessary. NIN and BVN
          screening are not collected in the current R1 build; screening and financing features are
          disabled and will require separate notices, lawful-basis review and consent before launch.
        </p>
      </LegalSection>

      <LegalSection id="why" title="3. Why we use personal data and our lawful bases">
        <LegalList>
          <li>
            <strong>Contract:</strong> to create and secure an account, provide the platform, maintain
            tenancies and rent records, issue receipts and statements, and support the organisation.
          </li>
          <li>
            <strong>Legitimate interests:</strong> to secure the service, prevent fraud and abuse,
            maintain audit trails, diagnose errors, improve reliability and enforce our terms. We
            balance these interests against your rights.
          </li>
          <li>
            <strong>Legal obligation:</strong> to keep financial, tax, audit or dispute records, respond
            to lawful requests and meet NDPA or other applicable obligations.
          </li>
          <li>
            <strong>Consent:</strong> for marketing messages, optional non-essential cookies or
            features, and any sensitive processing that requires explicit consent. Consent can be
            withdrawn.
          </li>
          <li>
            <strong>Vital interests:</strong> where a safety or habitability emergency requires action
            to protect someone.
          </li>
        </LegalList>
        <p>
          The agency is responsible for the lawful basis of tenancy, landlord and tenant data it
          uploads. It must give its own notices and obtain any consents its operations require.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="4. Cookies and local storage">
        <p>
          The web app uses essential cookies to keep you signed in and to protect your session through
          Supabase Auth. It may store a small local preference for the light or dark theme. These are
          needed for the service to work. The current build does not use advertising cookies, sell
          audience data or run a public marketing pixel.
        </p>
        <p>
          If analytics or marketing tools are added, this notice and a consent mechanism will be
          updated before they are enabled.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="5. Who we share data with">
        <p>We share only what is needed for the service, with appropriate safeguards:</p>
        <LegalList>
          <li>
            <strong>Supabase</strong> for database, authentication and private file storage.
          </li>
          <li>
            <strong>Cloud hosting and email delivery providers</strong> used to run and support the
            service.
          </li>
          <li>
            <strong>WhatsApp Business, SMS and email providers</strong> when configured, to deliver
            messages the agency instructs us to send.
          </li>
          <li>
            <strong>A licensed payment or subscription partner</strong> when gateway payments are
            enabled. Tenaville does not hold customer funds.
          </li>
          <li>
            <strong>Professional advisers, auditors and authorities</strong> where required by law or
            to establish, exercise or defend legal claims.
          </li>
          <li>
            <strong>A successor entity</strong> in a merger, acquisition or reorganisation, subject to
            equivalent protections.
          </li>
        </LegalList>
        <p>
          We do not sell personal data, publish it in a property marketplace or share it for
          third-party advertising. A list of current subprocessors is included in the DPA.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="6. International transfers">
        <p>
          Cloud and communications providers may process data outside Nigeria. Where that happens,
          Tenaville will use a transfer mechanism recognised under the NDPA and NDPC guidance, such as
          an adequacy decision, standard contractual clauses or another lawful safeguard, and will
          require appropriate security and confidentiality terms. The final provider list and
          transfer mapping must be completed before launch.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="7. How long we keep data">
        <p>
          We keep account and operational data while the organisation uses the service, then for the
          period needed to return or delete it. Financial, ledger, tax, audit and dispute records may
          be kept longer where law or a legitimate claim requires it. Documents, messages and audit
          events follow the same principle: only as long as needed for the purpose, a legal
          obligation, security or a dispute.
        </p>
        <p>
          A detailed retention schedule is still being agreed with legal and accounting advisers.
          Backups may retain deleted data for a limited cycle; restored backups are subject to the
          same deletion process. This notice will publish the schedule before launch.
        </p>
      </LegalSection>

      <LegalSection id="security" title="8. Security">
        <p>
          Access is role-based and scoped to the organisation and, where configured, to assigned
          properties. Database row-level security separates organisations and portal audiences.
          Financial records are append-only, changes to sensitive records are audited, documents live
          in private storage and downloads use short-lived signed links. Data is encrypted in transit;
          the hosting provider applies encryption at rest.
        </p>
        <p>
          No system is perfectly secure. Report a suspected incident or vulnerability to{' '}
          <a className="text-info-text underline" href="mailto:security@tenaville.ng">
            security@tenaville.ng
          </a>
          . Do not send passwords or full identity documents in a first report.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="9. Your rights">
        <p>Subject to the NDPA and applicable exceptions, you may ask to:</p>
        <LegalList>
          <li>access the personal data held about you and receive information about its use;</li>
          <li>correct inaccurate or incomplete data;</li>
          <li>delete data that is no longer needed or unlawfully processed;</li>
          <li>restrict or object to certain processing, including direct marketing;</li>
          <li>receive data in a portable format where the right applies;</li>
          <li>withdraw consent without affecting processing already carried out; and</li>
          <li>complain to the Nigeria Data Protection Commission.</li>
        </LegalList>
        <p>
          Use the <a className="text-info-text underline" href="/legal/data-requests">data request page</a>{' '}
          or email <a className="text-info-text underline" href="mailto:privacy@tenaville.ng">privacy@tenaville.ng</a>.
          We may need to verify your identity and will coordinate with the agency where it is the
          controller. We aim to respond within 30 days and will explain any lawful extension.
        </p>
      </LegalSection>

      <LegalSection id="messaging" title="10. Messaging and marketing">
        <p>
          Operational messages about a tenancy, repair, receipt, statement or account are sent on the
          agency's instructions. Marketing messages require a valid opt-in and are separate from
          operational messages. You can change channel preferences in the portal or tell the agency;
          promotional messages will stop when you opt out. The full rules are in the{' '}
          <a className="text-info-text underline" href="/legal/messaging-policy">
            Messaging Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="children" title="11. Children">
        <p>
          Tenaville is a business service for people aged 18 and over. It is not directed at children.
          If a tenancy record includes a child's information, the agency must ensure it has a lawful
          basis and limits the data to what the tenancy requires.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Changes, complaints and contact">
        <p>
          We may update this notice as the product, providers or law change. Material changes will be
          notified in the product or by email before they take effect. The “last updated” date at the
          top of the page will change.
        </p>
        <p>
          Contact <a className="text-info-text underline" href="mailto:privacy@tenaville.ng">privacy@tenaville.ng</a>{' '}
          for privacy questions or <a className="text-info-text underline" href="mailto:legal@tenaville.ng">legal@tenaville.ng</a>{' '}
          for this notice. You may also complain to the{' '}
          <a
            className="text-info-text underline"
            href="https://ndpc.gov.ng"
            rel="noreferrer"
            target="_blank"
          >
            Nigeria Data Protection Commission
          </a>
          . We ask that you raise the issue with us first so we can try to resolve it.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
