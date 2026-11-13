import { DataRequestBuilder } from '../../../../components/legal/data-request-builder';
import { LegalList, LegalPage, LegalSection } from '../../../../components/legal/legal-page';
import { PRIVACY_EMAIL } from '../../../../lib/legal';

export const metadata = {
  title: 'Data Subject Requests — Tenaville',
  description: 'How to make an access, correction, deletion or other data protection request.',
};

const SECTIONS = [
  { id: 'rights', label: 'What you can ask for' },
  { id: 'before', label: 'Before you submit' },
  { id: 'submit', label: 'Make a request' },
  { id: 'process', label: 'What happens next' },
  { id: 'agency', label: 'If an agency is the controller' },
  { id: 'complaints', label: 'Complaints' },
];

export default function DataRequestsPage() {
  return (
    <LegalPage
      title="Data Subject Requests"
      summary="You can ask what personal data Tenaville holds about you, have it corrected or deleted where the law allows, object to certain processing, or withdraw consent. This page explains the route and the checks we must make."
      sections={SECTIONS}
    >
      <LegalSection id="rights" title="1. What you can ask for">
        <LegalList>
          <li>
            <strong>Access:</strong> confirmation of whether we process your data and a copy of it,
            with information about purposes, recipients and retention.
          </li>
          <li>
            <strong>Correction:</strong> correction of inaccurate or incomplete data.
          </li>
          <li>
            <strong>Deletion:</strong> erasure where the data is no longer needed, consent is
            withdrawn, processing is unlawful or another NDPA ground applies. Financial, audit or
            legal records may be retained where required.
          </li>
          <li>
            <strong>Restriction or objection:</strong> ask us to pause or stop certain processing,
            including direct marketing.
          </li>
          <li>
            <strong>Portability:</strong> receive eligible data in a structured, commonly used format.
          </li>
          <li>
            <strong>Consent withdrawal:</strong> withdraw consent for optional processing without
            affecting processing already carried out.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="before" title="2. Before you submit">
        <p>
          Tell us which agency or landlord the record relates to, and whether you are a tenant,
          landlord, staff member or other contact. That helps us find the right controller and records.
          If you are an authorised agent, say so and be ready to show your authority.
        </p>
        <p>
          Do not send passwords, full NIN, BVN, card numbers or identity documents in the first
          message. We may ask for proportionate verification through a secure channel after we receive
          the request.
        </p>
      </LegalSection>

      <LegalSection id="submit" title="3. Make a request">
        <p>
          You can email <a className="text-info-text underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>{' '}
          or use the builder below. The builder creates a message on your device; it does not send or
          store anything until you choose to email it.
        </p>
        <DataRequestBuilder privacyEmail={PRIVACY_EMAIL} />
        <p className="text-xs text-subtle">
          If you cannot use email, contact the agency that holds your tenancy record and ask it to
          forward the request to us.
        </p>
      </LegalSection>

      <LegalSection id="process" title="4. What happens next">
        <LegalList>
          <li>We acknowledge the request and record it in our privacy request log.</li>
          <li>We check whether Tenaville or the agency is the controller and identify the records.</li>
          <li>We verify your identity proportionately, using the least intrusive method available.</li>
          <li>We search the relevant systems, including backups where applicable, and coordinate with the controller.</li>
          <li>We respond by explaining what we did, providing the data or giving a lawful reason why we cannot act.</li>
          <li>If we need more time because the request is complex or numerous, we explain why and give a new date where the law permits.</li>
        </LegalList>
        <p>
          We aim to respond within 30 days. A request is normally free; where Nigerian law permits us
          to refuse a manifestly unfounded or excessive request, or charge a reasonable fee, we will
          explain before acting.
        </p>
      </LegalSection>

      <LegalSection id="agency" title="5. If an agency is the controller">
        <p>
          Most tenancy, landlord, rent, maintenance and document data is controlled by the agency or
          landlord that entered it. We will refer the request to that controller where appropriate and
          assist it. We will not delete or rewrite a controller's record without its documented
          instruction or a lawful obligation.
        </p>
        <p>
          If you are a tenant or landlord, contacting the agency directly may be faster. If you are
          unsure, send the request to us and we will help route it.
        </p>
      </LegalSection>

      <LegalSection id="complaints" title="6. Complaints">
        <p>
          If you are unhappy with our response, tell us at{' '}
          <a className="text-info-text underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>{' '}
          so we can review it. You may also complain to the{' '}
          <a
            className="text-info-text underline"
            href="https://ndpc.gov.ng"
            rel="noreferrer"
            target="_blank"
          >
            Nigeria Data Protection Commission
          </a>
          . We will cooperate with an NDPC inquiry.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
