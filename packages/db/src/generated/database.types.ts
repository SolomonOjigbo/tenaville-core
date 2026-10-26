
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "assignments": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"organisation_id": string,"scope_id": string | null,"scope_type": Database["public"]['Enums']["assignment_scope"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"organisation_id": string,"scope_id"?: string | null,"scope_type": Database["public"]['Enums']["assignment_scope"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"organisation_id"?: string,"scope_id"?: string | null,"scope_type"?: Database["public"]['Enums']["assignment_scope"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_events": {
                  Row: {
                    "action": string,"actor_label": string | null,"actor_user_id": string | null,"after": Json | null,"before": Json | null,"entity_id": string | null,"entity_type": string,"id": number,"ip": unknown,"occurred_at": string,"organisation_id": string | null,"reason": string | null,"request_id": string | null,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_label"?: string | null,"actor_user_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"entity_id"?: string | null,"entity_type": string,"id"?: never,"ip"?: unknown,"occurred_at"?: string,"organisation_id"?: string | null,"reason"?: string | null,"request_id"?: string | null,"user_agent"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_label"?: string | null,"actor_user_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"entity_id"?: string | null,"entity_type"?: string,"id"?: never,"ip"?: unknown,"occurred_at"?: string,"organisation_id"?: string | null,"reason"?: string | null,"request_id"?: string | null,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_events_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"branches": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"organisation_id": string,"receipt_prefix": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"organisation_id": string,"receipt_prefix"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"organisation_id"?: string,"receipt_prefix"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "branches_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"charges": {
                  Row: {
                    "amount_kobo": number,"cancellation_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"charge_term_id": string | null,"covers_partial_period": boolean,"created_at": string,"created_by": string | null,"due_on": string,"id": string,"kind": Database["public"]['Enums']["charge_kind"],"lease_id": string,"organisation_id": string,"period_end": string,"period_start": string,"sequence": number,"status": Database["public"]['Enums']["charge_status"],"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_kobo": number,"cancellation_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"charge_term_id"?: string | null,"covers_partial_period"?: boolean,"created_at"?: string,"created_by"?: string | null,"due_on": string,"id"?: string,"kind"?: Database["public"]['Enums']["charge_kind"],"lease_id": string,"organisation_id": string,"period_end": string,"period_start": string,"sequence": number,"status"?: Database["public"]['Enums']["charge_status"],"updated_at"?: string | null
                  }
                  Update: {
                    "amount_kobo"?: number,"cancellation_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"charge_term_id"?: string | null,"covers_partial_period"?: boolean,"created_at"?: string,"created_by"?: string | null,"due_on"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["charge_kind"],"lease_id"?: string,"organisation_id"?: string,"period_end"?: string,"period_start"?: string,"sequence"?: number,"status"?: Database["public"]['Enums']["charge_status"],"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "charges_charge_term_id_fkey"
      columns: ["charge_term_id"]
isOneToOne: false
      referencedRelation: "lease_charge_terms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "charges_lease_id_fkey"
      columns: ["lease_id"]
isOneToOne: false
      referencedRelation: "lease_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "charges_lease_id_fkey"
      columns: ["lease_id"]
isOneToOne: false
      referencedRelation: "leases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "charges_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"deposit_deductions": {
                  Row: {
                    "amount_kobo": number,"approved_at": string | null,"approved_by": string | null,"created_at": string,"created_by": string | null,"deposit_id": string,"evidence_paths": (string)[],"id": string,"organisation_id": string,"reason": string,"reverses_deduction_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_kobo": number,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"deposit_id": string,"evidence_paths"?: (string)[],"id"?: string,"organisation_id": string,"reason": string,"reverses_deduction_id"?: string | null
                  }
                  Update: {
                    "amount_kobo"?: number,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"deposit_id"?: string,"evidence_paths"?: (string)[],"id"?: string,"organisation_id"?: string,"reason"?: string,"reverses_deduction_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deposit_deductions_deposit_id_fkey"
      columns: ["deposit_id"]
isOneToOne: false
      referencedRelation: "lease_deposits"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deposit_deductions_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deposit_deductions_reverses_deduction_id_fkey"
      columns: ["reverses_deduction_id"]
isOneToOne: false
      referencedRelation: "deposit_deductions"
      referencedColumns: ["id"]
    }
                  ]
                },"device_sessions": {
                  Row: {
                    "app_version": string | null,"created_at": string,"device_label": string | null,"id": string,"last_seen_at": string,"organisation_id": string | null,"platform": string,"revoked_at": string | null,"revoked_by": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "app_version"?: string | null,"created_at"?: string,"device_label"?: string | null,"id"?: string,"last_seen_at"?: string,"organisation_id"?: string | null,"platform": string,"revoked_at"?: string | null,"revoked_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "app_version"?: string | null,"created_at"?: string,"device_label"?: string | null,"id"?: string,"last_seen_at"?: string,"organisation_id"?: string | null,"platform"?: string,"revoked_at"?: string | null,"revoked_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "device_sessions_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"features": {
                  Row: {
                    "created_at": string,"description": string,"is_available": boolean,"key": string,"label": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": string,"is_available"?: boolean,"key": string,"label": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"is_available"?: boolean,"key"?: string,"label"?: string
                  }
                  Relationships: [
                    
                  ]
                },"import_batches": {
                  Row: {
                    "applied_at": string | null,"created_at": string,"created_by": string | null,"error": string | null,"file_name": string | null,"id": string,"invalid_count": number,"kind": Database["public"]['Enums']["import_kind"],"organisation_id": string,"rolled_back_at": string | null,"rolled_back_by": string | null,"row_count": number,"source_headers": (string)[] | null,"status": Database["public"]['Enums']["import_status"],"valid_count": number,"validated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "applied_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"error"?: string | null,"file_name"?: string | null,"id"?: string,"invalid_count"?: number,"kind": Database["public"]['Enums']["import_kind"],"organisation_id": string,"rolled_back_at"?: string | null,"rolled_back_by"?: string | null,"row_count"?: number,"source_headers"?: (string)[] | null,"status"?: Database["public"]['Enums']["import_status"],"valid_count"?: number,"validated_at"?: string | null
                  }
                  Update: {
                    "applied_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"error"?: string | null,"file_name"?: string | null,"id"?: string,"invalid_count"?: number,"kind"?: Database["public"]['Enums']["import_kind"],"organisation_id"?: string,"rolled_back_at"?: string | null,"rolled_back_by"?: string | null,"row_count"?: number,"source_headers"?: (string)[] | null,"status"?: Database["public"]['Enums']["import_status"],"valid_count"?: number,"validated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_batches_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"import_rows": {
                  Row: {
                    "batch_id": string,"created_at": string,"created_entity_id": string | null,"created_entity_type": string | null,"errors": NonNullable<Json>,"id": string,"organisation_id": string,"raw": NonNullable<Json>,"row_number": number,"status": Database["public"]['Enums']["import_row_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"created_at"?: string,"created_entity_id"?: string | null,"created_entity_type"?: string | null,"errors"?: NonNullable<Json>,"id"?: string,"organisation_id": string,"raw": NonNullable<Json>,"row_number": number,"status"?: Database["public"]['Enums']["import_row_status"]
                  }
                  Update: {
                    "batch_id"?: string,"created_at"?: string,"created_entity_id"?: string | null,"created_entity_type"?: string | null,"errors"?: NonNullable<Json>,"id"?: string,"organisation_id"?: string,"raw"?: NonNullable<Json>,"row_number"?: number,"status"?: Database["public"]['Enums']["import_row_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_rows_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_rows_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"landlord_remittance_details": {
                  Row: {
                    "account_name": string,"account_number": string,"bank_name": string,"created_at": string,"landlord_id": string,"organisation_id": string,"updated_at": string | null,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "account_name": string,"account_number": string,"bank_name": string,"created_at"?: string,"landlord_id": string,"organisation_id": string,"updated_at"?: string | null,"updated_by"?: string | null
                  }
                  Update: {
                    "account_name"?: string,"account_number"?: string,"bank_name"?: string,"created_at"?: string,"landlord_id"?: string,"organisation_id"?: string,"updated_at"?: string | null,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "landlord_remittance_details_landlord_id_fkey"
      columns: ["landlord_id"]
isOneToOne: true
      referencedRelation: "landlords"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "landlord_remittance_details_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"landlords": {
                  Row: {
                    "address_line": string | null,"created_at": string,"display_name": string,"email": string | null,"id": string,"is_organisation": boolean,"lga": string | null,"notes": string | null,"organisation_id": string,"phone": string | null,"preferred_channel": Database["public"]['Enums']["contact_channel"],"state_code": string | null,"updated_at": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line"?: string | null,"created_at"?: string,"display_name": string,"email"?: string | null,"id"?: string,"is_organisation"?: boolean,"lga"?: string | null,"notes"?: string | null,"organisation_id": string,"phone"?: string | null,"preferred_channel"?: Database["public"]['Enums']["contact_channel"],"state_code"?: string | null,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "address_line"?: string | null,"created_at"?: string,"display_name"?: string,"email"?: string | null,"id"?: string,"is_organisation"?: boolean,"lga"?: string | null,"notes"?: string | null,"organisation_id"?: string,"phone"?: string | null,"preferred_channel"?: Database["public"]['Enums']["contact_channel"],"state_code"?: string | null,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "landlords_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "landlords_state_code_fkey"
      columns: ["state_code"]
isOneToOne: false
      referencedRelation: "nigerian_states"
      referencedColumns: ["code"]
    }
                  ]
                },"lease_charge_terms": {
                  Row: {
                    "amount_kobo": number,"created_at": string,"created_by": string | null,"description": string,"due_day": number | null,"ends_on": string,"frequency": Database["public"]['Enums']["charge_frequency"],"id": string,"kind": Database["public"]['Enums']["charge_kind"],"lease_id": string,"organisation_id": string,"raised_at": string | null,"starts_on": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_kobo": number,"created_at"?: string,"created_by"?: string | null,"description": string,"due_day"?: number | null,"ends_on": string,"frequency": Database["public"]['Enums']["charge_frequency"],"id"?: string,"kind": Database["public"]['Enums']["charge_kind"],"lease_id": string,"organisation_id": string,"raised_at"?: string | null,"starts_on": string,"updated_at"?: string | null
                  }
                  Update: {
                    "amount_kobo"?: number,"created_at"?: string,"created_by"?: string | null,"description"?: string,"due_day"?: number | null,"ends_on"?: string,"frequency"?: Database["public"]['Enums']["charge_frequency"],"id"?: string,"kind"?: Database["public"]['Enums']["charge_kind"],"lease_id"?: string,"organisation_id"?: string,"raised_at"?: string | null,"starts_on"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lease_charge_terms_lease_id_fkey"
      columns: ["lease_id"]
isOneToOne: false
      referencedRelation: "lease_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lease_charge_terms_lease_id_fkey"
      columns: ["lease_id"]
isOneToOne: false
      referencedRelation: "leases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lease_charge_terms_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"lease_deposits": {
                  Row: {
                    "amount_kobo": number,"created_at": string,"custodian": Database["public"]['Enums']["deposit_custodian"],"id": string,"lease_id": string,"notes": string | null,"organisation_id": string,"received_on": string | null,"settled_on": string | null,"status": Database["public"]['Enums']["deposit_status"],"transferred_to_lease_id": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_kobo": number,"created_at"?: string,"custodian"?: Database["public"]['Enums']["deposit_custodian"],"id"?: string,"lease_id": string,"notes"?: string | null,"organisation_id": string,"received_on"?: string | null,"settled_on"?: string | null,"status"?: Database["public"]['Enums']["deposit_status"],"transferred_to_lease_id"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "amount_kobo"?: number,"created_at"?: string,"custodian"?: Database["public"]['Enums']["deposit_custodian"],"id"?: string,"lease_id"?: string,"notes"?: string | null,"organisation_id"?: string,"received_on"?: string | null,"settled_on"?: string | null,"status"?: Database["public"]['Enums']["deposit_status"],"transferred_to_lease_id"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lease_deposits_lease_id_fkey"
      columns: ["lease_id"]
isOneToOne: true
      referencedRelation: "lease_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lease_deposits_lease_id_fkey"
      columns: ["lease_id"]
isOneToOne: true
      referencedRelation: "leases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lease_deposits_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lease_deposits_transferred_to_lease_id_fkey"
      columns: ["transferred_to_lease_id"]
isOneToOne: false
      referencedRelation: "lease_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lease_deposits_transferred_to_lease_id_fkey"
      columns: ["transferred_to_lease_id"]
isOneToOne: false
      referencedRelation: "leases"
      referencedColumns: ["id"]
    }
                  ]
                },"lease_handovers": {
                  Row: {
                    "created_at": string,"evidence_paths": (string)[],"happened_on": string,"id": string,"keys_returned": boolean | null,"kind": Database["public"]['Enums']["handover_kind"],"lease_id": string,"meter_readings": NonNullable<Json>,"notes": string | null,"organisation_id": string,"outstanding_balance_kobo": number | null,"recorded_by": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"evidence_paths"?: (string)[],"happened_on": string,"id"?: string,"keys_returned"?: boolean | null,"kind": Database["public"]['Enums']["handover_kind"],"lease_id": string,"meter_readings"?: NonNullable<Json>,"notes"?: string | null,"organisation_id": string,"outstanding_balance_kobo"?: number | null,"recorded_by"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"evidence_paths"?: (string)[],"happened_on"?: string,"id"?: string,"keys_returned"?: boolean | null,"kind"?: Database["public"]['Enums']["handover_kind"],"lease_id"?: string,"meter_readings"?: NonNullable<Json>,"notes"?: string | null,"organisation_id"?: string,"outstanding_balance_kobo"?: number | null,"recorded_by"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lease_handovers_lease_id_fkey"
      columns: ["lease_id"]
isOneToOne: false
      referencedRelation: "lease_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lease_handovers_lease_id_fkey"
      columns: ["lease_id"]
isOneToOne: false
      referencedRelation: "leases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lease_handovers_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"lease_parties": {
                  Row: {
                    "created_at": string,"id": string,"lease_id": string,"liability_share_bps": number | null,"organisation_id": string,"role": Database["public"]['Enums']["lease_party_role"],"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"lease_id": string,"liability_share_bps"?: number | null,"organisation_id": string,"role"?: Database["public"]['Enums']["lease_party_role"],"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"lease_id"?: string,"liability_share_bps"?: number | null,"organisation_id"?: string,"role"?: Database["public"]['Enums']["lease_party_role"],"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lease_parties_lease_id_fkey"
      columns: ["lease_id"]
isOneToOne: false
      referencedRelation: "lease_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lease_parties_lease_id_fkey"
      columns: ["lease_id"]
isOneToOne: false
      referencedRelation: "leases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lease_parties_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lease_parties_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"leases": {
                  Row: {
                    "created_at": string,"created_by": string | null,"ends_on": string,"first_due_on": string | null,"id": string,"notes": string | null,"organisation_id": string,"reference": string | null,"renewed_from_lease_id": string | null,"rent_due_day": number | null,"rent_frequency": Database["public"]['Enums']["rent_frequency"],"rent_kobo": number,"starts_on": string,"status": Database["public"]['Enums']["lease_status"],"terminated_on": string | null,"termination_reason": string | null,"unit_id": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"ends_on": string,"first_due_on"?: string | null,"id"?: string,"notes"?: string | null,"organisation_id": string,"reference"?: string | null,"renewed_from_lease_id"?: string | null,"rent_due_day"?: number | null,"rent_frequency"?: Database["public"]['Enums']["rent_frequency"],"rent_kobo": number,"starts_on": string,"status"?: Database["public"]['Enums']["lease_status"],"terminated_on"?: string | null,"termination_reason"?: string | null,"unit_id": string,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"ends_on"?: string,"first_due_on"?: string | null,"id"?: string,"notes"?: string | null,"organisation_id"?: string,"reference"?: string | null,"renewed_from_lease_id"?: string | null,"rent_due_day"?: number | null,"rent_frequency"?: Database["public"]['Enums']["rent_frequency"],"rent_kobo"?: number,"starts_on"?: string,"status"?: Database["public"]['Enums']["lease_status"],"terminated_on"?: string | null,"termination_reason"?: string | null,"unit_id"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "leases_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leases_renewed_from_lease_id_fkey"
      columns: ["renewed_from_lease_id"]
isOneToOne: false
      referencedRelation: "lease_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leases_renewed_from_lease_id_fkey"
      columns: ["renewed_from_lease_id"]
isOneToOne: false
      referencedRelation: "leases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leases_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"management_mandates": {
                  Row: {
                    "commission_basis": Database["public"]['Enums']["commission_basis"],"commission_fixed_kobo": number | null,"commission_rate_bps": number | null,"commission_type": Database["public"]['Enums']["commission_type"],"created_at": string,"ends_on": string | null,"id": string,"landlord_id": string,"notes": string | null,"organisation_id": string,"permitted_deductions": (Database["public"]['Enums']["deduction_category"])[],"reference": string | null,"remittance_schedule": Database["public"]['Enums']["remittance_schedule"],"starts_on": string,"terminated_on": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "commission_basis"?: Database["public"]['Enums']["commission_basis"],"commission_fixed_kobo"?: number | null,"commission_rate_bps"?: number | null,"commission_type"?: Database["public"]['Enums']["commission_type"],"created_at"?: string,"ends_on"?: string | null,"id"?: string,"landlord_id": string,"notes"?: string | null,"organisation_id": string,"permitted_deductions"?: (Database["public"]['Enums']["deduction_category"])[],"reference"?: string | null,"remittance_schedule"?: Database["public"]['Enums']["remittance_schedule"],"starts_on": string,"terminated_on"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "commission_basis"?: Database["public"]['Enums']["commission_basis"],"commission_fixed_kobo"?: number | null,"commission_rate_bps"?: number | null,"commission_type"?: Database["public"]['Enums']["commission_type"],"created_at"?: string,"ends_on"?: string | null,"id"?: string,"landlord_id"?: string,"notes"?: string | null,"organisation_id"?: string,"permitted_deductions"?: (Database["public"]['Enums']["deduction_category"])[],"reference"?: string | null,"remittance_schedule"?: Database["public"]['Enums']["remittance_schedule"],"starts_on"?: string,"terminated_on"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "management_mandates_landlord_id_fkey"
      columns: ["landlord_id"]
isOneToOne: false
      referencedRelation: "landlords"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "management_mandates_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "accepted_at": string | null,"branch_id": string | null,"created_at": string,"id": string,"invited_at": string | null,"invited_by": string | null,"organisation_id": string,"role": Database["public"]['Enums']["app_role"],"status": Database["public"]['Enums']["membership_status"],"suspended_at": string | null,"updated_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"branch_id"?: string | null,"created_at"?: string,"id"?: string,"invited_at"?: string | null,"invited_by"?: string | null,"organisation_id": string,"role": Database["public"]['Enums']["app_role"],"status"?: Database["public"]['Enums']["membership_status"],"suspended_at"?: string | null,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"branch_id"?: string | null,"created_at"?: string,"id"?: string,"invited_at"?: string | null,"invited_by"?: string | null,"organisation_id"?: string,"role"?: Database["public"]['Enums']["app_role"],"status"?: Database["public"]['Enums']["membership_status"],"suspended_at"?: string | null,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"nigerian_states": {
                  Row: {
                    "code": string,"name": string,"zone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"name": string,"zone": string
                  }
                  Update: {
                    "code"?: string,"name"?: string,"zone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"organisations": {
                  Row: {
                    "country_code": string,"created_at": string,"id": string,"lease_expiry_alert_days": (number)[],"name": string,"timezone": string,"type": Database["public"]['Enums']["organisation_type"],"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "country_code"?: string,"created_at"?: string,"id"?: string,"lease_expiry_alert_days"?: (number)[],"name": string,"timezone"?: string,"type": Database["public"]['Enums']["organisation_type"],"updated_at"?: string | null
                  }
                  Update: {
                    "country_code"?: string,"created_at"?: string,"id"?: string,"lease_expiry_alert_days"?: (number)[],"name"?: string,"timezone"?: string,"type"?: Database["public"]['Enums']["organisation_type"],"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"plan_features": {
                  Row: {
                    "feature_key": string,"plan_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "feature_key": string,"plan_id": string
                  }
                  Update: {
                    "feature_key"?: string,"plan_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_features_feature_key_fkey"
      columns: ["feature_key"]
isOneToOne: false
      referencedRelation: "features"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "plan_features_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"plan_roles": {
                  Row: {
                    "plan_id": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "plan_id": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "plan_id"?: string,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_roles_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "billing_period": Database["public"]['Enums']["billing_period"],"created_at": string,"description": string | null,"extra_user_kobo": number | null,"id": string,"included_messages": number | null,"is_public": boolean,"name": string,"price_kobo": number,"property_limit": number | null,"sort_order": number,"storage_mb": number | null,"tier": Database["public"]['Enums']["plan_tier"] | null,"trial_days": number,"unit_limit": number | null,"unit_overage_kobo": number | null,"updated_at": string | null,"user_limit": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_period": Database["public"]['Enums']["billing_period"],"created_at"?: string,"description"?: string | null,"extra_user_kobo"?: number | null,"id": string,"included_messages"?: number | null,"is_public"?: boolean,"name": string,"price_kobo": number,"property_limit"?: number | null,"sort_order"?: number,"storage_mb"?: number | null,"tier"?: Database["public"]['Enums']["plan_tier"] | null,"trial_days"?: number,"unit_limit"?: number | null,"unit_overage_kobo"?: number | null,"updated_at"?: string | null,"user_limit"?: number | null
                  }
                  Update: {
                    "billing_period"?: Database["public"]['Enums']["billing_period"],"created_at"?: string,"description"?: string | null,"extra_user_kobo"?: number | null,"id"?: string,"included_messages"?: number | null,"is_public"?: boolean,"name"?: string,"price_kobo"?: number,"property_limit"?: number | null,"sort_order"?: number,"storage_mb"?: number | null,"tier"?: Database["public"]['Enums']["plan_tier"] | null,"trial_days"?: number,"unit_limit"?: number | null,"unit_overage_kobo"?: number | null,"updated_at"?: string | null,"user_limit"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"properties": {
                  Row: {
                    "address_line": string,"area": string | null,"branch_id": string | null,"created_at": string,"id": string,"landlord_id": string,"latitude": number | null,"lga": string | null,"longitude": number | null,"name": string,"notes": string | null,"organisation_id": string,"property_type": Database["public"]['Enums']["property_type"],"reference": string | null,"state_code": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line": string,"area"?: string | null,"branch_id"?: string | null,"created_at"?: string,"id"?: string,"landlord_id": string,"latitude"?: number | null,"lga"?: string | null,"longitude"?: number | null,"name": string,"notes"?: string | null,"organisation_id": string,"property_type": Database["public"]['Enums']["property_type"],"reference"?: string | null,"state_code": string,"updated_at"?: string | null
                  }
                  Update: {
                    "address_line"?: string,"area"?: string | null,"branch_id"?: string | null,"created_at"?: string,"id"?: string,"landlord_id"?: string,"latitude"?: number | null,"lga"?: string | null,"longitude"?: number | null,"name"?: string,"notes"?: string | null,"organisation_id"?: string,"property_type"?: Database["public"]['Enums']["property_type"],"reference"?: string | null,"state_code"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "properties_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "properties_landlord_id_fkey"
      columns: ["landlord_id"]
isOneToOne: false
      referencedRelation: "landlords"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "properties_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "properties_state_code_fkey"
      columns: ["state_code"]
isOneToOne: false
      referencedRelation: "nigerian_states"
      referencedColumns: ["code"]
    }
                  ]
                },"property_photos": {
                  Row: {
                    "caption": string | null,"created_at": string,"id": string,"organisation_id": string,"property_id": string,"sort_order": number,"storage_path": string,"unit_id": string | null,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"created_at"?: string,"id"?: string,"organisation_id": string,"property_id": string,"sort_order"?: number,"storage_path": string,"unit_id"?: string | null,"uploaded_by"?: string | null
                  }
                  Update: {
                    "caption"?: string | null,"created_at"?: string,"id"?: string,"organisation_id"?: string,"property_id"?: string,"sort_order"?: number,"storage_path"?: string,"unit_id"?: string | null,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "property_photos_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "property_photos_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "property_photos_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "cancelled_at": string | null,"created_at": string,"current_period_end": string | null,"current_period_start": string | null,"grace_ends_on": string | null,"id": string,"organisation_id": string,"plan_id": string,"status": Database["public"]['Enums']["subscription_status"],"trial_ends_on": string | null,"units_included": number | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelled_at"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"grace_ends_on"?: string | null,"id"?: string,"organisation_id": string,"plan_id": string,"status"?: Database["public"]['Enums']["subscription_status"],"trial_ends_on"?: string | null,"units_included"?: number | null,"updated_at"?: string | null
                  }
                  Update: {
                    "cancelled_at"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"grace_ends_on"?: string | null,"id"?: string,"organisation_id"?: string,"plan_id"?: string,"status"?: Database["public"]['Enums']["subscription_status"],"trial_ends_on"?: string | null,"units_included"?: number | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: true
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_contacts": {
                  Row: {
                    "address_line": string | null,"created_at": string,"email": string | null,"id": string,"kind": Database["public"]['Enums']["tenant_contact_kind"],"name": string,"notes": string | null,"organisation_id": string,"phone": string | null,"relationship": string | null,"tenant_id": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["tenant_contact_kind"],"name": string,"notes"?: string | null,"organisation_id": string,"phone"?: string | null,"relationship"?: string | null,"tenant_id": string,"updated_at"?: string | null
                  }
                  Update: {
                    "address_line"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["tenant_contact_kind"],"name"?: string,"notes"?: string | null,"organisation_id"?: string,"phone"?: string | null,"relationship"?: string | null,"tenant_id"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_contacts_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tenant_contacts_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenants": {
                  Row: {
                    "business_registration": string | null,"created_at": string,"date_of_birth": string | null,"display_name": string,"email": string | null,"employer_name": string | null,"id": string,"kind": Database["public"]['Enums']["tenant_kind"],"notes": string | null,"occupation": string | null,"organisation_id": string,"phone": string | null,"preferred_channel": Database["public"]['Enums']["contact_channel"],"updated_at": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_registration"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"display_name": string,"email"?: string | null,"employer_name"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["tenant_kind"],"notes"?: string | null,"occupation"?: string | null,"organisation_id": string,"phone"?: string | null,"preferred_channel"?: Database["public"]['Enums']["contact_channel"],"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "business_registration"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"display_name"?: string,"email"?: string | null,"employer_name"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["tenant_kind"],"notes"?: string | null,"occupation"?: string | null,"organisation_id"?: string,"phone"?: string | null,"preferred_channel"?: Database["public"]['Enums']["contact_channel"],"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenants_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"units": {
                  Row: {
                    "asking_rent_kobo": number | null,"bathrooms": number | null,"bedrooms": number | null,"created_at": string,"facilities": (string)[],"floor_area_sqm": number | null,"id": string,"label": string,"notes": string | null,"organisation_id": string,"property_id": string,"reference": string | null,"status": Database["public"]['Enums']["unit_status"],"unit_type": Database["public"]['Enums']["unit_type"],"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "asking_rent_kobo"?: number | null,"bathrooms"?: number | null,"bedrooms"?: number | null,"created_at"?: string,"facilities"?: (string)[],"floor_area_sqm"?: number | null,"id"?: string,"label": string,"notes"?: string | null,"organisation_id": string,"property_id": string,"reference"?: string | null,"status"?: Database["public"]['Enums']["unit_status"],"unit_type": Database["public"]['Enums']["unit_type"],"updated_at"?: string | null
                  }
                  Update: {
                    "asking_rent_kobo"?: number | null,"bathrooms"?: number | null,"bedrooms"?: number | null,"created_at"?: string,"facilities"?: (string)[],"floor_area_sqm"?: number | null,"id"?: string,"label"?: string,"notes"?: string | null,"organisation_id"?: string,"property_id"?: string,"reference"?: string | null,"status"?: Database["public"]['Enums']["unit_status"],"unit_type"?: Database["public"]['Enums']["unit_type"],"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "units_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "units_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"usage_readings": {
                  Row: {
                    "created_at": string,"finalised_at": string | null,"id": string,"messages": number | null,"organisation_id": string,"period_end": string,"period_start": string,"plan_id": string,"properties": number | null,"property_limit": number | null,"status": Database["public"]['Enums']["usage_reading_status"],"storage_mb": number | null,"taken_at": string,"unit_limit": number | null,"unit_overage_kobo": number | null,"units": number | null,"updated_at": string | null,"user_limit": number | null,"users": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"finalised_at"?: string | null,"id"?: string,"messages"?: number | null,"organisation_id": string,"period_end": string,"period_start": string,"plan_id": string,"properties"?: number | null,"property_limit"?: number | null,"status"?: Database["public"]['Enums']["usage_reading_status"],"storage_mb"?: number | null,"taken_at"?: string,"unit_limit"?: number | null,"unit_overage_kobo"?: number | null,"units"?: number | null,"updated_at"?: string | null,"user_limit"?: number | null,"users"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"finalised_at"?: string | null,"id"?: string,"messages"?: number | null,"organisation_id"?: string,"period_end"?: string,"period_start"?: string,"plan_id"?: string,"properties"?: number | null,"property_limit"?: number | null,"status"?: Database["public"]['Enums']["usage_reading_status"],"storage_mb"?: number | null,"taken_at"?: string,"unit_limit"?: number | null,"unit_overage_kobo"?: number | null,"units"?: number | null,"updated_at"?: string | null,"user_limit"?: number | null,"users"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "usage_readings_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "usage_readings_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string | null,"id": string,"phone": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"phone"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"phone"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "lease_overview": {
                  Row: {
                    "alert_threshold_days": number | null,"days_to_expiry": number | null,"display_status": string | null,"ends_on": string,"has_renewal": boolean | null,"id": string,"organisation_id": string,"reference": string | null,"renewed_from_lease_id": string | null,"rent_frequency": Database["public"]['Enums']["rent_frequency"],"rent_kobo": number,"starts_on": string,"status": Database["public"]['Enums']["lease_status"],"terminated_on": string | null,"unit_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "leases_organisation_id_fkey"
      columns: ["organisation_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leases_renewed_from_lease_id_fkey"
      columns: ["renewed_from_lease_id"]
isOneToOne: false
      referencedRelation: "lease_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leases_renewed_from_lease_id_fkey"
      columns: ["renewed_from_lease_id"]
isOneToOne: false
      referencedRelation: "leases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leases_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_invitation":
{ Args: { "target_organisation_id": string }; Returns: undefined
                           },
"activate_lease":
{ Args: { "charge_rows": Json,"target_lease_id": string }; Returns: number
                           },
"add_lease_charge_term":
{ Args: { "charge_rows": Json,"target_lease_id": string,"term_amount_kobo": number,"term_description": string,"term_due_day"?: number,"term_ends_on": string,"term_frequency": Database["public"]['Enums']["charge_frequency"],"term_kind": Database["public"]['Enums']["charge_kind"],"term_starts_on": string }; Returns: string
                           },
"apply_property_import":
{ Args: { "target_batch_id": string }; Returns: {
              "landlords_created": number,"properties_created": number,"units_created": number
            }[]
                           },
"change_membership_role":
{ Args: { "change_reason": string,"new_role": Database["public"]['Enums']["app_role"],"target_membership_id": string }; Returns: undefined
                           },
"create_lease_with_tenant":
{ Args: { "activate"?: boolean,"deposit_amount_kobo"?: number,"deposit_custodian"?: Database["public"]['Enums']["deposit_custodian"],"lease_charges"?: Json,"lease_ends_on": string,"lease_reference"?: string,"lease_rent_frequency"?: Database["public"]['Enums']["rent_frequency"],"lease_rent_kobo": number,"lease_starts_on": string,"target_organisation_id": string,"target_tenant_id": string,"target_unit_id": string }; Returns: string
                           },
"create_organisation_with_owner":
{ Args: { "organisation_name": string,"organisation_type"?: Database["public"]['Enums']["organisation_type"],"owner_full_name"?: string }; Returns: string
                           },
"finalise_usage_reading":
{ Args: { "target_reading_id": string }; Returns: {
              "created_at": string,
"finalised_at": string | null,
"id": string,
"messages": number | null,
"organisation_id": string,
"period_end": string,
"period_start": string,
"plan_id": string,
"properties": number | null,
"property_limit": number | null,
"status": Database["public"]['Enums']["usage_reading_status"],
"storage_mb": number | null,
"taken_at": string,
"unit_limit": number | null,
"unit_overage_kobo": number | null,
"units": number | null,
"updated_at": string | null,
"user_limit": number | null,
"users": number | null
            }
                          SetofOptions: {
        from: "*"
        to: "usage_readings"
        isOneToOne: true
        isSetofReturn: false
      } },
"plan_entitlements":
{ Args: Record<PropertyKey, never>; Returns: {
              "extra_user_kobo": number,"features": (string)[],"included_messages": number,"organisation_id": string,"plan_id": string,"plan_name": string,"properties_used": number,"properties_verdict": string,"property_limit": number,"storage_mb": number,"tier": Database["public"]['Enums']["plan_tier"],"unit_limit": number,"unit_overage_kobo": number,"units_used": number,"units_verdict": string,"user_limit": number,"users_used": number,"users_verdict": string
            }[]
                           },
"record_document_access":
{ Args: { "entity_id": string,"entity_type": string,"object_bucket": string,"object_path": string,"target_organisation_id": string }; Returns: undefined
                           },
"record_due_usage_readings":
{ Args: Record<PropertyKey, never>; Returns: {
              "finalised": number,"taken": number
            }[]
                           },
"renew_lease":
{ Args: { "carry_deposit"?: boolean,"new_ends_on": string,"new_rent_kobo"?: number,"source_lease_id": string }; Returns: string
                           },
"take_usage_reading":
{ Args: { "period_end": string,"period_start": string,"target_organisation_id": string }; Returns: string
                           },
"usage_warnings":
{ Args: Record<PropertyKey, never>; Returns: {
              "allowed": number,"band": string,"metric": string,"organisation_id": string,"overage_kobo": number,"percentage": number,"used": number
            }[]
                           }
          }
          Enums: {
            "app_role": "owner"|"admin"|"property_manager"|"letting_agent"|"caretaker"|"maintenance_coordinator"|"accountant"|"screening_reviewer"|"landlord"|"tenant","assignment_scope": "organisation"|"branch"|"property"|"landlord","billing_period": "monthly"|"annual","charge_frequency": "one_off"|"monthly"|"quarterly"|"half_yearly"|"annual","charge_kind": "rent"|"service_charge"|"utility"|"agreed_fee","charge_status": "open"|"cancelled","commission_basis": "on_receipt"|"on_invoice","commission_type": "percentage"|"fixed","contact_channel": "phone"|"sms"|"whatsapp"|"email","deduction_category": "commission"|"maintenance"|"service_charge"|"utilities"|"statutory_fee"|"agency_expense"|"other","deposit_custodian": "agency"|"landlord","deposit_status": "expected"|"held"|"partially_refunded"|"refunded"|"forfeited"|"transferred","handover_kind": "move_in"|"move_out","import_kind": "properties_units"|"landlords"|"tenants_leases"|"opening_balances","import_row_status": "pending"|"valid"|"invalid"|"applied","import_status": "draft"|"validated"|"applied"|"rolled_back"|"failed","lease_party_role": "tenant"|"co_tenant"|"guarantor","lease_status": "draft"|"active"|"expired"|"terminated"|"renewed","membership_status": "invited"|"active"|"suspended","organisation_type": "agency"|"individual_landlord","plan_tier": "free"|"landlord"|"agent"|"growth"|"enterprise","property_type": "residential"|"commercial"|"mixed_use"|"estate"|"land","remittance_schedule": "on_receipt"|"weekly"|"fortnightly"|"monthly"|"quarterly"|"annually","rent_frequency": "annual"|"half_yearly"|"quarterly"|"monthly"|"irregular","subscription_status": "trialing"|"active"|"past_due"|"grace"|"suspended"|"cancelled","tenant_contact_kind": "next_of_kin"|"employer"|"business"|"emergency"|"referee","tenant_kind": "individual"|"organisation","unit_status": "vacant"|"occupied"|"reserved"|"under_maintenance"|"inactive","unit_type": "flat"|"self_contained"|"room"|"duplex"|"bungalow"|"shop"|"office"|"warehouse"|"other","usage_reading_status": "provisional"|"final"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"storage": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["owner", "admin", "property_manager", "letting_agent", "caretaker", "maintenance_coordinator", "accountant", "screening_reviewer", "landlord", "tenant"],"assignment_scope": ["organisation", "branch", "property", "landlord"],"billing_period": ["monthly", "annual"],"charge_frequency": ["one_off", "monthly", "quarterly", "half_yearly", "annual"],"charge_kind": ["rent", "service_charge", "utility", "agreed_fee"],"charge_status": ["open", "cancelled"],"commission_basis": ["on_receipt", "on_invoice"],"commission_type": ["percentage", "fixed"],"contact_channel": ["phone", "sms", "whatsapp", "email"],"deduction_category": ["commission", "maintenance", "service_charge", "utilities", "statutory_fee", "agency_expense", "other"],"deposit_custodian": ["agency", "landlord"],"deposit_status": ["expected", "held", "partially_refunded", "refunded", "forfeited", "transferred"],"handover_kind": ["move_in", "move_out"],"import_kind": ["properties_units", "landlords", "tenants_leases", "opening_balances"],"import_row_status": ["pending", "valid", "invalid", "applied"],"import_status": ["draft", "validated", "applied", "rolled_back", "failed"],"lease_party_role": ["tenant", "co_tenant", "guarantor"],"lease_status": ["draft", "active", "expired", "terminated", "renewed"],"membership_status": ["invited", "active", "suspended"],"organisation_type": ["agency", "individual_landlord"],"plan_tier": ["free", "landlord", "agent", "growth", "enterprise"],"property_type": ["residential", "commercial", "mixed_use", "estate", "land"],"remittance_schedule": ["on_receipt", "weekly", "fortnightly", "monthly", "quarterly", "annually"],"rent_frequency": ["annual", "half_yearly", "quarterly", "monthly", "irregular"],"subscription_status": ["trialing", "active", "past_due", "grace", "suspended", "cancelled"],"tenant_contact_kind": ["next_of_kin", "employer", "business", "emergency", "referee"],"tenant_kind": ["individual", "organisation"],"unit_status": ["vacant", "occupied", "reserved", "under_maintenance", "inactive"],"unit_type": ["flat", "self_contained", "room", "duplex", "bungalow", "shop", "office", "warehouse", "other"],"usage_reading_status": ["provisional", "final"]
          }
        },"storage": {
          Enums: {
            
          }
        }
} as const
