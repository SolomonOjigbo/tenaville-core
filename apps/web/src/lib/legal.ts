/**
 * Legal page constants.
 *
 * Tenaville is still a working name and the contracting entity is not yet
 * published. These values are deliberately centralised so counsel can replace
 * them in one place before launch rather than across every policy.
 */
export const LEGAL_LAST_UPDATED = '13 November 2026';
export const LEGAL_REVIEW_STATUS = 'Draft for Nigerian counsel review';

export const LEGAL_ENTITY = 'Tenaville (working name)';
export const LEGAL_ENTITY_NOTE =
  'The contracting entity, RC number, registered address and official domain will be published here before launch. Contact addresses are provisional until the domain is cleared.';

export const PRIVACY_EMAIL = 'privacy@tenaville.ng';
export const LEGAL_EMAIL = 'legal@tenaville.ng';
export const SECURITY_EMAIL = 'security@tenaville.ng';
export const SUPPORT_EMAIL = 'support@tenaville.ng';

export interface LegalPageLink {
  readonly href: string;
  readonly title: string;
  readonly summary: string;
  readonly status: 'Draft' | 'Pending clearance' | 'Template';
}

export const LEGAL_PAGES: readonly LegalPageLink[] = [
  {
    href: '/legal/privacy',
    title: 'Privacy Notice',
    summary:
      'What personal data Tenaville processes, why, who it is shared with, how long it is kept, and the rights available under the Nigeria Data Protection Act.',
    status: 'Draft',
  },
  {
    href: '/legal/terms',
    title: 'Terms of Service',
    summary:
      'The draft terms for using the Tenaville platform, including accounts, subscriptions, customer responsibilities and acceptable use.',
    status: 'Draft',
  },
  {
    href: '/legal/data-processing-agreement',
    title: 'Data Processing Agreement',
    summary:
      'The controller-to-processor template for agencies that use Tenaville to manage tenant, landlord and property data.',
    status: 'Template',
  },
  {
    href: '/legal/data-requests',
    title: 'Data Subject Requests',
    summary:
      'How to request access, correction, deletion, restriction, portability or withdrawal of consent, and what happens next.',
    status: 'Draft',
  },
  {
    href: '/legal/messaging-policy',
    title: 'Messaging Policy',
    summary:
      'Consent, WhatsApp templates, operational versus marketing messages, quiet hours, opt-outs and provider rules for WhatsApp, SMS and email.',
    status: 'Draft',
  },
  {
    href: '/legal/client-money-policy',
    title: 'Client Money Policy',
    summary:
      'How rent, deposits and landlord funds are separated in the ledger, reconciled and remitted — and why Tenaville does not hold customer funds.',
    status: 'Draft',
  },
  {
    href: '/legal/name-and-trademark',
    title: 'Name & Trademark Status',
    summary:
      'The current clearance status of the Tenaville working name, domains, app-store listings and the actions required before public use.',
    status: 'Pending clearance',
  },
];
