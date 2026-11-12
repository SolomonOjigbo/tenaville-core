/**
 * Maintenance workflow vocabulary (MAINT-3).
 *
 * The database is the authority: every transition is checked again inside
 * `transition_maintenance_request`. This catalogue is what the UI offers and
 * what unit tests can reason about, so a button is never shown for a move the
 * function will refuse.
 */
export const MAINTENANCE_STATUSES = [
  'submitted',
  'acknowledged',
  'assigned',
  'in_progress',
  'on_hold',
  'awaiting_approval',
  'completed',
  'rejected',
  'closed',
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  in_progress: 'In progress',
  on_hold: 'On hold',
  awaiting_approval: 'Awaiting approval',
  completed: 'Completed',
  rejected: 'Rejected',
  closed: 'Closed',
};

/** Mirrors the CASE in public.transition_maintenance_request. */
export const MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, readonly MaintenanceStatus[]> = {
  submitted: ['acknowledged', 'assigned', 'rejected'],
  acknowledged: ['assigned', 'in_progress', 'on_hold', 'rejected'],
  assigned: ['in_progress', 'on_hold', 'rejected'],
  in_progress: ['on_hold', 'awaiting_approval', 'completed'],
  on_hold: ['assigned', 'in_progress', 'rejected'],
  awaiting_approval: ['in_progress', 'on_hold'],
  completed: ['closed', 'in_progress'],
  rejected: ['closed'],
  closed: [],
};

export const canTransition = (from: MaintenanceStatus, to: MaintenanceStatus): boolean =>
  MAINTENANCE_TRANSITIONS[from].includes(to);

export const isOpenStatus = (status: MaintenanceStatus): boolean =>
  status !== 'completed' && status !== 'rejected' && status !== 'closed';

export const MAINTENANCE_CATEGORIES = [
  'plumbing',
  'electrical',
  'structural',
  'appliance',
  'hvac',
  'pest',
  'cleaning',
  'security',
  'other',
] as const;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  structural: 'Structural',
  appliance: 'Appliance',
  hvac: 'HVAC',
  pest: 'Pest control',
  cleaning: 'Cleaning',
  security: 'Security',
  other: 'Other',
};

export const MAINTENANCE_URGENCIES = ['low', 'normal', 'high', 'emergency'] as const;
export type MaintenanceUrgency = (typeof MAINTENANCE_URGENCIES)[number];

export const MAINTENANCE_URGENCY_LABELS: Record<MaintenanceUrgency, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  emergency: 'Emergency',
};

export const MAINTENANCE_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const MAINTENANCE_PAYERS = [
  'landlord',
  'tenant',
  'agency',
  'service_charge',
  'other',
] as const;
export type MaintenancePayer = (typeof MAINTENANCE_PAYERS)[number];

export const MAINTENANCE_PAYER_LABELS: Record<MaintenancePayer, string> = {
  landlord: 'Landlord',
  tenant: 'Tenant',
  agency: 'Agency',
  service_charge: 'Service charge',
  other: 'Other',
};
