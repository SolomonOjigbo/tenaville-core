/**
 * Synthetic people. Every name here is a common Nigerian given name or
 * surname combined at random, so any match with a real person is coincidence.
 * Phone numbers are generated in a pattern chosen to be unlikely to be
 * assigned — see `syntheticPhone`. No message provider is wired to staging,
 * so nothing seeded here is ever sent.
 */

import type { Rng } from '../lib/rng';

export const FEMALE_NAMES = [
  'Adaeze', 'Amaka', 'Aisha', 'Bisola', 'Blessing', 'Chiamaka', 'Chidinma', 'Damilola',
  'Doyin', 'Efe', 'Fatima', 'Funke', 'Gift', 'Hadiza', 'Ifeoma', 'Ijeoma', 'Jumoke',
  'Kehinde', 'Kemi', 'Lola', 'Maryam', 'Nneka', 'Ngozi', 'Omolara', 'Onyinye', 'Rukayat',
  'Sade', 'Salamatu', 'Temitope', 'Titilayo', 'Uche', 'Yetunde', 'Zainab', 'Abiola',
  'Folake', 'Halima', 'Ireti', 'Nkechi', 'Oluwaseun', 'Patience',
] as const;

export const MALE_NAMES = [
  'Abdullahi', 'Adewale', 'Babatunde', 'Chinedu', 'Chukwuemeka', 'Danjuma', 'Emeka',
  'Femi', 'Gbenga', 'Ibrahim', 'Ikenna', 'Jide', 'Kelechi', 'Kunle', 'Lanre', 'Musa',
  'Nnamdi', 'Obinna', 'Olumide', 'Oluwatobi', 'Segun', 'Sunday', 'Tunde', 'Uchenna',
  'Usman', 'Yakubu', 'Yusuf', 'Bashir', 'Chidi', 'Damola', 'Eniola', 'Ifeanyi',
  'Kayode', 'Mustapha', 'Nonso', 'Taiwo', 'Tochukwu', 'Victor', 'Wale', 'Emmanuel',
] as const;

export const SURNAMES = [
  'Abubakar', 'Adebayo', 'Adeleke', 'Adeyemi', 'Afolabi', 'Aliyu', 'Anene', 'Ayodele',
  'Balogun', 'Bello', 'Chukwu', 'Danladi', 'Eze', 'Ezeani', 'Fashola', 'Garba',
  'Hassan', 'Idowu', 'Ibe', 'Jimoh', 'Kalu', 'Lawal', 'Madu', 'Mohammed', 'Nwachukwu',
  'Nwankwo', 'Nwosu', 'Obi', 'Odunsi', 'Ogbonna', 'Ogunleye', 'Ojo', 'Okafor',
  'Okeke', 'Okonkwo', 'Okoye', 'Olawale', 'Oyelaran', 'Owolabi', 'Salami', 'Sanni',
  'Suleiman', 'Tijani', 'Udoh', 'Umeh', 'Yakubu', 'Zubair', 'Akinola', 'Bakare',
  'Coker', 'Etim', 'Igwe', 'Obiora', 'Onuoha', 'Shittu', 'Williams', 'Peters', 'Akpan',
] as const;

export const COMPANY_STEMS = [
  'Brightpath', 'Cobalt', 'Delta Ridge', 'Evergreen', 'Fieldstone', 'Greenleaf', 'Halcyon',
  'Ironwood', 'Juniper', 'Keystone', 'Lakeshore', 'Meridian', 'Northgate', 'Oakline',
  'Pinnacle', 'Quartz', 'Riverbend', 'Sterling', 'Trident', 'Union Square', 'Vantage',
  'Westbridge', 'Zenith Point', 'Amberlight', 'Bluewater', 'Crestline', 'Driftwood',
] as const;

export const COMPANY_KINDS = [
  'Logistics Ltd', 'Consulting Ltd', 'Pharmacy', 'Foods Ltd', 'Studios', 'Legal Chambers',
  'Technologies Ltd', 'Interiors', 'Clinic', 'Stores', 'Travel & Tours', 'Fitness Centre',
  'Print & Design', 'Microfinance Ltd', 'Education Services', 'Security Services Ltd',
] as const;

export const OCCUPATIONS = [
  'Software engineer', 'Accountant', 'Teacher', 'Nurse', 'Civil servant', 'Banker',
  'Lawyer', 'Architect', 'Trader', 'Marketing manager', 'Medical doctor', 'Pharmacist',
  'Journalist', 'Logistics officer', 'HR manager', 'Entrepreneur', 'Lecturer',
  'Product designer', 'Data analyst', 'Civil engineer', 'Consultant', 'Pilot',
] as const;

export const EMPLOYERS = [
  'Lagos State Government', 'First City Microfinance', 'Atlas Insurance', 'Greenfield Hospital',
  'Nova Telecom', 'Pioneer Breweries', 'Kano Textile Mills', 'Federal Ministry of Works',
  'Crestview Capital', 'Harmattan Media', 'Savanna Energy', 'Palmgrove Schools',
  'Riverrun Logistics', 'Capital Trust Bank', 'Coastline Shipping', 'Self-employed',
] as const;

export const BANKS = [
  'Guaranty Trust Bank', 'Access Bank', 'Zenith Bank', 'United Bank for Africa',
  'First Bank of Nigeria', 'Fidelity Bank', 'Stanbic IBTC', 'Wema Bank',
] as const;

export const PAYMENT_REFERENCE_PREFIX = ['TRF', 'NIP', 'POS', 'CHQ', 'MM'] as const;

/**
 * E.164 Nigerian mobile numbers in a deliberately sparse block
 * (+234 80x 000 0nnn). The shape passes validation; the block is unlikely to
 * belong to a real subscriber. `serial` keeps numbers unique per run.
 */
export const syntheticPhone = (serial: number): string => {
  const network = ['803', '805', '807', '810', '813', '816', '903', '906'][serial % 8] as string;
  return `+234${network}000${String(serial % 10_000).padStart(4, '0')}`;
};

export interface PersonName {
  readonly full: string;
  readonly first: string;
  readonly last: string;
}

/** Unique person names within a run. Throws rather than loops if the pool is exhausted. */
export class NameFactory {
  private readonly used = new Set<string>();

  constructor(private readonly rng: Rng) {}

  person(): PersonName {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const first = this.rng.chance(0.5) ? this.rng.pick(FEMALE_NAMES) : this.rng.pick(MALE_NAMES);
      const last = this.rng.pick(SURNAMES);
      const full = `${first} ${last}`;
      if (!this.used.has(full)) {
        this.used.add(full);
        return { full, first, last };
      }
    }
    throw new Error('name pool exhausted');
  }

  /** Reserve a name written by hand (staff, landlords) so a tenant cannot collide with it. */
  reserve(full: string): void {
    this.used.add(full);
  }

  company(): string {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const name = `${this.rng.pick(COMPANY_STEMS)} ${this.rng.pick(COMPANY_KINDS)}`;
      if (!this.used.has(name)) {
        this.used.add(name);
        return name;
      }
    }
    throw new Error('company pool exhausted');
  }
}

export const slugEmail = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
