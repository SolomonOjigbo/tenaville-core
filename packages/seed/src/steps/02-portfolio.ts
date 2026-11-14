import type { Database } from '@tenaville/db';

import { clientFor, must, ok, person, type Ctx, type OrgCtx, type UnitRec } from '../context';
import { addMonths } from '../lib/dates';
import { log } from '../lib/log';
import { koboNumber, roundNaira } from '../lib/money';
import { syntheticPhone, slugEmail } from '../world/pools';

type UnitInsert = Database['public']['Tables']['units']['Insert'];
type AssignmentInsert = Database['public']['Tables']['assignments']['Insert'];

const accountNumber = (serial: number): string => `00${String(serial * 7919 + 10_000_000).slice(-8)}`;

/**
 * Landlords, their management mandates, properties and units. Written as the
 * owner (landlords, mandates, remittance details are owner/admin/finance
 * writes), exactly as an onboarding session in the product would.
 */
export const seedPortfolio = async (ctx: Ctx, org: OrgCtx): Promise<void> => {
  const { spec } = org;
  log.step(`${spec.name}: landlords, properties and units`);

  const ownerSpec = must(spec.staff.find((s) => s.role === 'owner'), 'owner');
  const owner = person(org, ownerSpec.handle);
  const client = await clientFor(ctx, owner);
  const mandateStart = addMonths(ctx.today, -20);

  // ---- Landlords, remittance details and mandates --------------------------
  for (const landlord of spec.landlords) {
    ctx.phoneSerial += 1;
    const userId = landlord.isOwnerUser === true ? owner.id : undefined;

    const { data, error } = await client
      .from('landlords')
      .insert({
        organisation_id: org.id,
        display_name: landlord.name,
        is_organisation: landlord.isOrganisation,
        phone: syntheticPhone(ctx.phoneSerial),
        email: `${slugEmail(landlord.key)}@${spec.key}.${ctx.env.emailDomain}`,
        preferred_channel: landlord.channel,
        address_line: landlord.address,
        state_code: landlord.state,
        ...(landlord.notes === undefined ? {} : { notes: landlord.notes }),
        ...(userId === undefined ? {} : { user_id: userId }),
      })
      .select('id')
      .single();
    ok(error, `landlord ${landlord.name}`);
    const landlordId = must(data, 'landlord').id;
    org.landlordIds.set(landlord.key, landlordId);

    if (landlord.bank !== undefined) {
      const bank = await client.from('landlord_remittance_details').insert({
        organisation_id: org.id,
        landlord_id: landlordId,
        bank_name: landlord.bank.bank,
        account_name: landlord.bank.accountName,
        account_number: accountNumber(ctx.phoneSerial),
        updated_by: owner.id,
      });
      ok(bank.error, `remittance details ${landlord.name}`);
    }

    if (landlord.mandate !== undefined) {
      const m = landlord.mandate;
      const mandate = await client.from('management_mandates').insert({
        organisation_id: org.id,
        landlord_id: landlordId,
        reference: `MAN-${spec.receiptPrefix}-${landlord.key.toUpperCase().slice(0, 8)}`,
        commission_type: m.type,
        ...(m.type === 'percentage'
          ? { commission_rate_bps: must(m.rateBps, 'rate') }
          : { commission_fixed_kobo: koboNumber(must(m.fixedNaira, 'fixed fee')) }),
        remittance_schedule: m.schedule,
        starts_on: mandateStart,
      });
      ok(mandate.error, `mandate ${landlord.name}`);
    }
  }

  // ---- Properties and units -------------------------------------------------
  const rng = org.rng.fork('portfolio');
  for (const property of spec.properties) {
    const { data, error } = await client
      .from('properties')
      .insert({
        organisation_id: org.id,
        landlord_id: must(org.landlordIds.get(property.landlord), `landlord ${property.landlord}`),
        name: property.name,
        reference: property.reference,
        property_type: property.type,
        address_line: property.address,
        state_code: property.state,
        lga: property.lga,
        area: property.area,
        ...(property.latitude === undefined ? {} : { latitude: property.latitude }),
        ...(property.longitude === undefined ? {} : { longitude: property.longitude }),
        ...(property.branch === undefined || !org.branchIds.has(property.branch)
          ? {}
          : { branch_id: must(org.branchIds.get(property.branch), 'branch') }),
      })
      .select('id')
      .single();
    ok(error, `property ${property.name}`);
    const propertyId = must(data, 'property').id;
    org.propertyIds.set(property.key, propertyId);

    const counters = new Map<string, number>();
    const rows: UnitInsert[] = [];
    const plan: Array<Omit<UnitRec, 'id' | 'status'>> = [];

    for (const group of property.groups) {
      for (let i = 0; i < group.count; i += 1) {
        const n = (counters.get(group.prefix) ?? 0) + 1;
        counters.set(group.prefix, n);
        const [low, high] = group.annualRentNaira;
        const annual = roundNaira(low + rng.next() * (high - low), high > 5_000_000 ? 100_000 : 10_000);
        const label = `${group.prefix} ${n}`;
        rows.push({
          organisation_id: org.id,
          property_id: propertyId,
          label,
          reference: `${property.reference}-${String(rows.length + 1).padStart(2, '0')}`,
          unit_type: group.type,
          status: 'vacant',
          bedrooms: group.bedrooms,
          bathrooms: group.bathrooms,
          floor_area_sqm: rng.int(group.sqm[0], group.sqm[1]),
          asking_rent_kobo: koboNumber(annual),
          facilities: [...group.facilities],
        });
        plan.push({ property, propertyId, label, group, annualRentNaira: annual });
      }
    }

    const inserted = await client.from('units').insert(rows).select('id, label');
    ok(inserted.error, `units for ${property.name}`);
    const idByLabel = new Map((inserted.data ?? []).map((u) => [u.label, u.id]));
    for (const unit of plan) {
      org.units.push({ ...unit, id: must(idByLabel.get(unit.label), `unit ${unit.label}`), status: 'vacant' });
    }
  }
  log.info(
    `${spec.landlords.length} landlords, ${spec.properties.length} properties, ${org.units.length} units`,
  );

  // ---- Scoped access: property and landlord assignments ---------------------
  const rows: AssignmentInsert[] = [];
  for (const staff of spec.staff) {
    if (staff.scope === 'organisation') continue;
    const who = person(org, staff.handle);
    if ('properties' in staff.scope) {
      for (const key of staff.scope.properties) {
        rows.push({
          organisation_id: org.id,
          user_id: who.id,
          scope_type: 'property',
          scope_id: must(org.propertyIds.get(key), `property ${key}`),
          created_by: owner.id,
        });
      }
    } else {
      for (const key of staff.scope.landlords) {
        rows.push({
          organisation_id: org.id,
          user_id: who.id,
          scope_type: 'landlord',
          scope_id: must(org.landlordIds.get(key), `landlord ${key}`),
          created_by: owner.id,
        });
      }
    }
  }
  if (rows.length > 0) {
    const { error } = await client.from('assignments').insert(rows);
    ok(error, 'scoped assignments');
  }

  // ---- Landlord portal logins ----------------------------------------------
  for (const landlord of spec.landlords) {
    if (landlord.portalLogin !== true) continue;
    const email = `landlord.${landlord.key}@${spec.key}.${ctx.env.emailDomain}`;
    const id = await ctx.identity.createUser({ email, fullName: landlord.name });
    ctx.phoneSerial += 1;
    const profile = await ctx.admin
      .from('users')
      .upsert({ id, email, full_name: landlord.name, phone: syntheticPhone(ctx.phoneSerial) });
    ok(profile.error, `profile ${email}`);

    const link = await client
      .from('landlords')
      .update({ user_id: id })
      .eq('id', must(org.landlordIds.get(landlord.key), 'landlord'));
    ok(link.error, `link landlord login ${email}`);

    const when = new Date().toISOString();
    const membership = await client.from('memberships').insert({
      organisation_id: org.id,
      user_id: id,
      role: 'landlord',
      status: 'active',
      invited_by: owner.id,
      invited_at: when,
      accepted_at: when,
    });
    ok(membership.error, `landlord membership ${email}`);
    org.landlordUserIds.set(landlord.key, id);
    org.people.set(`landlord.${landlord.key}`, {
      id, email, name: landlord.name, handle: `landlord.${landlord.key}`, role: 'landlord',
    });
  }
};
