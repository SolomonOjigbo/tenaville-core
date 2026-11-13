import { LegalList, LegalPage, LegalSection } from '../../../../components/legal/legal-page';

export const metadata = {
  title: 'Messaging Policy — Tenaville',
  description:
    'Consent, template, quiet-hour, opt-out and provider rules for WhatsApp, SMS and email sent through Tenaville.',
};

const SECTIONS = [
  { id: 'scope', label: 'Scope and status' },
  { id: 'roles', label: 'Who decides what is sent' },
  { id: 'consent', label: 'Consent and lawful basis' },
  { id: 'purpose', label: 'Operational vs marketing' },
  { id: 'whatsapp', label: 'WhatsApp templates' },
  { id: 'content', label: 'Content standards' },
  { id: 'timing', label: 'Timing and frequency' },
  { id: 'optout', label: 'Opting out' },
  { id: 'delivery', label: 'Delivery and fallback' },
  { id: 'data', label: 'Data, providers and costs' },
  { id: 'abuse', label: 'Abuse and reporting' },
];

export default function MessagingPolicyPage() {
  return (
    <LegalPage
      title="Messaging Policy"
      summary="Rules for WhatsApp, SMS and email sent through Tenaville. The agency decides the message and the recipient; Tenaville provides the channel, templates and delivery log within provider and Nigerian law."
      sections={SECTIONS}
    >
      <LegalSection id="scope" title="1. Scope and current status">
        <p>
          This policy covers business messages sent from the Tenaville platform to staff, tenants,
          landlords, applicants and other contacts, plus message templates, delivery attempts and
          preferences.
        </p>
        <p className="rounded-md bg-warning-soft px-4 py-3 text-warning-text">
          <strong>Current build status:</strong> the platform uses a logging provider. It records what
          would have been sent and reports a successful log, but it does not contact WhatsApp, SMS or
          email. No policy statement here should be read as a claim that a message reached a person
          until a production provider is connected and the screen says so.
        </p>
      </LegalSection>

      <LegalSection id="roles" title="2. Who decides what is sent">
        <p>
          The agency is the controller and decides the purpose, recipients, timing and content. It is
          responsible for consent, opt-outs and the accuracy of the data it uses. Tenaville is the
          processor and sends on documented instructions, subject to provider rules and the law.
        </p>
        <p>
          A message sent by an agency user is that agency's message. Tenaville does not endorse its
          content and may block a send that appears unlawful, abusive or contrary to provider policy.
        </p>
      </LegalSection>

      <LegalSection id="consent" title="3. Consent and lawful basis">
        <LegalList>
          <li>
            Operational messages about an existing tenancy, repair, receipt, statement or account may
            rely on contract or legitimate interests, not marketing consent.
          </li>
          <li>
            Marketing, promotions, cross-selling and optional updates require a valid opt-in that is
            specific, informed and recorded. Silence or a pre-ticked box is not consent.
          </li>
          <li>
            WhatsApp business-initiated messages require the recipient's WhatsApp opt-in under Meta's
            policy, in addition to any NDPA basis.
          </li>
          <li>Do not use purchased, scraped or shared contact lists.</li>
          <li>Keep evidence of when and how consent was given, and honour withdrawal promptly.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="purpose" title="4. Operational versus marketing">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface2 text-xs uppercase tracking-wide text-subtle">
              <tr><th className="px-4 py-3">Operational</th><th className="px-4 py-3">Marketing</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3">
                  Rent due or received, receipt, statement, arrears follow-up, lease expiry, repair
                  acknowledgement/assignment/completion, safety notice, account or security notice.
                </td>
                <td className="px-4 py-3">
                  New services, promotions, referral requests, newsletters, cross-selling or anything
                  whose main purpose is to promote a product.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">May be sent when necessary for the tenancy or account, subject to preferences.</td>
                <td className="px-4 py-3">Only with a recorded opt-in; stop immediately on opt-out.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="whatsapp" title="5. WhatsApp templates and provider rules">
        <LegalList>
          <li>
            Business-initiated WhatsApp messages must use a template approved by Meta/WhatsApp for the
            relevant category. An unapproved template must not be sent.
          </li>
          <li>
            Template variables must be accurate and must not be used to insert misleading or
            prohibited content. A template approval is not a guarantee that a particular send is
            lawful.
          </li>
          <li>
            WhatsApp's business and commerce policies apply, including restrictions on prohibited
            goods, financial scams, health claims and spam.
          </li>
          <li>
            If a template is rejected or paused, the platform should fall back to SMS or email where
            an address exists and the content is suitable, and record why WhatsApp was skipped.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="content" title="6. Content standards">
        <LegalList>
          <li>Identify the agency clearly; do not pretend to be the recipient's bank, lawyer or a government body.</li>
          <li>Do not include passwords, full card numbers, full NIN/BVN, access codes or unnecessary identity documents.</li>
          <li>Do not state that a payment is confirmed unless the payment record says it is confirmed.</li>
          <li>Do not promise approval, financing, a repair outcome or legal advice.</li>
          <li>Use plain language and accurate amounts, dates and property references.</li>
          <li>Include a route to opt out of marketing and a way to contact the agency.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="timing" title="7. Timing and frequency">
        <p>
          Unless a safety or legal emergency requires otherwise, operational and marketing messages
          should be sent between 08:00 and 20:00 West Africa Time. Avoid repeated messages about the
          same matter within a short period. The platform should apply provider and agency rate limits,
          and an agency must not use messaging to harass a tenant or contact.
        </p>
      </LegalSection>

      <LegalSection id="optout" title="8. Opting out">
        <p>
          A recipient can opt out of marketing by replying STOP or using the preference centre. The
          agency must record the opt-out and stop promotional messages on that channel. Operational
          messages that are necessary to administer the tenancy, complete a repair, issue a legal
          notice or protect safety may continue where the law allows, but the agency should consider
          channel preferences and minimisation.
        </p>
        <p>
          An opt-out from marketing does not automatically withdraw consent required for a separate
          purpose, and a service message does not revive marketing consent.
        </p>
      </LegalSection>

      <LegalSection id="delivery" title="9. Delivery, fallback and records">
        <p>
          The platform may try WhatsApp first, then SMS, then email, depending on the template and
          available address. A message is not delivered merely because it was queued. Every attempt
          records the channel, status, provider identifier, error and cost where available. A failed
          attempt is never silently discarded, and a fallback does not create a second message record
          without a link to the first.
        </p>
        <p>
          Delivery is not guaranteed. Networks, provider outages, wrong numbers and recipient blocking
          can prevent delivery. The agency remains responsible for any alternative contact needed for
          a legal or safety-critical notice.
        </p>
      </LegalSection>

      <LegalSection id="data" title="10. Data, providers and costs">
        <p>
          Recipient name, address, message content, template, delivery status and related record are
          stored in the message log and shared with the provider used for the chosen channel. The
          Privacy Notice and DPA explain the lawful basis, retention and international-transfer
          position. Message costs reported by a provider are shown to administrators where available;
          the agency is responsible for its messaging budget.
        </p>
      </LegalSection>

      <LegalSection id="abuse" title="11. Abuse and reporting">
        <p>
          Report spam, a suspicious message, a wrong recipient or a provider-policy concern to{' '}
          <a className="text-info-text underline" href="mailto:security@tenaville.ng">
            security@tenaville.ng
          </a>{' '}
          and the agency involved. Tenaville may suspend messaging for an organisation that repeatedly
          breaches this policy, provider rules or the law.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
