import { LegalList, LegalPage, LegalSection } from '../../../../components/legal/legal-page';

export const metadata = {
  title: 'Terms of Service — Tenaville',
  description: 'Draft terms for using the Tenaville property-management platform.',
};

const SECTIONS = [
  { id: 'service', label: 'The service' },
  { id: 'accounts', label: 'Accounts and authority' },
  { id: 'customer-data', label: 'Customer data' },
  { id: 'subscriptions', label: 'Subscriptions and invoices' },
  { id: 'acceptable-use', label: 'Acceptable use' },
  { id: 'availability', label: 'Availability and support' },
  { id: 'ip', label: 'Intellectual property' },
  { id: 'termination', label: 'Suspension and termination' },
  { id: 'liability', label: 'Disclaimers and liability' },
  { id: 'law', label: 'Governing law' },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary="These draft terms govern access to the Tenaville platform by an agency, property manager or landlord organisation. They are not a substitute for a signed order form or for Nigerian legal advice."
      sections={SECTIONS}
    >
      <LegalSection id="service" title="1. The service">
        <p>
          Tenaville provides software for managing property portfolios, tenancies, rent records,
          maintenance, documents, communications and landlord reporting. It is not a bank, payment
          institution, escrow agent, law firm, estate agent or public property marketplace.
        </p>
        <p>
          The service may include integrations supplied by third parties, such as Supabase hosting,
          messaging providers and payment partners. Those services are governed by their own terms,
          and Tenaville is not responsible for their independent acts or omissions.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="2. Accounts and authority">
        <LegalList>
          <li>You must be at least 18 and able to enter a binding contract.</li>
          <li>
            The person creating an organisation confirms they are authorised to bind that organisation
            and to invite staff, landlords and tenants.
          </li>
          <li>Account details must be accurate, and credentials must not be shared.</li>
          <li>
            An agency is responsible for the roles, assignments and instructions it gives its users,
            including any person who can record money, approve costs or download documents.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="customer-data" title="3. Customer data and privacy">
        <p>
          The agency or landlord organisation is the controller of the tenancy, property, landlord,
          tenant and financial data it puts into Tenaville. Tenaville processes that data as a
          processor on the customer's instructions, subject to the{' '}
          <a className="text-info-text underline" href="/legal/data-processing-agreement">
            Data Processing Agreement
          </a>
          . Tenaville is a controller for its own account, billing and security data, as explained in
          the <a className="text-info-text underline" href="/legal/privacy">Privacy Notice</a>.
        </p>
        <p>
          The customer is responsible for having a lawful basis, giving notices and obtaining any
          consent needed for the data it uploads and the messages it sends. Do not upload data the
          customer is not entitled to process.
        </p>
      </LegalSection>

      <LegalSection id="subscriptions" title="4. Subscriptions, plans and invoices">
        <LegalList>
          <li>
            Plans are priced in naira primarily by units under management. Current plan limits and
            prices are shown in the product before a plan is selected.
          </li>
          <li>
            A trial converts only when the organisation chooses a paid plan. Upgrades take effect
            immediately and may generate an invoice for the new period. A downgrade is refused while
            current usage exceeds the target plan, unless the plan permits billable overage.
          </li>
          <li>
            Invoices are due on the date shown. Amounts paid are recorded against the invoice. Late or
            unpaid accounts may lose headroom or be suspended, but operational customer data is not
            deleted solely because a subscription is unpaid.
          </li>
          <li>
            Fees are exclusive of applicable taxes unless stated. The customer is responsible for
            taxes, levies and bank charges not collected by Tenaville.
          </li>
        </LegalList>
        <p>
          Gateway payments are not enabled in the current build. Until they are, invoice and payment
          recording is a manual process and does not by itself constitute a payment to Tenaville.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="5. Acceptable use">
        <p>You must not use Tenaville to:</p>
        <LegalList>
          <li>break Nigerian law, including the NDPA, NCC rules, consumer-protection law or anti-fraud law;</li>
          <li>send spam, purchased lists or marketing without valid consent;</li>
          <li>upload malware or content that infringes another person's rights;</li>
          <li>probe, scrape, overload or bypass access controls, or access another organisation's data;</li>
          <li>misrepresent a payment as confirmed, a document as verified, or a repair as approved when it is not;</li>
          <li>use the service to hold or move customer funds except through a properly licensed partner and agreed model.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="availability" title="6. Availability and support">
        <p>
          Tenaville aims to provide a dependable service but does not promise uninterrupted
          availability. Maintenance, provider outages, network conditions and security events may
          interrupt access. Support channels, response targets and any service-level commitment must
          be agreed in the order form or a separate support schedule.
        </p>
        <p>
          The customer is responsible for its own internet access, devices, staff training and
          business-continuity arrangements.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="7. Intellectual property">
        <p>
          Tenaville and its licensors own the platform, software, design and documentation. The
          customer receives a limited, non-exclusive, non-transferable right to use the service during
          its subscription. The customer retains ownership of its data and grants Tenaville the
          processing rights needed to provide the service, support it and meet legal obligations.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="8. Suspension and termination">
        <p>
          Tenaville may suspend access for material breach, non-payment, security risk or unlawful
          use, and will explain the reason where lawful. On termination, the customer should export
          its data before access ends. Tenaville will return or delete customer data as described in
          the DPA and applicable law, subject to financial-record retention and dispute obligations.
        </p>
        <p>
          Tenaville does not delete operational customer data solely because a subscription is
          unpaid. Export access for a terminated account is subject to identity verification, security
          and any legal retention requirements.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="9. Disclaimers and liability">
        <p>
          Tenaville is a record-keeping and coordination tool. It does not give legal, tax,
          accounting, valuation or investment advice, and does not guarantee a tenant's identity,
          a property's title, a repair's quality or a payment's settlement. Agencies remain
          responsible for their professional, client-money and regulatory obligations.
        </p>
        <p>
          To the extent permitted by Nigerian law, Tenaville is not liable for indirect or
          consequential loss, lost profit, loss of goodwill or data loss caused by the customer or a
          third-party provider. Any aggregate liability cap, exclusions and remedies must be set in
          the signed order form after legal review; this draft does not create a final liability
          position.
        </p>
      </LegalSection>

      <LegalSection id="law" title="10. Governing law and changes">
        <p>
          These terms are intended to be governed by the laws of the Federal Republic of Nigeria. The
          courts or dispute process will be specified in the executed agreement. Tenaville may update
          these terms and will give notice of material changes where required; continued use after the
          effective date means the updated terms apply.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
