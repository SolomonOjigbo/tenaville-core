import type { supabaseForRequest } from './session';

/** The request-scoped Supabase client, so the page and the export share queries. */
export type ReportClient = Awaited<ReturnType<typeof supabaseForRequest>>;

export const fetchRentRoll = (supabase: ReportClient) =>
  supabase
    .from('leases')
    .select(
      'id, reference, starts_on, ends_on, rent_kobo, rent_frequency, units(label, properties(name)), lease_parties(role, tenants(display_name))',
    )
    .eq('status', 'active')
    .order('ends_on');

export const fetchArrears = (supabase: ReportClient) =>
  supabase
    .from('charges')
    .select(
      'id, due_on, period_start, period_end, amount_kobo, payment_allocations(amount_kobo), leases(reference, units(label, properties(name)), lease_parties(role, tenants(display_name)))',
    )
    .eq('status', 'open')
    .order('due_on');

export const fetchCollections = (supabase: ReportClient, since: string) =>
  supabase.from('payments').select('amount_kobo, paid_on').gte('paid_on', since);
