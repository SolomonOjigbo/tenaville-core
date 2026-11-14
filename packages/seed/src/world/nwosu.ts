import type { OrgSpec } from './types';

const FAC_FLAT = ['Prepaid meter', 'Borehole', 'Standby generator', 'Parking', '24h security'];

/**
 * The individual landlord: one owner managing his own buildings on the
 * Landlord plan, with a daughter as part-time manager and one caretaker. No
 * agency, so no mandate and no commission — rent flows to the ledger untouched.
 * It proves the product serves the smallest customer as well as an agency.
 */
export const nwosu: OrgSpec = {
  key: 'nwosu',
  name: 'Nwosu Family Properties',
  type: 'individual_landlord',
  plan: 'landlord_monthly',
  receiptPrefix: 'NFP',
  maintenanceThresholdNaira: 75_000,
  story:
    'Self-managing landlord in Port Harcourt and Enugu, three buildings, ~22 units. ' +
    'Landlord plan, three seats. No agency commission; repairs approved by the owner.',
  branches: [],
  staff: [
    { handle: 'owner', name: 'Chief Emeka Nwosu', role: 'owner', title: 'Owner', scope: 'organisation' },
    { handle: 'manager', name: 'Ngozi Nwosu-Eke', role: 'property_manager', title: 'Property Manager', scope: 'organisation' },
    {
      handle: 'caretaker', name: 'Okechukwu Anya', role: 'caretaker', title: 'Caretaker',
      scope: { properties: ['nwosu-court-gra', 'trans-amadi-lockups', 'independence-layout'] },
    },
  ],
  landlords: [
    {
      key: 'nwosu', name: 'Chief Emeka Nwosu', isOrganisation: false, state: 'RI',
      address: '12 Evo Road, GRA Phase 2, Port Harcourt', channel: 'whatsapp', isOwnerUser: true,
      bank: { bank: 'First Bank of Nigeria', accountName: 'Emeka Nwosu' },
      notes: 'Self-managed. Receives collections directly; no management mandate.',
    },
  ],
  properties: [
    {
      key: 'nwosu-court-gra', landlord: 'nwosu', name: 'Nwosu Court, Old GRA', reference: 'NFP-P001',
      type: 'residential', address: '12 Evo Road, Old GRA, Port Harcourt', state: 'RI', lga: 'Port Harcourt',
      area: 'Old GRA', latitude: 4.8089, longitude: 7.0115,
      groups: [
        { prefix: 'Flat', count: 8, type: 'flat', bedrooms: 2, bathrooms: 2, sqm: [90, 120], annualRentNaira: [2_400_000, 4_200_000], facilities: FAC_FLAT },
      ],
    },
    {
      key: 'trans-amadi-lockups', landlord: 'nwosu', name: 'Trans-Amadi Lock-ups', reference: 'NFP-P002',
      type: 'commercial', address: '4 Trans-Amadi Industrial Layout, Port Harcourt', state: 'RI', lga: 'Obio/Akpor',
      area: 'Trans-Amadi', latitude: 4.8077, longitude: 7.0488,
      groups: [
        { prefix: 'Shop', count: 6, type: 'shop', bedrooms: 0, bathrooms: 1, sqm: [20, 40], annualRentNaira: [1_800_000, 3_000_000], facilities: ['Prepaid meter', 'Security post'], commercial: true },
        { prefix: 'Store', count: 2, type: 'warehouse', bedrooms: 0, bathrooms: 1, sqm: [120, 200], annualRentNaira: [3_500_000, 4_500_000], facilities: ['Prepaid meter', 'Loading bay'], commercial: true },
      ],
    },
    {
      key: 'independence-layout', landlord: 'nwosu', name: 'Independence Layout Terraces', reference: 'NFP-P003',
      type: 'residential', address: '27 Ogui Road, Independence Layout, Enugu', state: 'EN', lga: 'Enugu North',
      area: 'Independence Layout', latitude: 6.4584, longitude: 7.5464,
      groups: [
        { prefix: 'Flat', count: 6, type: 'flat', bedrooms: 2, bathrooms: 2, sqm: [78, 96], annualRentNaira: [1_200_000, 2_000_000], facilities: FAC_FLAT },
      ],
    },
  ],
  tuning: {
    occupancy: 0.82,
    reservedUnits: 0,
    underMaintenanceUnits: 1,
    renewalShare: 0.35,
    terminatedLeases: 1,
    expiredLeases: 1,
    draftLeases: 1,
    expiringSoon: 3,
    frequencyMix: [['annual', 0.55], ['half_yearly', 0.15], ['quarterly', 0.15], ['monthly', 0.15]],
    behaviour: [['prompt', 0.5], ['usual', 0.3], ['slow', 0.1], ['partial', 0.06], ['defaulter', 0.04]],
    maintenanceRequests: 8,
    tenantPortalLogins: 2,
    vendors: 4,
    invoiceMonths: 4,
    reversedPayments: 0,
  },
};
