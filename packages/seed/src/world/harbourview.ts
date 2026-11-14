import type { OrgSpec } from './types';

const FAC_FLAT = ['Prepaid meter', 'Borehole', 'Standby generator', 'Parking', '24h security'];
const FAC_PREMIUM = [...FAC_FLAT, 'Lift', 'Air conditioning', 'Water heater', 'CCTV', 'Gym'];
const FAC_BASIC = ['Prepaid meter', 'Borehole', 'Security post'];
const FAC_OFFICE = ['Prepaid meter', 'Standby generator', 'Parking', 'Fibre internet', 'CCTV'];

/**
 * The large agency: a multi-branch Lagos firm on the Growth plan. This is the
 * organisation the investor walkthrough lives in — a full portfolio, twelve
 * months of collections, six landlords with different mandates, a repair queue
 * with a live approval, and a few tenants who pay late.
 */
export const harbourview: OrgSpec = {
  key: 'harbourview',
  name: 'Harbourview Property Partners',
  type: 'agency',
  plan: 'growth_monthly',
  receiptPrefix: 'HVP',
  maintenanceThresholdNaira: 150_000,
  story:
    'Large Lagos agency, three branches, ~158 units for six landlords. Growth plan. ' +
    'Twelve months of rent collections, remittances and issued statements; one repair ' +
    'awaiting landlord approval; a handful of arrears and expiring leases.',
  branches: [
    { key: 'lekki', name: 'Lekki', receiptPrefix: 'LK' },
    { key: 'island', name: 'Island', receiptPrefix: 'IS' },
    { key: 'mainland', name: 'Mainland', receiptPrefix: 'ML' },
  ],
  staff: [
    { handle: 'md', name: 'Folasade Adebayo-Coker', role: 'owner', title: 'Managing Director', scope: 'organisation' },
    { handle: 'ops', name: 'Emeka Nwankwo', role: 'admin', title: 'Head of Operations', scope: 'organisation' },
    {
      handle: 'pm.lekki', name: 'Tunde Bakare', role: 'property_manager', title: 'Property Manager, Lekki',
      branch: 'lekki',
      scope: { properties: ['lekki-gardens-c', 'admiralty-terraces', 'ajah-gardens', 'sangotedo-villas'] },
    },
    {
      handle: 'pm.island', name: 'Hauwa Mohammed', role: 'property_manager', title: 'Property Manager, Island',
      branch: 'island',
      scope: { properties: ['banana-court', 'ozumba-heights'] },
    },
    {
      handle: 'pm.mainland', name: 'Kelechi Obi', role: 'property_manager', title: 'Property Manager, Mainland',
      branch: 'mainland',
      scope: {
        properties: [
          'magodo-close', 'maryland-plaza', 'allen-business-centre', 'surulere-court',
          'yaba-tech-lofts', 'gra-residences',
        ],
      },
    },
    {
      handle: 'agent.lekki', name: 'Ifeoma Chukwu', role: 'letting_agent', title: 'Letting Agent',
      branch: 'lekki', scope: { landlords: ['eze-obi', 'okeke'] },
    },
    {
      handle: 'agent.island', name: 'Bola Adesanya', role: 'letting_agent', title: 'Letting Agent',
      branch: 'island', scope: { landlords: ['fashola', 'ridgeline'] },
    },
    {
      handle: 'caretaker.lekki', name: 'Sunday Etim', role: 'caretaker', title: 'Caretaker, Lekki Gardens',
      scope: { properties: ['lekki-gardens-c', 'admiralty-terraces'] },
    },
    {
      handle: 'caretaker.surulere', name: 'Musa Ibrahim', role: 'caretaker', title: 'Caretaker, Surulere',
      scope: { properties: ['surulere-court', 'yaba-tech-lofts'] },
    },
    { handle: 'maintenance', name: 'Ngozi Okafor', role: 'maintenance_coordinator', title: 'Maintenance Coordinator', scope: 'organisation' },
    { handle: 'accounts', name: 'Tosin Ogunleye', role: 'accountant', title: 'Senior Accountant', scope: 'organisation' },
    { handle: 'accounts2', name: 'Yetunde Salami', role: 'accountant', title: 'Accounts Officer', scope: 'organisation' },
    {
      handle: 'agent.new', name: 'Chidi Anene', role: 'letting_agent', title: 'Letting Agent (invited)',
      scope: { landlords: ['danladi'] }, invited: true,
    },
  ],
  landlords: [
    {
      key: 'fashola', name: 'Chief (Dr.) Olumide Fashola', isOrganisation: false, state: 'LA',
      address: '14 Glover Road, Ikoyi, Lagos', channel: 'whatsapp', portalLogin: true,
      mandate: { type: 'percentage', rateBps: 1000, schedule: 'monthly' },
      bank: { bank: 'Guaranty Trust Bank', accountName: 'Olumide Fashola' },
      notes: 'Prefers WhatsApp updates; wants statements by the 10th.',
    },
    {
      key: 'eze-obi', name: 'Mrs. Amaka Eze-Obi', isOrganisation: false, state: 'LA',
      address: '7 Admiralty Way, Lekki Phase 1, Lagos', channel: 'whatsapp', portalLogin: true,
      mandate: { type: 'percentage', rateBps: 1000, schedule: 'monthly' },
      bank: { bank: 'Access Bank', accountName: 'Amaka Eze-Obi' },
    },
    {
      key: 'danladi', name: 'Alhaji Garba Danladi', isOrganisation: false, state: 'LA',
      address: '22 Ikeja GRA, Lagos', channel: 'phone',
      mandate: { type: 'percentage', rateBps: 800, schedule: 'quarterly' },
      bank: { bank: 'Zenith Bank', accountName: 'Garba Danladi' },
      notes: 'Quarterly remittance by agreement; negotiated 8% commission.',
    },
    {
      key: 'ridgeline', name: 'Ridgeline Capital Ltd', isOrganisation: true, state: 'LA',
      address: '3 Billings Way, Oregun, Ikeja, Lagos', channel: 'email', portalLogin: true,
      mandate: { type: 'percentage', rateBps: 750, schedule: 'monthly' },
      bank: { bank: 'United Bank for Africa', accountName: 'Ridgeline Capital Limited' },
      notes: 'Commercial portfolio. Finance team receives statements by email.',
    },
    {
      key: 'adeyemi-trust', name: 'The Adeyemi Family Trust', isOrganisation: true, state: 'LA',
      address: '9 Bode Thomas Street, Surulere, Lagos', channel: 'phone',
      mandate: { type: 'percentage', rateBps: 1000, schedule: 'monthly' },
      bank: { bank: 'First Bank of Nigeria', accountName: 'Adeyemi Family Trust' },
    },
    {
      key: 'okeke', name: 'Barr. Chinwe Okeke', isOrganisation: false, state: 'LA',
      address: '5 Lekki-Epe Expressway, Ajah, Lagos', channel: 'sms',
      mandate: { type: 'fixed', fixedNaira: 20_000, schedule: 'monthly' },
      bank: { bank: 'Fidelity Bank', accountName: 'Chinwe Okeke' },
      notes: 'Flat fee of ₦20,000 per rent receipt, agreed at onboarding.',
    },
  ],
  properties: [
    {
      key: 'banana-court', landlord: 'fashola', name: 'Banana Court', reference: 'HVP-P001',
      type: 'residential', address: '12 Bourdillon Road, Ikoyi', state: 'LA', lga: 'Eti-Osa',
      area: 'Ikoyi', latitude: 6.4549, longitude: 3.4246, branch: 'island',
      serviceChargeNaira: 1_200_000,
      groups: [
        { prefix: 'Flat', count: 8, type: 'flat', bedrooms: 3, bathrooms: 4, sqm: [190, 240], annualRentNaira: [14_000_000, 22_000_000], facilities: FAC_PREMIUM },
      ],
    },
    {
      key: 'ozumba-heights', landlord: 'fashola', name: 'Ozumba Heights', reference: 'HVP-P002',
      type: 'residential', address: '41 Ozumba Mbadiwe Avenue, Victoria Island', state: 'LA', lga: 'Eti-Osa',
      area: 'Victoria Island', latitude: 6.4281, longitude: 3.4219, branch: 'island',
      serviceChargeNaira: 900_000,
      groups: [
        { prefix: 'Apt', count: 12, type: 'flat', bedrooms: 2, bathrooms: 3, sqm: [120, 150], annualRentNaira: [8_000_000, 11_500_000], facilities: FAC_PREMIUM },
      ],
    },
    {
      key: 'lekki-gardens-c', landlord: 'eze-obi', name: 'Lekki Gardens Phase 2, Block C', reference: 'HVP-P003',
      type: 'residential', address: 'Block C, Lekki Gardens Estate, Lekki Phase 1', state: 'LA', lga: 'Eti-Osa',
      area: 'Lekki Phase 1', latitude: 6.4474, longitude: 3.4723, branch: 'lekki',
      serviceChargeNaira: 450_000,
      groups: [
        { prefix: 'Flat', count: 8, type: 'flat', bedrooms: 2, bathrooms: 2, sqm: [95, 115], annualRentNaira: [4_500_000, 5_800_000], facilities: FAC_FLAT },
        { prefix: 'Maisonette', count: 6, type: 'duplex', bedrooms: 3, bathrooms: 3, sqm: [150, 180], annualRentNaira: [6_200_000, 7_500_000], facilities: FAC_FLAT },
      ],
    },
    {
      key: 'admiralty-terraces', landlord: 'eze-obi', name: 'Admiralty Terraces', reference: 'HVP-P004',
      type: 'residential', address: '18 Admiralty Way, Lekki Phase 1', state: 'LA', lga: 'Eti-Osa',
      area: 'Lekki Phase 1', latitude: 6.4401, longitude: 3.4688, branch: 'lekki',
      serviceChargeNaira: 600_000,
      groups: [
        { prefix: 'Terrace', count: 10, type: 'duplex', bedrooms: 4, bathrooms: 5, sqm: [260, 320], annualRentNaira: [9_500_000, 13_000_000], facilities: FAC_PREMIUM },
      ],
    },
    {
      key: 'magodo-close', landlord: 'danladi', name: 'Magodo Close', reference: 'HVP-P005',
      type: 'estate', address: '6 Isheri Road, Magodo Phase 2', state: 'LA', lga: 'Kosofe',
      area: 'Magodo', latitude: 6.6148, longitude: 3.3869, branch: 'mainland',
      serviceChargeNaira: 300_000,
      groups: [
        { prefix: 'House', count: 10, type: 'bungalow', bedrooms: 3, bathrooms: 3, sqm: [180, 220], annualRentNaira: [3_600_000, 5_200_000], facilities: FAC_FLAT },
      ],
    },
    {
      key: 'maryland-plaza', landlord: 'ridgeline', name: 'Maryland Plaza', reference: 'HVP-P006',
      type: 'commercial', address: '28 Ikorodu Road, Maryland', state: 'LA', lga: 'Ikeja',
      area: 'Maryland', latitude: 6.5667, longitude: 3.3622, branch: 'mainland',
      serviceChargeNaira: 350_000,
      groups: [
        { prefix: 'Shop', count: 10, type: 'shop', bedrooms: 0, bathrooms: 1, sqm: [24, 60], annualRentNaira: [2_200_000, 5_500_000], facilities: ['Prepaid meter', 'Security post', 'Parking'], commercial: true },
        { prefix: 'Suite', count: 6, type: 'office', bedrooms: 0, bathrooms: 1, sqm: [45, 90], annualRentNaira: [4_000_000, 9_000_000], facilities: FAC_OFFICE, commercial: true },
      ],
    },
    {
      key: 'allen-business-centre', landlord: 'ridgeline', name: 'Allen Avenue Business Centre', reference: 'HVP-P007',
      type: 'commercial', address: '95 Allen Avenue, Ikeja', state: 'LA', lga: 'Ikeja',
      area: 'Allen Avenue', latitude: 6.6018, longitude: 3.3515, branch: 'mainland',
      serviceChargeNaira: 500_000,
      groups: [
        { prefix: 'Office', count: 14, type: 'office', bedrooms: 0, bathrooms: 1, sqm: [40, 110], annualRentNaira: [3_000_000, 8_000_000], facilities: FAC_OFFICE, commercial: true },
      ],
    },
    {
      key: 'surulere-court', landlord: 'adeyemi-trust', name: 'Surulere Court', reference: 'HVP-P008',
      type: 'residential', address: '33 Adeniran Ogunsanya Street, Surulere', state: 'LA', lga: 'Surulere',
      area: 'Surulere', latitude: 6.5003, longitude: 3.3541, branch: 'mainland',
      groups: [
        { prefix: 'Room', count: 8, type: 'self_contained', bedrooms: 1, bathrooms: 1, sqm: [28, 36], annualRentNaira: [900_000, 1_300_000], facilities: FAC_BASIC },
        { prefix: 'Flat', count: 10, type: 'flat', bedrooms: 2, bathrooms: 2, sqm: [70, 90], annualRentNaira: [1_700_000, 2_400_000], facilities: FAC_BASIC },
      ],
    },
    {
      key: 'yaba-tech-lofts', landlord: 'adeyemi-trust', name: 'Yaba Tech Lofts', reference: 'HVP-P009',
      type: 'residential', address: '5 Herbert Macaulay Way, Yaba', state: 'LA', lga: 'Lagos Mainland',
      area: 'Yaba', latitude: 6.5095, longitude: 3.3711, branch: 'mainland',
      groups: [
        { prefix: 'Studio', count: 8, type: 'flat', bedrooms: 0, bathrooms: 1, sqm: [32, 42], annualRentNaira: [1_100_000, 1_500_000], facilities: [...FAC_BASIC, 'Fibre internet'] },
        { prefix: 'Loft', count: 8, type: 'flat', bedrooms: 1, bathrooms: 1, sqm: [50, 64], annualRentNaira: [1_700_000, 2_200_000], facilities: [...FAC_BASIC, 'Fibre internet', 'Standby generator'] },
      ],
    },
    {
      key: 'ajah-gardens', landlord: 'okeke', name: 'Ajah Gardens', reference: 'HVP-P010',
      type: 'residential', address: '2 Abraham Adesanya Road, Ajah', state: 'LA', lga: 'Eti-Osa',
      area: 'Ajah', latitude: 6.4698, longitude: 3.5852, branch: 'lekki',
      groups: [
        { prefix: 'Room', count: 12, type: 'self_contained', bedrooms: 1, bathrooms: 1, sqm: [26, 34], annualRentNaira: [600_000, 950_000], facilities: FAC_BASIC },
        { prefix: 'Flat', count: 8, type: 'flat', bedrooms: 2, bathrooms: 2, sqm: [65, 80], annualRentNaira: [1_100_000, 1_400_000], facilities: FAC_BASIC },
      ],
    },
    {
      key: 'sangotedo-villas', landlord: 'okeke', name: 'Sangotedo Villas', reference: 'HVP-P011',
      type: 'estate', address: '14 Monastery Road, Sangotedo', state: 'LA', lga: 'Eti-Osa',
      area: 'Sangotedo', latitude: 6.4627, longitude: 3.6392, branch: 'lekki',
      serviceChargeNaira: 240_000,
      groups: [
        { prefix: 'Villa', count: 12, type: 'flat', bedrooms: 2, bathrooms: 2, sqm: [88, 105], annualRentNaira: [1_800_000, 3_000_000], facilities: FAC_FLAT },
      ],
    },
    {
      key: 'gra-residences', landlord: 'danladi', name: 'Ikeja GRA Residences', reference: 'HVP-P012',
      type: 'residential', address: '10 Isaac John Street, GRA, Ikeja', state: 'LA', lga: 'Ikeja',
      area: 'Ikeja GRA', latitude: 6.5834, longitude: 3.3489, branch: 'mainland',
      serviceChargeNaira: 420_000,
      groups: [
        { prefix: 'Flat', count: 8, type: 'flat', bedrooms: 3, bathrooms: 3, sqm: [150, 190], annualRentNaira: [6_000_000, 9_000_000], facilities: FAC_PREMIUM },
      ],
    },
  ],
  tuning: {
    occupancy: 0.88,
    reservedUnits: 2,
    underMaintenanceUnits: 2,
    renewalShare: 0.35,
    terminatedLeases: 4,
    expiredLeases: 4,
    draftLeases: 3,
    expiringSoon: 12,
    frequencyMix: [['annual', 0.38], ['half_yearly', 0.17], ['quarterly', 0.27], ['monthly', 0.18]],
    behaviour: [['prompt', 0.52], ['usual', 0.25], ['slow', 0.1], ['partial', 0.08], ['defaulter', 0.05]],
    maintenanceRequests: 34,
    tenantPortalLogins: 8,
    vendors: 10,
    invoiceMonths: 6,
    reversedPayments: 3,
  },
};
