import type { OrgSpec } from './types';

const FAC_FLAT = ['Prepaid meter', 'Borehole', 'Standby generator', 'Parking', '24h security'];
const FAC_BASIC = ['Prepaid meter', 'Borehole', 'Security post'];
const FAC_OFFICE = ['Prepaid meter', 'Standby generator', 'Parking', 'Fibre internet', 'CCTV'];

/**
 * The mid-size agency: an Abuja firm on the Agent plan with a lean five-person
 * team. It shows the product at the size most early customers will be, and the
 * quarterly-remittance and flat-fee mandates that Lagos does not cover.
 */
export const garki: OrgSpec = {
  key: 'garki',
  name: 'Garki Gate Estates',
  type: 'agency',
  plan: 'agent_monthly',
  receiptPrefix: 'GGE',
  maintenanceThresholdNaira: 100_000,
  story:
    'Mid-size Abuja agency, five staff, ~62 units for four landlords. Agent plan. ' +
    'Mix of Maitama flats, Wuse 2 offices and Gwarinpa estate units with service charges.',
  branches: [],
  staff: [
    { handle: 'md', name: 'Hajiya Rakiya Lawal-Bello', role: 'owner', title: 'Managing Director', scope: 'organisation' },
    {
      handle: 'pm', name: 'Daniel Ochigbo', role: 'property_manager', title: 'Property Manager',
      scope: {
        properties: [
          'maitama-residences', 'wuse2-commerce-hub', 'gwarinpa-court', 'garki-annex',
          'lugbe-estate', 'jabi-lakeside',
        ],
      },
    },
    {
      handle: 'agent', name: 'Zainab Mahmud', role: 'letting_agent', title: 'Letting Agent',
      scope: { landlords: ['waziri', 'ibekwe', 'odeh'] },
    },
    { handle: 'accounts', name: 'Peter Okoro', role: 'accountant', title: 'Accountant', scope: 'organisation' },
    {
      handle: 'caretaker', name: 'Sani Abdulkadir', role: 'caretaker', title: 'Caretaker, Gwarinpa',
      scope: { properties: ['gwarinpa-court', 'garki-annex'] },
    },
  ],
  landlords: [
    {
      key: 'waziri', name: 'Engr. Aminu Waziri', isOrganisation: false, state: 'FC',
      address: '4 Gana Street, Maitama, Abuja', channel: 'whatsapp', portalLogin: true,
      mandate: { type: 'percentage', rateBps: 1000, schedule: 'quarterly' },
      bank: { bank: 'Zenith Bank', accountName: 'Aminu Waziri' },
    },
    {
      key: 'ibekwe', name: 'Mrs. Joy Ibekwe', isOrganisation: false, state: 'FC',
      address: '17 Third Avenue, Gwarinpa, Abuja', channel: 'sms', portalLogin: true,
      mandate: { type: 'percentage', rateBps: 1000, schedule: 'monthly' },
      bank: { bank: 'Access Bank', accountName: 'Joy Ibekwe' },
    },
    {
      key: 'kaduna-heritage', name: 'Kaduna Heritage Holdings Ltd', isOrganisation: true, state: 'FC',
      address: '21 Aminu Kano Crescent, Wuse 2, Abuja', channel: 'email',
      mandate: { type: 'percentage', rateBps: 700, schedule: 'monthly' },
      bank: { bank: 'Stanbic IBTC', accountName: 'Kaduna Heritage Holdings Limited' },
      notes: 'Commercial landlord. Negotiated 7% on a ten-year management agreement.',
    },
    {
      key: 'odeh', name: 'Dr. Samuel Odeh', isOrganisation: false, state: 'FC',
      address: '8 Lugbe Estate Road, Abuja', channel: 'phone',
      mandate: { type: 'percentage', rateBps: 1200, schedule: 'monthly' },
      bank: { bank: 'Fidelity Bank', accountName: 'Samuel Odeh' },
    },
  ],
  properties: [
    {
      key: 'maitama-residences', landlord: 'waziri', name: 'Maitama Residences', reference: 'GGE-P001',
      type: 'residential', address: '11 Aguiyi Ironsi Street, Maitama', state: 'FC', lga: 'Abuja Municipal',
      area: 'Maitama', latitude: 9.0912, longitude: 7.4936,
      serviceChargeNaira: 800_000,
      groups: [
        { prefix: 'Flat', count: 6, type: 'flat', bedrooms: 3, bathrooms: 4, sqm: [180, 220], annualRentNaira: [9_000_000, 14_000_000], facilities: [...FAC_FLAT, 'Lift', 'Air conditioning'] },
      ],
    },
    {
      key: 'wuse2-commerce-hub', landlord: 'kaduna-heritage', name: 'Wuse 2 Commerce Hub', reference: 'GGE-P002',
      type: 'commercial', address: '30 Adetokunbo Ademola Crescent, Wuse 2', state: 'FC', lga: 'Abuja Municipal',
      area: 'Wuse 2', latitude: 9.0765, longitude: 7.4698,
      serviceChargeNaira: 450_000,
      groups: [
        { prefix: 'Suite', count: 12, type: 'office', bedrooms: 0, bathrooms: 1, sqm: [40, 100], annualRentNaira: [3_500_000, 8_000_000], facilities: FAC_OFFICE, commercial: true },
        { prefix: 'Shop', count: 4, type: 'shop', bedrooms: 0, bathrooms: 1, sqm: [25, 45], annualRentNaira: [2_800_000, 4_500_000], facilities: ['Prepaid meter', 'Security post'], commercial: true },
      ],
    },
    {
      key: 'gwarinpa-court', landlord: 'ibekwe', name: 'Gwarinpa Court', reference: 'GGE-P003',
      type: 'estate', address: 'Plot 214, 6th Avenue, Gwarinpa', state: 'FC', lga: 'Abuja Municipal',
      area: 'Gwarinpa', latitude: 9.1108, longitude: 7.4041,
      serviceChargeNaira: 180_000,
      groups: [
        { prefix: 'Flat', count: 8, type: 'flat', bedrooms: 2, bathrooms: 2, sqm: [85, 100], annualRentNaira: [3_000_000, 4_000_000], facilities: FAC_FLAT },
        { prefix: 'Flat', count: 6, type: 'flat', bedrooms: 3, bathrooms: 3, sqm: [120, 140], annualRentNaira: [4_500_000, 5_500_000], facilities: FAC_FLAT },
      ],
    },
    {
      key: 'garki-annex', landlord: 'ibekwe', name: 'Garki Annex', reference: 'GGE-P004',
      type: 'residential', address: '9 Moshood Abiola Way, Area 11, Garki', state: 'FC', lga: 'Abuja Municipal',
      area: 'Garki', latitude: 9.0231, longitude: 7.4878,
      groups: [
        { prefix: 'Room', count: 6, type: 'self_contained', bedrooms: 1, bathrooms: 1, sqm: [28, 35], annualRentNaira: [1_100_000, 1_500_000], facilities: FAC_BASIC },
        { prefix: 'Flat', count: 4, type: 'flat', bedrooms: 1, bathrooms: 1, sqm: [48, 58], annualRentNaira: [1_700_000, 2_200_000], facilities: FAC_BASIC },
      ],
    },
    {
      key: 'lugbe-estate', landlord: 'odeh', name: 'Lugbe Estate Phase 1', reference: 'GGE-P005',
      type: 'estate', address: '3 Airport Road, Lugbe', state: 'FC', lga: 'Abuja Municipal',
      area: 'Lugbe', latitude: 8.9714, longitude: 7.3866,
      serviceChargeNaira: 150_000,
      groups: [
        { prefix: 'House', count: 8, type: 'bungalow', bedrooms: 3, bathrooms: 3, sqm: [150, 190], annualRentNaira: [2_800_000, 4_000_000], facilities: FAC_FLAT },
      ],
    },
    {
      key: 'jabi-lakeside', landlord: 'waziri', name: 'Jabi Lakeside Apartments', reference: 'GGE-P006',
      type: 'residential', address: '1 Ahmadu Bello Way, Jabi', state: 'FC', lga: 'Abuja Municipal',
      area: 'Jabi', latitude: 9.0732, longitude: 7.4228,
      serviceChargeNaira: 600_000,
      groups: [
        { prefix: 'Apt', count: 8, type: 'flat', bedrooms: 2, bathrooms: 3, sqm: [105, 130], annualRentNaira: [6_000_000, 9_000_000], facilities: [...FAC_FLAT, 'Lift', 'Gym'] },
      ],
    },
  ],
  tuning: {
    occupancy: 0.85,
    reservedUnits: 1,
    underMaintenanceUnits: 1,
    renewalShare: 0.3,
    terminatedLeases: 2,
    expiredLeases: 2,
    draftLeases: 2,
    expiringSoon: 6,
    frequencyMix: [['annual', 0.5], ['half_yearly', 0.2], ['quarterly', 0.2], ['monthly', 0.1]],
    behaviour: [['prompt', 0.45], ['usual', 0.28], ['slow', 0.12], ['partial', 0.1], ['defaulter', 0.05]],
    maintenanceRequests: 16,
    tenantPortalLogins: 4,
    vendors: 7,
    invoiceMonths: 5,
    reversedPayments: 1,
  },
};
