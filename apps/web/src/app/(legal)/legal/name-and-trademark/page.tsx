import { LegalList, LegalPage, LegalSection } from '../../../../components/legal/legal-page';

export const metadata = {
  title: 'Name & Trademark Status — Tenaville',
  description:
    'Clearance status for the Tenaville working name, domains, app-store listings and public-use constraints.',
};

const SECTIONS = [
  { id: 'status', label: 'Current status' },
  { id: 'not-claimed', label: 'What we do not claim' },
  { id: 'clearance', label: 'Clearance checklist' },
  { id: 'rename', label: 'Rename scope' },
  { id: 'gate', label: 'Public-use gate' },
];

const STATUS = [
  ['CAC business-name search and reservation', 'Pending', 'No reservation evidenced'],
  ['Nigerian trademark search and application', 'Pending', 'No application evidenced'],
  ['International trademark (where needed)', 'Not started', 'Depends on launch markets'],
  ['Primary domain and variants (.com, .ng, .com.ng)', 'Pending', 'Domain availability and ownership not recorded'],
  ['Email domain and mailbox control', 'Pending', 'Current addresses are provisional'],
  ['App Store and Google Play names', 'Not started', 'No developer listing reserved'],
  ['Social handles and brand accounts', 'Not started', 'No public accounts claimed'],
  ['Company/contracting entity and RC number', 'Pending', 'Not published in the policies'],
] as const;

export default function NameAndTrademarkPage() {
  return (
    <LegalPage
      title="Name & Trademark Status"
      summary="Tenaville is a working product name, not a cleared brand. This page records the current clearance position and the gates that must close before any public use, to avoid making a claim the business cannot support."
      sections={SECTIONS}
    >
      <LegalSection id="status" title="1. Current status">
        <p>
          The name “Tenaville” is used in development, internal documentation and the draft product.
          No registered trademark, CAC business-name reservation, domain ownership or app-store
          listing has been evidenced in this repository. The contracting entity and registered
          address are also unpublished.
        </p>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface2 text-xs uppercase tracking-wide text-subtle">
              <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Note</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {STATUS.map(([item, status, note]) => (
                <tr key={item}>
                  <td className="px-4 py-3 font-medium">{item}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning-text">
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="not-claimed" title="2. What we do not claim">
        <LegalList>
          <li>No claim that “Tenaville” is a registered trademark or that the name is available for use.</li>
          <li>Do not use the ® symbol. Do not use ™ as a claim of registration; any ™ use must be reviewed.</li>
          <li>No claim of exclusivity, endorsement, partnership or title certification.</li>
          <li>No claim that a domain, social handle or app-store name is reserved.</li>
          <li>No public marketing should present the name as final until the clearance gate is closed.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="clearance" title="3. Clearance checklist">
        <LegalList>
          <li>Search the CAC business-name register and reserve the chosen name.</li>
          <li>Commission a Nigerian trademark search in the relevant classes (software/SaaS, property services, advertising/business services as applicable) and file the application.</li>
          <li>Check whether an earlier mark or trading name creates a material confusion risk; record the advice.</li>
          <li>Secure the primary domain and the defensive variants that matter, including the email domain.</li>
          <li>Reserve the App Store and Google Play names and developer accounts.</li>
          <li>Secure social handles and brand accounts, or document why they are not needed.</li>
          <li>Identify the contracting entity, RC number and registered address; publish them in the legal pages and order form.</li>
          <li>Update the brand assets and wordmark only after clearance; keep the old name out of public material if it is replaced.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="rename" title="4. Rename scope if clearance fails">
        <p>
          The name appears in package names, repository paths, email addresses, document templates,
          storage paths, support copy and brand assets. A rename is therefore more than a logo change.
          At minimum the team must update:
        </p>
        <LegalList>
          <li>Customer-facing text, legal pages, email signatures and support templates.</li>
          <li>Domains, auth redirect URLs, email sender identities and app-store identifiers.</li>
          <li>Package names and published workspace names; database identifiers should not depend on the brand where avoidable.</li>
          <li>Contracts, invoices, privacy notices and DPA templates.</li>
          <li>Brand assets, favicon, social handles and all screenshots.</li>
        </LegalList>
        <p>
          A naming decision should be recorded as a product/legal decision, not only a design change.
        </p>
      </LegalSection>

      <LegalSection id="gate" title="5. Public-use gate">
        <p>
          The following must be true before the name is used publicly: a completed search and written
          legal opinion, a filed or registered mark strategy, owned domains, reserved app-store names,
          a published legal entity, and updated legal pages. This page is a status record, not a
          trademark opinion or a guarantee of availability.
        </p>
        <p>
          Owner: Founder, with Nigerian counsel and the product lead. Update this page when each item
          is evidenced, and remove the “pending” status only when there is a document behind it.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
