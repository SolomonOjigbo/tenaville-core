export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      assignments: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          organisation_id: string;
          scope_id: string | null;
          scope_type: Database['public']['Enums']['assignment_scope'];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organisation_id: string;
          scope_id?: string | null;
          scope_type: Database['public']['Enums']['assignment_scope'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organisation_id?: string;
          scope_id?: string | null;
          scope_type?: Database['public']['Enums']['assignment_scope'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assignments_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_events: {
        Row: {
          action: string;
          actor_label: string | null;
          actor_user_id: string | null;
          after: Json | null;
          before: Json | null;
          entity_id: string | null;
          entity_type: string;
          id: number;
          ip: unknown;
          occurred_at: string;
          organisation_id: string | null;
          reason: string | null;
          request_id: string | null;
          user_agent: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_label?: string | null;
          actor_user_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          ip?: unknown;
          occurred_at?: string;
          organisation_id?: string | null;
          reason?: string | null;
          request_id?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_label?: string | null;
          actor_user_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          ip?: unknown;
          occurred_at?: string;
          organisation_id?: string | null;
          reason?: string | null;
          request_id?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_events_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      billing_invoice_counters: {
        Row: {
          invoice_year: number;
          last_number: number;
          organisation_id: string;
        };
        ComputedFields: never;
        Insert: {
          invoice_year: number;
          last_number?: number;
          organisation_id: string;
        };
        Update: {
          invoice_year?: number;
          last_number?: number;
          organisation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'billing_invoice_counters_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      billing_invoice_lines: {
        Row: {
          amount_kobo: number;
          created_at: string;
          description: string;
          id: string;
          invoice_id: string;
          kind: Database['public']['Enums']['billing_invoice_line_kind'];
          organisation_id: string;
          quantity: number;
          unit_amount_kobo: number;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          created_at?: string;
          description: string;
          id?: string;
          invoice_id: string;
          kind: Database['public']['Enums']['billing_invoice_line_kind'];
          organisation_id: string;
          quantity?: number;
          unit_amount_kobo: number;
        };
        Update: {
          amount_kobo?: number;
          created_at?: string;
          description?: string;
          id?: string;
          invoice_id?: string;
          kind?: Database['public']['Enums']['billing_invoice_line_kind'];
          organisation_id?: string;
          quantity?: number;
          unit_amount_kobo?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'billing_invoice_lines_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'billing_invoices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'billing_invoice_lines_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      billing_invoice_payments: {
        Row: {
          amount_kobo: number;
          created_at: string;
          id: string;
          invoice_id: string;
          method: string;
          organisation_id: string;
          paid_on: string;
          recorded_by: string | null;
          reference: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          created_at?: string;
          id?: string;
          invoice_id: string;
          method: string;
          organisation_id: string;
          paid_on?: string;
          recorded_by?: string | null;
          reference?: string | null;
        };
        Update: {
          amount_kobo?: number;
          created_at?: string;
          id?: string;
          invoice_id?: string;
          method?: string;
          organisation_id?: string;
          paid_on?: string;
          recorded_by?: string | null;
          reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'billing_invoice_payments_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'billing_invoices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'billing_invoice_payments_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      billing_invoices: {
        Row: {
          amount_paid_kobo: number;
          created_at: string;
          created_by: string | null;
          currency: string;
          due_on: string | null;
          id: string;
          invoice_number: string;
          issued_on: string;
          notes: string | null;
          organisation_id: string;
          paid_at: string | null;
          period_end: string;
          period_start: string;
          plan_id: string;
          status: Database['public']['Enums']['billing_invoice_status'];
          subscription_id: string | null;
          subtotal_kobo: number;
          total_kobo: number;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_paid_kobo?: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          due_on?: string | null;
          id?: string;
          invoice_number: string;
          issued_on?: string;
          notes?: string | null;
          organisation_id: string;
          paid_at?: string | null;
          period_end: string;
          period_start: string;
          plan_id: string;
          status?: Database['public']['Enums']['billing_invoice_status'];
          subscription_id?: string | null;
          subtotal_kobo?: number;
          total_kobo?: number;
          updated_at?: string | null;
        };
        Update: {
          amount_paid_kobo?: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          due_on?: string | null;
          id?: string;
          invoice_number?: string;
          issued_on?: string;
          notes?: string | null;
          organisation_id?: string;
          paid_at?: string | null;
          period_end?: string;
          period_start?: string;
          plan_id?: string;
          status?: Database['public']['Enums']['billing_invoice_status'];
          subscription_id?: string | null;
          subtotal_kobo?: number;
          total_kobo?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'billing_invoices_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'billing_invoices_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'billing_invoices_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      branches: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          organisation_id: string;
          receipt_prefix: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          organisation_id: string;
          receipt_prefix?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          organisation_id?: string;
          receipt_prefix?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'branches_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      charges: {
        Row: {
          amount_kobo: number;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          charge_term_id: string | null;
          covers_partial_period: boolean;
          created_at: string;
          created_by: string | null;
          due_on: string;
          id: string;
          kind: Database['public']['Enums']['charge_kind'];
          lease_id: string;
          maintenance_cost_id: string | null;
          organisation_id: string;
          period_end: string;
          period_start: string;
          sequence: number;
          status: Database['public']['Enums']['charge_status'];
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          charge_term_id?: string | null;
          covers_partial_period?: boolean;
          created_at?: string;
          created_by?: string | null;
          due_on: string;
          id?: string;
          kind?: Database['public']['Enums']['charge_kind'];
          lease_id: string;
          maintenance_cost_id?: string | null;
          organisation_id: string;
          period_end: string;
          period_start: string;
          sequence: number;
          status?: Database['public']['Enums']['charge_status'];
          updated_at?: string | null;
        };
        Update: {
          amount_kobo?: number;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          charge_term_id?: string | null;
          covers_partial_period?: boolean;
          created_at?: string;
          created_by?: string | null;
          due_on?: string;
          id?: string;
          kind?: Database['public']['Enums']['charge_kind'];
          lease_id?: string;
          maintenance_cost_id?: string | null;
          organisation_id?: string;
          period_end?: string;
          period_start?: string;
          sequence?: number;
          status?: Database['public']['Enums']['charge_status'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'charges_charge_term_id_fkey';
            columns: ['charge_term_id'];
            isOneToOne: false;
            referencedRelation: 'lease_charge_terms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'charges_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'charges_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'charges_maintenance_cost_id_fkey';
            columns: ['maintenance_cost_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_costs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'charges_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      deposit_deductions: {
        Row: {
          amount_kobo: number;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          created_by: string | null;
          deposit_id: string;
          evidence_paths: string[];
          id: string;
          organisation_id: string;
          reason: string;
          reverses_deduction_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          deposit_id: string;
          evidence_paths?: string[];
          id?: string;
          organisation_id: string;
          reason: string;
          reverses_deduction_id?: string | null;
        };
        Update: {
          amount_kobo?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          deposit_id?: string;
          evidence_paths?: string[];
          id?: string;
          organisation_id?: string;
          reason?: string;
          reverses_deduction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'deposit_deductions_deposit_id_fkey';
            columns: ['deposit_id'];
            isOneToOne: false;
            referencedRelation: 'lease_deposits';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deposit_deductions_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deposit_deductions_reverses_deduction_id_fkey';
            columns: ['reverses_deduction_id'];
            isOneToOne: false;
            referencedRelation: 'deposit_deductions';
            referencedColumns: ['id'];
          },
        ];
      };
      device_sessions: {
        Row: {
          app_version: string | null;
          created_at: string;
          device_label: string | null;
          id: string;
          last_seen_at: string;
          organisation_id: string | null;
          platform: string;
          revoked_at: string | null;
          revoked_by: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          app_version?: string | null;
          created_at?: string;
          device_label?: string | null;
          id?: string;
          last_seen_at?: string;
          organisation_id?: string | null;
          platform: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          user_id: string;
        };
        Update: {
          app_version?: string | null;
          created_at?: string;
          device_label?: string | null;
          id?: string;
          last_seen_at?: string;
          organisation_id?: string | null;
          platform?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'device_sessions_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          bucket: string;
          created_at: string;
          document_type: Database['public']['Enums']['document_type'];
          entity_id: string;
          entity_type: string;
          expiry_date: string | null;
          file_name: string;
          id: string;
          issue_date: string | null;
          mime_type: string | null;
          notes: string | null;
          organisation_id: string;
          sensitive: boolean;
          size_bytes: number;
          storage_path: string;
          title: string | null;
          updated_at: string | null;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          bucket?: string;
          created_at?: string;
          document_type?: Database['public']['Enums']['document_type'];
          entity_id: string;
          entity_type: string;
          expiry_date?: string | null;
          file_name: string;
          id?: string;
          issue_date?: string | null;
          mime_type?: string | null;
          notes?: string | null;
          organisation_id: string;
          sensitive?: boolean;
          size_bytes?: number;
          storage_path: string;
          title?: string | null;
          updated_at?: string | null;
          uploaded_by?: string | null;
        };
        Update: {
          bucket?: string;
          created_at?: string;
          document_type?: Database['public']['Enums']['document_type'];
          entity_id?: string;
          entity_type?: string;
          expiry_date?: string | null;
          file_name?: string;
          id?: string;
          issue_date?: string | null;
          mime_type?: string | null;
          notes?: string | null;
          organisation_id?: string;
          sensitive?: boolean;
          size_bytes?: number;
          storage_path?: string;
          title?: string | null;
          updated_at?: string | null;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      features: {
        Row: {
          created_at: string;
          description: string;
          is_available: boolean;
          key: string;
          label: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description: string;
          is_available?: boolean;
          key: string;
          label: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          is_available?: boolean;
          key?: string;
          label?: string;
        };
        Relationships: [];
      };
      import_batches: {
        Row: {
          applied_at: string | null;
          created_at: string;
          created_by: string | null;
          error: string | null;
          file_name: string | null;
          id: string;
          invalid_count: number;
          kind: Database['public']['Enums']['import_kind'];
          organisation_id: string;
          rolled_back_at: string | null;
          rolled_back_by: string | null;
          row_count: number;
          source_headers: string[] | null;
          status: Database['public']['Enums']['import_status'];
          valid_count: number;
          validated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          applied_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          file_name?: string | null;
          id?: string;
          invalid_count?: number;
          kind: Database['public']['Enums']['import_kind'];
          organisation_id: string;
          rolled_back_at?: string | null;
          rolled_back_by?: string | null;
          row_count?: number;
          source_headers?: string[] | null;
          status?: Database['public']['Enums']['import_status'];
          valid_count?: number;
          validated_at?: string | null;
        };
        Update: {
          applied_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          file_name?: string | null;
          id?: string;
          invalid_count?: number;
          kind?: Database['public']['Enums']['import_kind'];
          organisation_id?: string;
          rolled_back_at?: string | null;
          rolled_back_by?: string | null;
          row_count?: number;
          source_headers?: string[] | null;
          status?: Database['public']['Enums']['import_status'];
          valid_count?: number;
          validated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'import_batches_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      import_rows: {
        Row: {
          batch_id: string;
          created_at: string;
          created_entity_id: string | null;
          created_entity_type: string | null;
          errors: NonNullable<Json>;
          id: string;
          organisation_id: string;
          raw: NonNullable<Json>;
          row_number: number;
          status: Database['public']['Enums']['import_row_status'];
        };
        ComputedFields: never;
        Insert: {
          batch_id: string;
          created_at?: string;
          created_entity_id?: string | null;
          created_entity_type?: string | null;
          errors?: NonNullable<Json>;
          id?: string;
          organisation_id: string;
          raw: NonNullable<Json>;
          row_number: number;
          status?: Database['public']['Enums']['import_row_status'];
        };
        Update: {
          batch_id?: string;
          created_at?: string;
          created_entity_id?: string | null;
          created_entity_type?: string | null;
          errors?: NonNullable<Json>;
          id?: string;
          organisation_id?: string;
          raw?: NonNullable<Json>;
          row_number?: number;
          status?: Database['public']['Enums']['import_row_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'import_rows_batch_id_fkey';
            columns: ['batch_id'];
            isOneToOne: false;
            referencedRelation: 'import_batches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'import_rows_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      landlord_ledger_entries: {
        Row: {
          amount_kobo: number;
          charge_id: string | null;
          commission_base_kobo: number | null;
          commission_rate_bps: number | null;
          created_at: string;
          created_by: string | null;
          description: string;
          entry_kind: Database['public']['Enums']['ledger_entry_kind'];
          funds_class: Database['public']['Enums']['ledger_funds_class'];
          id: string;
          landlord_id: string;
          maintenance_cost_id: string | null;
          occurred_on: string;
          organisation_id: string;
          payment_id: string | null;
          property_id: string | null;
          remittance_id: string | null;
          reverses_entry_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          charge_id?: string | null;
          commission_base_kobo?: number | null;
          commission_rate_bps?: number | null;
          created_at?: string;
          created_by?: string | null;
          description: string;
          entry_kind: Database['public']['Enums']['ledger_entry_kind'];
          funds_class: Database['public']['Enums']['ledger_funds_class'];
          id?: string;
          landlord_id: string;
          maintenance_cost_id?: string | null;
          occurred_on: string;
          organisation_id: string;
          payment_id?: string | null;
          property_id?: string | null;
          remittance_id?: string | null;
          reverses_entry_id?: string | null;
        };
        Update: {
          amount_kobo?: number;
          charge_id?: string | null;
          commission_base_kobo?: number | null;
          commission_rate_bps?: number | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          entry_kind?: Database['public']['Enums']['ledger_entry_kind'];
          funds_class?: Database['public']['Enums']['ledger_funds_class'];
          id?: string;
          landlord_id?: string;
          maintenance_cost_id?: string | null;
          occurred_on?: string;
          organisation_id?: string;
          payment_id?: string | null;
          property_id?: string | null;
          remittance_id?: string | null;
          reverses_entry_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'landlord_ledger_entries_charge_id_fkey';
            columns: ['charge_id'];
            isOneToOne: false;
            referencedRelation: 'charges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landlord_ledger_entries_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'landlords';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landlord_ledger_entries_maintenance_cost_id_fkey';
            columns: ['maintenance_cost_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_costs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landlord_ledger_entries_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landlord_ledger_entries_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landlord_ledger_entries_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landlord_ledger_entries_remittance_id_fkey';
            columns: ['remittance_id'];
            isOneToOne: false;
            referencedRelation: 'remittances';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landlord_ledger_entries_reverses_entry_id_fkey';
            columns: ['reverses_entry_id'];
            isOneToOne: false;
            referencedRelation: 'landlord_ledger_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      landlord_remittance_details: {
        Row: {
          account_name: string;
          account_number: string;
          bank_name: string;
          created_at: string;
          landlord_id: string;
          organisation_id: string;
          updated_at: string | null;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          account_name: string;
          account_number: string;
          bank_name: string;
          created_at?: string;
          landlord_id: string;
          organisation_id: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          account_name?: string;
          account_number?: string;
          bank_name?: string;
          created_at?: string;
          landlord_id?: string;
          organisation_id?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'landlord_remittance_details_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: true;
            referencedRelation: 'landlords';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landlord_remittance_details_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      landlords: {
        Row: {
          address_line: string | null;
          created_at: string;
          display_name: string;
          email: string | null;
          id: string;
          is_organisation: boolean;
          lga: string | null;
          notes: string | null;
          organisation_id: string;
          phone: string | null;
          preferred_channel: Database['public']['Enums']['contact_channel'];
          state_code: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          address_line?: string | null;
          created_at?: string;
          display_name: string;
          email?: string | null;
          id?: string;
          is_organisation?: boolean;
          lga?: string | null;
          notes?: string | null;
          organisation_id: string;
          phone?: string | null;
          preferred_channel?: Database['public']['Enums']['contact_channel'];
          state_code?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          address_line?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          id?: string;
          is_organisation?: boolean;
          lga?: string | null;
          notes?: string | null;
          organisation_id?: string;
          phone?: string | null;
          preferred_channel?: Database['public']['Enums']['contact_channel'];
          state_code?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'landlords_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landlords_state_code_fkey';
            columns: ['state_code'];
            isOneToOne: false;
            referencedRelation: 'nigerian_states';
            referencedColumns: ['code'];
          },
        ];
      };
      lease_charge_terms: {
        Row: {
          amount_kobo: number;
          created_at: string;
          created_by: string | null;
          description: string;
          due_day: number | null;
          ends_on: string;
          frequency: Database['public']['Enums']['charge_frequency'];
          id: string;
          kind: Database['public']['Enums']['charge_kind'];
          lease_id: string;
          organisation_id: string;
          raised_at: string | null;
          starts_on: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          created_at?: string;
          created_by?: string | null;
          description: string;
          due_day?: number | null;
          ends_on: string;
          frequency: Database['public']['Enums']['charge_frequency'];
          id?: string;
          kind: Database['public']['Enums']['charge_kind'];
          lease_id: string;
          organisation_id: string;
          raised_at?: string | null;
          starts_on: string;
          updated_at?: string | null;
        };
        Update: {
          amount_kobo?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          due_day?: number | null;
          ends_on?: string;
          frequency?: Database['public']['Enums']['charge_frequency'];
          id?: string;
          kind?: Database['public']['Enums']['charge_kind'];
          lease_id?: string;
          organisation_id?: string;
          raised_at?: string | null;
          starts_on?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lease_charge_terms_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_charge_terms_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_charge_terms_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      lease_deposits: {
        Row: {
          amount_kobo: number;
          created_at: string;
          custodian: Database['public']['Enums']['deposit_custodian'];
          id: string;
          lease_id: string;
          notes: string | null;
          organisation_id: string;
          received_on: string | null;
          settled_on: string | null;
          status: Database['public']['Enums']['deposit_status'];
          transferred_to_lease_id: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          created_at?: string;
          custodian?: Database['public']['Enums']['deposit_custodian'];
          id?: string;
          lease_id: string;
          notes?: string | null;
          organisation_id: string;
          received_on?: string | null;
          settled_on?: string | null;
          status?: Database['public']['Enums']['deposit_status'];
          transferred_to_lease_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount_kobo?: number;
          created_at?: string;
          custodian?: Database['public']['Enums']['deposit_custodian'];
          id?: string;
          lease_id?: string;
          notes?: string | null;
          organisation_id?: string;
          received_on?: string | null;
          settled_on?: string | null;
          status?: Database['public']['Enums']['deposit_status'];
          transferred_to_lease_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lease_deposits_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: true;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_deposits_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: true;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_deposits_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_deposits_transferred_to_lease_id_fkey';
            columns: ['transferred_to_lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_deposits_transferred_to_lease_id_fkey';
            columns: ['transferred_to_lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
        ];
      };
      lease_handovers: {
        Row: {
          created_at: string;
          evidence_paths: string[];
          happened_on: string;
          id: string;
          keys_returned: boolean | null;
          kind: Database['public']['Enums']['handover_kind'];
          lease_id: string;
          meter_readings: NonNullable<Json>;
          notes: string | null;
          organisation_id: string;
          outstanding_balance_kobo: number | null;
          recorded_by: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          evidence_paths?: string[];
          happened_on: string;
          id?: string;
          keys_returned?: boolean | null;
          kind: Database['public']['Enums']['handover_kind'];
          lease_id: string;
          meter_readings?: NonNullable<Json>;
          notes?: string | null;
          organisation_id: string;
          outstanding_balance_kobo?: number | null;
          recorded_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          evidence_paths?: string[];
          happened_on?: string;
          id?: string;
          keys_returned?: boolean | null;
          kind?: Database['public']['Enums']['handover_kind'];
          lease_id?: string;
          meter_readings?: NonNullable<Json>;
          notes?: string | null;
          organisation_id?: string;
          outstanding_balance_kobo?: number | null;
          recorded_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lease_handovers_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_handovers_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_handovers_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      lease_parties: {
        Row: {
          created_at: string;
          id: string;
          lease_id: string;
          liability_share_bps: number | null;
          organisation_id: string;
          role: Database['public']['Enums']['lease_party_role'];
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          lease_id: string;
          liability_share_bps?: number | null;
          organisation_id: string;
          role?: Database['public']['Enums']['lease_party_role'];
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lease_id?: string;
          liability_share_bps?: number | null;
          organisation_id?: string;
          role?: Database['public']['Enums']['lease_party_role'];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lease_parties_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_parties_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_parties_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_parties_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      leases: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_on: string;
          first_due_on: string | null;
          id: string;
          notes: string | null;
          organisation_id: string;
          reference: string | null;
          renewed_from_lease_id: string | null;
          rent_due_day: number | null;
          rent_frequency: Database['public']['Enums']['rent_frequency'];
          rent_kobo: number;
          starts_on: string;
          status: Database['public']['Enums']['lease_status'];
          terminated_on: string | null;
          termination_reason: string | null;
          unit_id: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          first_due_on?: string | null;
          id?: string;
          notes?: string | null;
          organisation_id: string;
          reference?: string | null;
          renewed_from_lease_id?: string | null;
          rent_due_day?: number | null;
          rent_frequency?: Database['public']['Enums']['rent_frequency'];
          rent_kobo: number;
          starts_on: string;
          status?: Database['public']['Enums']['lease_status'];
          terminated_on?: string | null;
          termination_reason?: string | null;
          unit_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          first_due_on?: string | null;
          id?: string;
          notes?: string | null;
          organisation_id?: string;
          reference?: string | null;
          renewed_from_lease_id?: string | null;
          rent_due_day?: number | null;
          rent_frequency?: Database['public']['Enums']['rent_frequency'];
          rent_kobo?: number;
          starts_on?: string;
          status?: Database['public']['Enums']['lease_status'];
          terminated_on?: string | null;
          termination_reason?: string | null;
          unit_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'leases_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_renewed_from_lease_id_fkey';
            columns: ['renewed_from_lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_renewed_from_lease_id_fkey';
            columns: ['renewed_from_lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_approvals: {
        Row: {
          amount_kobo: number;
          comment: string | null;
          cost_id: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          organisation_id: string;
          request_id: string;
          requested_at: string;
          requested_by: string | null;
          status: Database['public']['Enums']['maintenance_approval_status'];
          threshold_kobo: number;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          comment?: string | null;
          cost_id: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          organisation_id: string;
          request_id: string;
          requested_at?: string;
          requested_by?: string | null;
          status?: Database['public']['Enums']['maintenance_approval_status'];
          threshold_kobo: number;
          updated_at?: string | null;
        };
        Update: {
          amount_kobo?: number;
          comment?: string | null;
          cost_id?: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          organisation_id?: string;
          request_id?: string;
          requested_at?: string;
          requested_by?: string | null;
          status?: Database['public']['Enums']['maintenance_approval_status'];
          threshold_kobo?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_approvals_cost_id_fkey';
            columns: ['cost_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_costs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_approvals_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_approvals_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_costs: {
        Row: {
          amount_kobo: number;
          created_at: string;
          description: string;
          id: string;
          invoice_path: string | null;
          organisation_id: string;
          payer: Database['public']['Enums']['maintenance_payer'];
          reason: string;
          receipt_path: string | null;
          recorded_by: string | null;
          request_id: string;
          requires_approval: boolean;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          created_at?: string;
          description: string;
          id?: string;
          invoice_path?: string | null;
          organisation_id: string;
          payer: Database['public']['Enums']['maintenance_payer'];
          reason: string;
          receipt_path?: string | null;
          recorded_by?: string | null;
          request_id: string;
          requires_approval?: boolean;
        };
        Update: {
          amount_kobo?: number;
          created_at?: string;
          description?: string;
          id?: string;
          invoice_path?: string | null;
          organisation_id?: string;
          payer?: Database['public']['Enums']['maintenance_payer'];
          reason?: string;
          receipt_path?: string | null;
          recorded_by?: string | null;
          request_id?: string;
          requires_approval?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_costs_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_costs_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_events: {
        Row: {
          actor_label: string | null;
          actor_user_id: string | null;
          body: string | null;
          created_at: string;
          id: string;
          kind: string;
          metadata: NonNullable<Json>;
          organisation_id: string;
          request_id: string;
          visible_to_tenant: boolean;
        };
        ComputedFields: never;
        Insert: {
          actor_label?: string | null;
          actor_user_id?: string | null;
          body?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          metadata?: NonNullable<Json>;
          organisation_id: string;
          request_id: string;
          visible_to_tenant?: boolean;
        };
        Update: {
          actor_label?: string | null;
          actor_user_id?: string | null;
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          metadata?: NonNullable<Json>;
          organisation_id?: string;
          request_id?: string;
          visible_to_tenant?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_events_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_events_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_requests: {
        Row: {
          access_constraints: string | null;
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          assigned_at: string | null;
          assigned_by: string | null;
          assignee_user_id: string | null;
          category: Database['public']['Enums']['maintenance_category'];
          closed_at: string | null;
          completed_at: string | null;
          completed_by: string | null;
          completion_notes: string | null;
          coordinator_user_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          due_on: string | null;
          id: string;
          is_safety_issue: boolean;
          lease_id: string | null;
          no_cost: boolean;
          on_hold_reason: string | null;
          organisation_id: string;
          preferred_access_times: string | null;
          priority: Database['public']['Enums']['maintenance_priority'];
          property_id: string;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          reopen_count: number;
          reported_by_user_id: string | null;
          reported_on: string;
          started_at: string | null;
          status: Database['public']['Enums']['maintenance_status'];
          submitted_by: Database['public']['Enums']['maintenance_submitted_by'];
          tenant_confirmed_at: string | null;
          tenant_id: string | null;
          tenant_reopened_at: string | null;
          unit_id: string | null;
          updated_at: string | null;
          urgency: Database['public']['Enums']['maintenance_urgency'];
          vendor_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          access_constraints?: string | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          assigned_at?: string | null;
          assigned_by?: string | null;
          assignee_user_id?: string | null;
          category: Database['public']['Enums']['maintenance_category'];
          closed_at?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          completion_notes?: string | null;
          coordinator_user_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description: string;
          due_on?: string | null;
          id?: string;
          is_safety_issue?: boolean;
          lease_id?: string | null;
          no_cost?: boolean;
          on_hold_reason?: string | null;
          organisation_id: string;
          preferred_access_times?: string | null;
          priority?: Database['public']['Enums']['maintenance_priority'];
          property_id: string;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          reopen_count?: number;
          reported_by_user_id?: string | null;
          reported_on?: string;
          started_at?: string | null;
          status?: Database['public']['Enums']['maintenance_status'];
          submitted_by: Database['public']['Enums']['maintenance_submitted_by'];
          tenant_confirmed_at?: string | null;
          tenant_id?: string | null;
          tenant_reopened_at?: string | null;
          unit_id?: string | null;
          updated_at?: string | null;
          urgency?: Database['public']['Enums']['maintenance_urgency'];
          vendor_id?: string | null;
        };
        Update: {
          access_constraints?: string | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          assigned_at?: string | null;
          assigned_by?: string | null;
          assignee_user_id?: string | null;
          category?: Database['public']['Enums']['maintenance_category'];
          closed_at?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          completion_notes?: string | null;
          coordinator_user_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          due_on?: string | null;
          id?: string;
          is_safety_issue?: boolean;
          lease_id?: string | null;
          no_cost?: boolean;
          on_hold_reason?: string | null;
          organisation_id?: string;
          preferred_access_times?: string | null;
          priority?: Database['public']['Enums']['maintenance_priority'];
          property_id?: string;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          reopen_count?: number;
          reported_by_user_id?: string | null;
          reported_on?: string;
          started_at?: string | null;
          status?: Database['public']['Enums']['maintenance_status'];
          submitted_by?: Database['public']['Enums']['maintenance_submitted_by'];
          tenant_confirmed_at?: string | null;
          tenant_id?: string | null;
          tenant_reopened_at?: string | null;
          unit_id?: string | null;
          updated_at?: string | null;
          urgency?: Database['public']['Enums']['maintenance_urgency'];
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_requests_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      management_mandates: {
        Row: {
          commission_basis: Database['public']['Enums']['commission_basis'];
          commission_fixed_kobo: number | null;
          commission_rate_bps: number | null;
          commission_type: Database['public']['Enums']['commission_type'];
          created_at: string;
          ends_on: string | null;
          id: string;
          landlord_id: string;
          notes: string | null;
          organisation_id: string;
          permitted_deductions: Database['public']['Enums']['deduction_category'][];
          reference: string | null;
          remittance_schedule: Database['public']['Enums']['remittance_schedule'];
          starts_on: string;
          terminated_on: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          commission_basis?: Database['public']['Enums']['commission_basis'];
          commission_fixed_kobo?: number | null;
          commission_rate_bps?: number | null;
          commission_type?: Database['public']['Enums']['commission_type'];
          created_at?: string;
          ends_on?: string | null;
          id?: string;
          landlord_id: string;
          notes?: string | null;
          organisation_id: string;
          permitted_deductions?: Database['public']['Enums']['deduction_category'][];
          reference?: string | null;
          remittance_schedule?: Database['public']['Enums']['remittance_schedule'];
          starts_on: string;
          terminated_on?: string | null;
          updated_at?: string | null;
        };
        Update: {
          commission_basis?: Database['public']['Enums']['commission_basis'];
          commission_fixed_kobo?: number | null;
          commission_rate_bps?: number | null;
          commission_type?: Database['public']['Enums']['commission_type'];
          created_at?: string;
          ends_on?: string | null;
          id?: string;
          landlord_id?: string;
          notes?: string | null;
          organisation_id?: string;
          permitted_deductions?: Database['public']['Enums']['deduction_category'][];
          reference?: string | null;
          remittance_schedule?: Database['public']['Enums']['remittance_schedule'];
          starts_on?: string;
          terminated_on?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'management_mandates_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'landlords';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'management_mandates_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      memberships: {
        Row: {
          accepted_at: string | null;
          branch_id: string | null;
          created_at: string;
          id: string;
          invited_at: string | null;
          invited_by: string | null;
          organisation_id: string;
          role: Database['public']['Enums']['app_role'];
          status: Database['public']['Enums']['membership_status'];
          suspended_at: string | null;
          updated_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          organisation_id: string;
          role: Database['public']['Enums']['app_role'];
          status?: Database['public']['Enums']['membership_status'];
          suspended_at?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          accepted_at?: string | null;
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          organisation_id?: string;
          role?: Database['public']['Enums']['app_role'];
          status?: Database['public']['Enums']['membership_status'];
          suspended_at?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      message_deliveries: {
        Row: {
          attempted_at: string;
          channel: Database['public']['Enums']['message_channel'];
          error: string | null;
          id: string;
          message_id: string;
          organisation_id: string;
          provider: string | null;
          provider_message_id: string | null;
          status: Database['public']['Enums']['message_status'];
        };
        ComputedFields: never;
        Insert: {
          attempted_at?: string;
          channel: Database['public']['Enums']['message_channel'];
          error?: string | null;
          id?: string;
          message_id: string;
          organisation_id: string;
          provider?: string | null;
          provider_message_id?: string | null;
          status: Database['public']['Enums']['message_status'];
        };
        Update: {
          attempted_at?: string;
          channel?: Database['public']['Enums']['message_channel'];
          error?: string | null;
          id?: string;
          message_id?: string;
          organisation_id?: string;
          provider?: string | null;
          provider_message_id?: string | null;
          status?: Database['public']['Enums']['message_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'message_deliveries_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_deliveries_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      message_templates: {
        Row: {
          active: boolean;
          approval_status: Database['public']['Enums']['message_template_status'];
          body: string;
          channel: Database['public']['Enums']['message_channel'];
          created_at: string;
          created_by: string | null;
          id: string;
          key: string;
          name: string;
          organisation_id: string;
          subject: string | null;
          updated_at: string | null;
          whatsapp_template_name: string | null;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          approval_status?: Database['public']['Enums']['message_template_status'];
          body: string;
          channel: Database['public']['Enums']['message_channel'];
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key: string;
          name: string;
          organisation_id: string;
          subject?: string | null;
          updated_at?: string | null;
          whatsapp_template_name?: string | null;
        };
        Update: {
          active?: boolean;
          approval_status?: Database['public']['Enums']['message_template_status'];
          body?: string;
          channel?: Database['public']['Enums']['message_channel'];
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key?: string;
          name?: string;
          organisation_id?: string;
          subject?: string | null;
          updated_at?: string | null;
          whatsapp_template_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'message_templates_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          channel: Database['public']['Enums']['message_channel'];
          cost_kobo: number;
          created_at: string;
          created_by: string | null;
          error: string | null;
          id: string;
          organisation_id: string;
          provider: string | null;
          provider_message_id: string | null;
          purpose: Database['public']['Enums']['message_purpose'];
          recipient_address: string;
          recipient_id: string | null;
          recipient_name: string;
          recipient_type: string;
          recipient_user_id: string | null;
          related_id: string | null;
          related_type: string | null;
          sent_at: string | null;
          sent_channel: Database['public']['Enums']['message_channel'] | null;
          status: Database['public']['Enums']['message_status'];
          subject: string | null;
          template_id: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          channel: Database['public']['Enums']['message_channel'];
          cost_kobo?: number;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          id?: string;
          organisation_id: string;
          provider?: string | null;
          provider_message_id?: string | null;
          purpose?: Database['public']['Enums']['message_purpose'];
          recipient_address: string;
          recipient_id?: string | null;
          recipient_name: string;
          recipient_type: string;
          recipient_user_id?: string | null;
          related_id?: string | null;
          related_type?: string | null;
          sent_at?: string | null;
          sent_channel?: Database['public']['Enums']['message_channel'] | null;
          status?: Database['public']['Enums']['message_status'];
          subject?: string | null;
          template_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          body?: string;
          channel?: Database['public']['Enums']['message_channel'];
          cost_kobo?: number;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          id?: string;
          organisation_id?: string;
          provider?: string | null;
          provider_message_id?: string | null;
          purpose?: Database['public']['Enums']['message_purpose'];
          recipient_address?: string;
          recipient_id?: string | null;
          recipient_name?: string;
          recipient_type?: string;
          recipient_user_id?: string | null;
          related_id?: string | null;
          related_type?: string | null;
          sent_at?: string | null;
          sent_channel?: Database['public']['Enums']['message_channel'] | null;
          status?: Database['public']['Enums']['message_status'];
          subject?: string | null;
          template_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'message_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      nigerian_states: {
        Row: {
          code: string;
          name: string;
          zone: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          name: string;
          zone: string;
        };
        Update: {
          code?: string;
          name?: string;
          zone?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          channel: Database['public']['Enums']['message_channel'];
          id: string;
          opted_in: boolean;
          organisation_id: string;
          purpose: Database['public']['Enums']['message_purpose'];
          updated_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          channel: Database['public']['Enums']['message_channel'];
          id?: string;
          opted_in?: boolean;
          organisation_id: string;
          purpose?: Database['public']['Enums']['message_purpose'];
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          channel?: Database['public']['Enums']['message_channel'];
          id?: string;
          opted_in?: boolean;
          organisation_id?: string;
          purpose?: Database['public']['Enums']['message_purpose'];
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      organisations: {
        Row: {
          country_code: string;
          created_at: string;
          id: string;
          lease_expiry_alert_days: number[];
          maintenance_approval_threshold_kobo: number;
          name: string;
          receipt_prefix: string;
          timezone: string;
          type: Database['public']['Enums']['organisation_type'];
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          country_code?: string;
          created_at?: string;
          id?: string;
          lease_expiry_alert_days?: number[];
          maintenance_approval_threshold_kobo?: number;
          name: string;
          receipt_prefix?: string;
          timezone?: string;
          type: Database['public']['Enums']['organisation_type'];
          updated_at?: string | null;
        };
        Update: {
          country_code?: string;
          created_at?: string;
          id?: string;
          lease_expiry_alert_days?: number[];
          maintenance_approval_threshold_kobo?: number;
          name?: string;
          receipt_prefix?: string;
          timezone?: string;
          type?: Database['public']['Enums']['organisation_type'];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      payment_allocations: {
        Row: {
          amount_kobo: number;
          charge_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          lease_id: string;
          note: string | null;
          organisation_id: string;
          payment_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          charge_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lease_id: string;
          note?: string | null;
          organisation_id: string;
          payment_id: string;
        };
        Update: {
          amount_kobo?: number;
          charge_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lease_id?: string;
          note?: string | null;
          organisation_id?: string;
          payment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_allocations_charge_id_fkey';
            columns: ['charge_id'];
            isOneToOne: false;
            referencedRelation: 'charges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_allocations_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_allocations_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_allocations_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_allocations_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount_kobo: number;
          branch_id: string | null;
          client_mutation_id: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          id: string;
          lease_id: string;
          method: Database['public']['Enums']['payment_method'];
          notes: string | null;
          organisation_id: string;
          paid_on: string;
          recorded_at: string;
          recorded_by: string | null;
          reference: string | null;
          reversal_of_id: string | null;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
          status: Database['public']['Enums']['payment_status'];
          tenant_id: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          branch_id?: string | null;
          client_mutation_id?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          id?: string;
          lease_id: string;
          method: Database['public']['Enums']['payment_method'];
          notes?: string | null;
          organisation_id: string;
          paid_on: string;
          recorded_at?: string;
          recorded_by?: string | null;
          reference?: string | null;
          reversal_of_id?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount_kobo?: number;
          branch_id?: string | null;
          client_mutation_id?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          id?: string;
          lease_id?: string;
          method?: Database['public']['Enums']['payment_method'];
          notes?: string | null;
          organisation_id?: string;
          paid_on?: string;
          recorded_at?: string;
          recorded_by?: string | null;
          reference?: string | null;
          reversal_of_id?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_reversal_of_id_fkey';
            columns: ['reversal_of_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_features: {
        Row: {
          feature_key: string;
          plan_id: string;
        };
        ComputedFields: never;
        Insert: {
          feature_key: string;
          plan_id: string;
        };
        Update: {
          feature_key?: string;
          plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_features_feature_key_fkey';
            columns: ['feature_key'];
            isOneToOne: false;
            referencedRelation: 'features';
            referencedColumns: ['key'];
          },
          {
            foreignKeyName: 'plan_features_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_roles: {
        Row: {
          plan_id: string;
          role: Database['public']['Enums']['app_role'];
        };
        ComputedFields: never;
        Insert: {
          plan_id: string;
          role: Database['public']['Enums']['app_role'];
        };
        Update: {
          plan_id?: string;
          role?: Database['public']['Enums']['app_role'];
        };
        Relationships: [
          {
            foreignKeyName: 'plan_roles_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          billing_period: Database['public']['Enums']['billing_period'];
          created_at: string;
          description: string | null;
          extra_user_kobo: number | null;
          id: string;
          included_messages: number | null;
          is_public: boolean;
          name: string;
          price_kobo: number;
          property_limit: number | null;
          sort_order: number;
          storage_mb: number | null;
          tier: Database['public']['Enums']['plan_tier'] | null;
          trial_days: number;
          unit_limit: number | null;
          unit_overage_kobo: number | null;
          updated_at: string | null;
          user_limit: number | null;
        };
        ComputedFields: never;
        Insert: {
          billing_period: Database['public']['Enums']['billing_period'];
          created_at?: string;
          description?: string | null;
          extra_user_kobo?: number | null;
          id: string;
          included_messages?: number | null;
          is_public?: boolean;
          name: string;
          price_kobo: number;
          property_limit?: number | null;
          sort_order?: number;
          storage_mb?: number | null;
          tier?: Database['public']['Enums']['plan_tier'] | null;
          trial_days?: number;
          unit_limit?: number | null;
          unit_overage_kobo?: number | null;
          updated_at?: string | null;
          user_limit?: number | null;
        };
        Update: {
          billing_period?: Database['public']['Enums']['billing_period'];
          created_at?: string;
          description?: string | null;
          extra_user_kobo?: number | null;
          id?: string;
          included_messages?: number | null;
          is_public?: boolean;
          name?: string;
          price_kobo?: number;
          property_limit?: number | null;
          sort_order?: number;
          storage_mb?: number | null;
          tier?: Database['public']['Enums']['plan_tier'] | null;
          trial_days?: number;
          unit_limit?: number | null;
          unit_overage_kobo?: number | null;
          updated_at?: string | null;
          user_limit?: number | null;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address_line: string;
          area: string | null;
          branch_id: string | null;
          created_at: string;
          id: string;
          landlord_id: string;
          latitude: number | null;
          lga: string | null;
          longitude: number | null;
          name: string;
          notes: string | null;
          organisation_id: string;
          property_type: Database['public']['Enums']['property_type'];
          reference: string | null;
          state_code: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          address_line: string;
          area?: string | null;
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          landlord_id: string;
          latitude?: number | null;
          lga?: string | null;
          longitude?: number | null;
          name: string;
          notes?: string | null;
          organisation_id: string;
          property_type: Database['public']['Enums']['property_type'];
          reference?: string | null;
          state_code: string;
          updated_at?: string | null;
        };
        Update: {
          address_line?: string;
          area?: string | null;
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          landlord_id?: string;
          latitude?: number | null;
          lga?: string | null;
          longitude?: number | null;
          name?: string;
          notes?: string | null;
          organisation_id?: string;
          property_type?: Database['public']['Enums']['property_type'];
          reference?: string | null;
          state_code?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'properties_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'properties_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'landlords';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'properties_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'properties_state_code_fkey';
            columns: ['state_code'];
            isOneToOne: false;
            referencedRelation: 'nigerian_states';
            referencedColumns: ['code'];
          },
        ];
      };
      property_photos: {
        Row: {
          caption: string | null;
          created_at: string;
          id: string;
          organisation_id: string;
          property_id: string;
          sort_order: number;
          storage_path: string;
          unit_id: string | null;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          organisation_id: string;
          property_id: string;
          sort_order?: number;
          storage_path: string;
          unit_id?: string | null;
          uploaded_by?: string | null;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          organisation_id?: string;
          property_id?: string;
          sort_order?: number;
          storage_path?: string;
          unit_id?: string | null;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'property_photos_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'property_photos_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'property_photos_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
        ];
      };
      receipt_counters: {
        Row: {
          branch_id: string | null;
          branch_key: string | null;
          id: string;
          last_number: number;
          organisation_id: string;
          updated_at: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          branch_id?: string | null;
          branch_key?: never;
          id?: string;
          last_number?: number;
          organisation_id: string;
          updated_at?: string;
          year: number;
        };
        Update: {
          branch_id?: string | null;
          branch_key?: never;
          id?: string;
          last_number?: number;
          organisation_id?: string;
          updated_at?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'receipt_counters_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'receipt_counters_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      receipts: {
        Row: {
          branch_code: string | null;
          branch_id: string | null;
          branch_key: string | null;
          created_at: string;
          id: string;
          issued_at: string;
          issued_by: string | null;
          issued_on: string;
          lease_id: string;
          organisation_id: string;
          payment_id: string;
          prefix: string;
          receipt_number: string;
          replaces_receipt_id: string | null;
          sequence: number;
          status: Database['public']['Enums']['receipt_status'];
          verification_code: string;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          branch_code?: string | null;
          branch_id?: string | null;
          branch_key?: never;
          created_at?: string;
          id?: string;
          issued_at?: string;
          issued_by?: string | null;
          issued_on: string;
          lease_id: string;
          organisation_id: string;
          payment_id: string;
          prefix: string;
          receipt_number: string;
          replaces_receipt_id?: string | null;
          sequence: number;
          status?: Database['public']['Enums']['receipt_status'];
          verification_code?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          year: number;
        };
        Update: {
          branch_code?: string | null;
          branch_id?: string | null;
          branch_key?: never;
          created_at?: string;
          id?: string;
          issued_at?: string;
          issued_by?: string | null;
          issued_on?: string;
          lease_id?: string;
          organisation_id?: string;
          payment_id?: string;
          prefix?: string;
          receipt_number?: string;
          replaces_receipt_id?: string | null;
          sequence?: number;
          status?: Database['public']['Enums']['receipt_status'];
          verification_code?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'receipts_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'receipts_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'receipts_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'receipts_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'receipts_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: true;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'receipts_replaces_receipt_id_fkey';
            columns: ['replaces_receipt_id'];
            isOneToOne: false;
            referencedRelation: 'receipts';
            referencedColumns: ['id'];
          },
        ];
      };
      remittances: {
        Row: {
          amount_kobo: number;
          created_at: string;
          id: string;
          landlord_id: string;
          method: Database['public']['Enums']['payment_method'];
          notes: string | null;
          organisation_id: string;
          paid_on: string;
          recorded_by: string | null;
          reference: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          created_at?: string;
          id?: string;
          landlord_id: string;
          method: Database['public']['Enums']['payment_method'];
          notes?: string | null;
          organisation_id: string;
          paid_on: string;
          recorded_by?: string | null;
          reference?: string | null;
        };
        Update: {
          amount_kobo?: number;
          created_at?: string;
          id?: string;
          landlord_id?: string;
          method?: Database['public']['Enums']['payment_method'];
          notes?: string | null;
          organisation_id?: string;
          paid_on?: string;
          recorded_by?: string | null;
          reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'remittances_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'landlords';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'remittances_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      statements: {
        Row: {
          closing_balance_kobo: number;
          created_at: string;
          created_by: string | null;
          id: string;
          issued_at: string | null;
          issued_by: string | null;
          landlord_id: string;
          lines: NonNullable<Json>;
          opening_balance_kobo: number;
          organisation_id: string;
          period_end: string;
          period_start: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          revision_number: number;
          status: Database['public']['Enums']['statement_status'];
          supersedes_statement_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          closing_balance_kobo: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          issued_at?: string | null;
          issued_by?: string | null;
          landlord_id: string;
          lines: NonNullable<Json>;
          opening_balance_kobo: number;
          organisation_id: string;
          period_end: string;
          period_start: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          revision_number?: number;
          status?: Database['public']['Enums']['statement_status'];
          supersedes_statement_id?: string | null;
        };
        Update: {
          closing_balance_kobo?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          issued_at?: string | null;
          issued_by?: string | null;
          landlord_id?: string;
          lines?: NonNullable<Json>;
          opening_balance_kobo?: number;
          organisation_id?: string;
          period_end?: string;
          period_start?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          revision_number?: number;
          status?: Database['public']['Enums']['statement_status'];
          supersedes_statement_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'statements_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'landlords';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'statements_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'statements_supersedes_statement_id_fkey';
            columns: ['supersedes_statement_id'];
            isOneToOne: false;
            referencedRelation: 'statements';
            referencedColumns: ['id'];
          },
        ];
      };
      subscription_changes: {
        Row: {
          changed_by: string | null;
          created_at: string;
          effective_on: string;
          from_plan_id: string;
          id: string;
          invoice_id: string | null;
          kind: Database['public']['Enums']['subscription_change_kind'];
          organisation_id: string;
          reason: string;
          subscription_id: string;
          to_plan_id: string;
        };
        ComputedFields: never;
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          effective_on?: string;
          from_plan_id: string;
          id?: string;
          invoice_id?: string | null;
          kind: Database['public']['Enums']['subscription_change_kind'];
          organisation_id: string;
          reason: string;
          subscription_id: string;
          to_plan_id: string;
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          effective_on?: string;
          from_plan_id?: string;
          id?: string;
          invoice_id?: string | null;
          kind?: Database['public']['Enums']['subscription_change_kind'];
          organisation_id?: string;
          reason?: string;
          subscription_id?: string;
          to_plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_changes_from_plan_id_fkey';
            columns: ['from_plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_changes_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'billing_invoices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_changes_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_changes_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_changes_to_plan_id_fkey';
            columns: ['to_plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancelled_at: string | null;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          grace_ends_on: string | null;
          id: string;
          organisation_id: string;
          plan_id: string;
          status: Database['public']['Enums']['subscription_status'];
          trial_ends_on: string | null;
          units_included: number | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          cancelled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          grace_ends_on?: string | null;
          id?: string;
          organisation_id: string;
          plan_id: string;
          status?: Database['public']['Enums']['subscription_status'];
          trial_ends_on?: string | null;
          units_included?: number | null;
          updated_at?: string | null;
        };
        Update: {
          cancelled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          grace_ends_on?: string | null;
          id?: string;
          organisation_id?: string;
          plan_id?: string;
          status?: Database['public']['Enums']['subscription_status'];
          trial_ends_on?: string | null;
          units_included?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: true;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          created_by: string | null;
          dedupe_key: string | null;
          due_on: string | null;
          id: string;
          notes: string | null;
          organisation_id: string;
          owner_user_id: string | null;
          priority: Database['public']['Enums']['task_priority'];
          related_id: string | null;
          related_type: string | null;
          status: Database['public']['Enums']['task_status'];
          title: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          dedupe_key?: string | null;
          due_on?: string | null;
          id?: string;
          notes?: string | null;
          organisation_id: string;
          owner_user_id?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          related_id?: string | null;
          related_type?: string | null;
          status?: Database['public']['Enums']['task_status'];
          title: string;
          updated_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          dedupe_key?: string | null;
          due_on?: string | null;
          id?: string;
          notes?: string | null;
          organisation_id?: string;
          owner_user_id?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          related_id?: string | null;
          related_type?: string | null;
          status?: Database['public']['Enums']['task_status'];
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_contacts: {
        Row: {
          address_line: string | null;
          created_at: string;
          email: string | null;
          id: string;
          kind: Database['public']['Enums']['tenant_contact_kind'];
          name: string;
          notes: string | null;
          organisation_id: string;
          phone: string | null;
          relationship: string | null;
          tenant_id: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          address_line?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          kind: Database['public']['Enums']['tenant_contact_kind'];
          name: string;
          notes?: string | null;
          organisation_id: string;
          phone?: string | null;
          relationship?: string | null;
          tenant_id: string;
          updated_at?: string | null;
        };
        Update: {
          address_line?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['tenant_contact_kind'];
          name?: string;
          notes?: string | null;
          organisation_id?: string;
          phone?: string | null;
          relationship?: string | null;
          tenant_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_contacts_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tenant_contacts_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenants: {
        Row: {
          business_registration: string | null;
          created_at: string;
          date_of_birth: string | null;
          display_name: string;
          email: string | null;
          employer_name: string | null;
          id: string;
          kind: Database['public']['Enums']['tenant_kind'];
          notes: string | null;
          occupation: string | null;
          organisation_id: string;
          phone: string | null;
          preferred_channel: Database['public']['Enums']['contact_channel'];
          updated_at: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_registration?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          display_name: string;
          email?: string | null;
          employer_name?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['tenant_kind'];
          notes?: string | null;
          occupation?: string | null;
          organisation_id: string;
          phone?: string | null;
          preferred_channel?: Database['public']['Enums']['contact_channel'];
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          business_registration?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          display_name?: string;
          email?: string | null;
          employer_name?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['tenant_kind'];
          notes?: string | null;
          occupation?: string | null;
          organisation_id?: string;
          phone?: string | null;
          preferred_channel?: Database['public']['Enums']['contact_channel'];
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tenants_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
      units: {
        Row: {
          asking_rent_kobo: number | null;
          bathrooms: number | null;
          bedrooms: number | null;
          created_at: string;
          facilities: string[];
          floor_area_sqm: number | null;
          id: string;
          label: string;
          notes: string | null;
          organisation_id: string;
          property_id: string;
          reference: string | null;
          status: Database['public']['Enums']['unit_status'];
          unit_type: Database['public']['Enums']['unit_type'];
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          asking_rent_kobo?: number | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          created_at?: string;
          facilities?: string[];
          floor_area_sqm?: number | null;
          id?: string;
          label: string;
          notes?: string | null;
          organisation_id: string;
          property_id: string;
          reference?: string | null;
          status?: Database['public']['Enums']['unit_status'];
          unit_type: Database['public']['Enums']['unit_type'];
          updated_at?: string | null;
        };
        Update: {
          asking_rent_kobo?: number | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          created_at?: string;
          facilities?: string[];
          floor_area_sqm?: number | null;
          id?: string;
          label?: string;
          notes?: string | null;
          organisation_id?: string;
          property_id?: string;
          reference?: string | null;
          status?: Database['public']['Enums']['unit_status'];
          unit_type?: Database['public']['Enums']['unit_type'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'units_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'units_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      usage_readings: {
        Row: {
          created_at: string;
          finalised_at: string | null;
          id: string;
          messages: number | null;
          organisation_id: string;
          period_end: string;
          period_start: string;
          plan_id: string;
          properties: number | null;
          property_limit: number | null;
          status: Database['public']['Enums']['usage_reading_status'];
          storage_mb: number | null;
          taken_at: string;
          unit_limit: number | null;
          unit_overage_kobo: number | null;
          units: number | null;
          updated_at: string | null;
          user_limit: number | null;
          users: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          finalised_at?: string | null;
          id?: string;
          messages?: number | null;
          organisation_id: string;
          period_end: string;
          period_start: string;
          plan_id: string;
          properties?: number | null;
          property_limit?: number | null;
          status?: Database['public']['Enums']['usage_reading_status'];
          storage_mb?: number | null;
          taken_at?: string;
          unit_limit?: number | null;
          unit_overage_kobo?: number | null;
          units?: number | null;
          updated_at?: string | null;
          user_limit?: number | null;
          users?: number | null;
        };
        Update: {
          created_at?: string;
          finalised_at?: string | null;
          id?: string;
          messages?: number | null;
          organisation_id?: string;
          period_end?: string;
          period_start?: string;
          plan_id?: string;
          properties?: number | null;
          property_limit?: number | null;
          status?: Database['public']['Enums']['usage_reading_status'];
          storage_mb?: number | null;
          taken_at?: string;
          unit_limit?: number | null;
          unit_overage_kobo?: number | null;
          units?: number | null;
          updated_at?: string | null;
          user_limit?: number | null;
          users?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_readings_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'usage_readings_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          availability_notes: string | null;
          contact_name: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          name: string;
          organisation_id: string;
          performance_notes: string | null;
          phone: string | null;
          service_areas: string[];
          status: Database['public']['Enums']['vendor_status'];
          trade: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          availability_notes?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          organisation_id: string;
          performance_notes?: string | null;
          phone?: string | null;
          service_areas?: string[];
          status?: Database['public']['Enums']['vendor_status'];
          trade: string;
          updated_at?: string | null;
        };
        Update: {
          availability_notes?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          organisation_id?: string;
          performance_notes?: string | null;
          phone?: string | null;
          service_areas?: string[];
          status?: Database['public']['Enums']['vendor_status'];
          trade?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vendors_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      lease_overview: {
        Row: {
          alert_threshold_days: number | null;
          days_to_expiry: number | null;
          display_status: string | null;
          ends_on: string;
          has_renewal: boolean | null;
          id: string;
          organisation_id: string;
          reference: string | null;
          renewed_from_lease_id: string | null;
          rent_frequency: Database['public']['Enums']['rent_frequency'];
          rent_kobo: number;
          starts_on: string;
          status: Database['public']['Enums']['lease_status'];
          terminated_on: string | null;
          unit_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: 'leases_organisation_id_fkey';
            columns: ['organisation_id'];
            isOneToOne: false;
            referencedRelation: 'organisations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_renewed_from_lease_id_fkey';
            columns: ['renewed_from_lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_overview';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_renewed_from_lease_id_fkey';
            columns: ['renewed_from_lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      accept_invitation: { Args: { target_organisation_id: string }; Returns: undefined };
      activate_lease: { Args: { charge_rows: Json; target_lease_id: string }; Returns: number };
      add_lease_charge_term: {
        Args: {
          charge_rows: Json;
          target_lease_id: string;
          term_amount_kobo: number;
          term_description: string;
          term_due_day?: number;
          term_ends_on: string;
          term_frequency: Database['public']['Enums']['charge_frequency'];
          term_kind: Database['public']['Enums']['charge_kind'];
          term_starts_on: string;
        };
        Returns: string;
      };
      add_maintenance_comment: {
        Args: { p_body: string; p_internal?: boolean; p_request_id: string };
        Returns: string;
      };
      apply_property_import: {
        Args: { target_batch_id: string };
        Returns: {
          landlords_created: number;
          properties_created: number;
          units_created: number;
        }[];
      };
      assign_maintenance_request: {
        Args: {
          p_assignee_user_id?: string;
          p_coordinator_user_id?: string;
          p_due_on?: string;
          p_note?: string;
          p_priority?: Database['public']['Enums']['maintenance_priority'];
          p_request_id: string;
          p_vendor_id?: string;
        };
        Returns: undefined;
      };
      change_membership_role: {
        Args: {
          change_reason: string;
          new_role: Database['public']['Enums']['app_role'];
          target_membership_id: string;
        };
        Returns: undefined;
      };
      change_subscription_plan: {
        Args: { p_organisation_id: string; p_plan_id: string; p_reason: string };
        Returns: string;
      };
      confirm_maintenance_resolution: { Args: { p_request_id: string }; Returns: undefined };
      create_lease_with_tenant: {
        Args: {
          activate?: boolean;
          deposit_amount_kobo?: number;
          deposit_custodian?: Database['public']['Enums']['deposit_custodian'];
          lease_charges?: Json;
          lease_ends_on: string;
          lease_reference?: string;
          lease_rent_frequency?: Database['public']['Enums']['rent_frequency'];
          lease_rent_kobo: number;
          lease_starts_on: string;
          target_organisation_id: string;
          target_tenant_id: string;
          target_unit_id: string;
        };
        Returns: string;
      };
      create_maintenance_request: {
        Args: {
          p_access_constraints?: string;
          p_category?: Database['public']['Enums']['maintenance_category'];
          p_description?: string;
          p_is_safety_issue?: boolean;
          p_lease_id?: string;
          p_preferred_access_times?: string;
          p_property_id: string;
          p_unit_id?: string;
          p_urgency?: Database['public']['Enums']['maintenance_urgency'];
        };
        Returns: string;
      };
      create_organisation_with_owner: {
        Args: {
          organisation_name: string;
          organisation_type?: Database['public']['Enums']['organisation_type'];
          owner_full_name?: string;
        };
        Returns: string;
      };
      create_statement: {
        Args: {
          period_ends_on: string;
          period_starts_on: string;
          source_statement_id?: string;
          target_landlord_id: string;
          target_organisation_id: string;
        };
        Returns: string;
      };
      decide_maintenance_approval: {
        Args: { p_approval_id: string; p_approved: boolean; p_comment?: string };
        Returns: undefined;
      };
      finalise_usage_reading: {
        Args: { target_reading_id: string };
        Returns: {
          created_at: string;
          finalised_at: string | null;
          id: string;
          messages: number | null;
          organisation_id: string;
          period_end: string;
          period_start: string;
          plan_id: string;
          properties: number | null;
          property_limit: number | null;
          status: Database['public']['Enums']['usage_reading_status'];
          storage_mb: number | null;
          taken_at: string;
          unit_limit: number | null;
          unit_overage_kobo: number | null;
          units: number | null;
          updated_at: string | null;
          user_limit: number | null;
          users: number | null;
        };
        SetofOptions: {
          from: '*';
          to: 'usage_readings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      generate_document_expiry_tasks: {
        Args: { p_days_ahead?: number; p_organisation_id: string };
        Returns: number;
      };
      generate_reminder_tasks: {
        Args: {
          p_lease_days_ahead?: number;
          p_organisation_id: string;
          p_rent_days_ahead?: number;
        };
        Returns: number;
      };
      generate_subscription_invoice: {
        Args: { p_organisation_id: string; p_period_end: string; p_period_start: string };
        Returns: string;
      };
      issue_statement: { Args: { target_statement_id: string }; Returns: undefined };
      plan_entitlements: {
        Args: Record<PropertyKey, never>;
        Returns: {
          extra_user_kobo: number;
          features: string[];
          included_messages: number;
          organisation_id: string;
          plan_id: string;
          plan_name: string;
          properties_used: number;
          properties_verdict: string;
          property_limit: number;
          storage_mb: number;
          tier: Database['public']['Enums']['plan_tier'];
          unit_limit: number;
          unit_overage_kobo: number;
          units_used: number;
          units_verdict: string;
          user_limit: number;
          users_used: number;
          users_verdict: string;
        }[];
      };
      record_document_access: {
        Args: {
          entity_id: string;
          entity_type: string;
          object_bucket: string;
          object_path: string;
          target_organisation_id: string;
        };
        Returns: undefined;
      };
      record_due_usage_readings: {
        Args: Record<PropertyKey, never>;
        Returns: {
          finalised: number;
          taken: number;
        }[];
      };
      record_invoice_payment: {
        Args: {
          p_amount_kobo: number;
          p_invoice_id: string;
          p_method: string;
          p_paid_on: string;
          p_reference: string;
        };
        Returns: undefined;
      };
      record_maintenance_cost: {
        Args: {
          p_amount_kobo: number;
          p_description: string;
          p_invoice_path?: string;
          p_no_cost?: boolean;
          p_payer: Database['public']['Enums']['maintenance_payer'];
          p_reason: string;
          p_request_id: string;
        };
        Returns: string;
      };
      record_message_result: {
        Args: {
          p_channel: Database['public']['Enums']['message_channel'];
          p_cost_kobo?: number;
          p_error?: string;
          p_message_id: string;
          p_provider?: string;
          p_provider_message_id?: string;
          p_status: Database['public']['Enums']['message_status'];
        };
        Returns: undefined;
      };
      record_payment: {
        Args: {
          explicit_allocations?: Json;
          payment_amount_kobo: number;
          payment_branch_id?: string;
          payment_client_mutation_id?: string;
          payment_method: Database['public']['Enums']['payment_method'];
          payment_paid_on?: string;
          payment_reference?: string;
          payment_tenant_id?: string;
          target_lease_id: string;
          target_organisation_id: string;
        };
        Returns: {
          payment_id: string;
          receipt_id: string;
          receipt_number: string;
        }[];
      };
      record_remittance: {
        Args: {
          remittance_amount_kobo: number;
          remittance_method: Database['public']['Enums']['payment_method'];
          remittance_paid_on: string;
          remittance_reference?: string;
          target_landlord_id: string;
          target_organisation_id: string;
        };
        Returns: string;
      };
      renew_lease: {
        Args: {
          carry_deposit?: boolean;
          new_ends_on: string;
          new_rent_kobo?: number;
          source_lease_id: string;
        };
        Returns: string;
      };
      reopen_maintenance_request: {
        Args: { p_reason: string; p_request_id: string };
        Returns: undefined;
      };
      reverse_payment: { Args: { reason: string; target_payment_id: string }; Returns: string };
      review_statement: { Args: { target_statement_id: string }; Returns: undefined };
      take_usage_reading: {
        Args: { period_end: string; period_start: string; target_organisation_id: string };
        Returns: string;
      };
      transition_maintenance_request: {
        Args: {
          p_note?: string;
          p_request_id: string;
          p_status: Database['public']['Enums']['maintenance_status'];
        };
        Returns: undefined;
      };
      usage_warnings: {
        Args: Record<PropertyKey, never>;
        Returns: {
          allowed: number;
          band: string;
          metric: string;
          organisation_id: string;
          overage_kobo: number;
          percentage: number;
          used: number;
        }[];
      };
    };
    Enums: {
      app_role:
        | 'owner'
        | 'admin'
        | 'property_manager'
        | 'letting_agent'
        | 'caretaker'
        | 'maintenance_coordinator'
        | 'accountant'
        | 'screening_reviewer'
        | 'landlord'
        | 'tenant';
      assignment_scope: 'organisation' | 'branch' | 'property' | 'landlord';
      billing_invoice_line_kind: 'subscription' | 'unit_overage' | 'adjustment';
      billing_invoice_status: 'draft' | 'open' | 'paid' | 'void';
      billing_period: 'monthly' | 'annual';
      charge_frequency: 'one_off' | 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
      charge_kind: 'rent' | 'service_charge' | 'utility' | 'agreed_fee' | 'repair';
      charge_status: 'open' | 'cancelled';
      commission_basis: 'on_receipt' | 'on_invoice';
      commission_type: 'percentage' | 'fixed';
      contact_channel: 'phone' | 'sms' | 'whatsapp' | 'email';
      deduction_category:
        | 'commission'
        | 'maintenance'
        | 'service_charge'
        | 'utilities'
        | 'statutory_fee'
        | 'agency_expense'
        | 'other';
      deposit_custodian: 'agency' | 'landlord';
      deposit_status:
        'expected' | 'held' | 'partially_refunded' | 'refunded' | 'forfeited' | 'transferred';
      document_type:
        | 'lease_agreement'
        | 'tenancy_agreement'
        | 'identification'
        | 'proof_of_ownership'
        | 'inspection_report'
        | 'insurance'
        | 'receipt'
        | 'statement'
        | 'notice'
        | 'photo'
        | 'other';
      handover_kind: 'move_in' | 'move_out';
      import_kind: 'properties_units' | 'landlords' | 'tenants_leases' | 'opening_balances';
      import_row_status: 'pending' | 'valid' | 'invalid' | 'applied';
      import_status: 'draft' | 'validated' | 'applied' | 'rolled_back' | 'failed';
      lease_party_role: 'tenant' | 'co_tenant' | 'guarantor';
      lease_status: 'draft' | 'active' | 'expired' | 'terminated' | 'renewed';
      ledger_entry_kind:
        | 'rent_collected'
        | 'commission'
        | 'remittance'
        | 'adjustment'
        | 'opening_balance'
        | 'maintenance_cost';
      ledger_funds_class: 'client_funds' | 'agency_income';
      maintenance_approval_status: 'pending' | 'approved' | 'rejected';
      maintenance_category:
        | 'plumbing'
        | 'electrical'
        | 'structural'
        | 'appliance'
        | 'hvac'
        | 'pest'
        | 'cleaning'
        | 'security'
        | 'other';
      maintenance_payer: 'landlord' | 'tenant' | 'agency' | 'service_charge' | 'other';
      maintenance_priority: 'low' | 'normal' | 'high' | 'urgent';
      maintenance_status:
        | 'submitted'
        | 'acknowledged'
        | 'assigned'
        | 'in_progress'
        | 'on_hold'
        | 'awaiting_approval'
        | 'completed'
        | 'rejected'
        | 'closed';
      maintenance_submitted_by: 'staff' | 'tenant';
      maintenance_urgency: 'low' | 'normal' | 'high' | 'emergency';
      membership_status: 'invited' | 'active' | 'suspended';
      message_channel: 'whatsapp' | 'sms' | 'email';
      message_purpose: 'operational' | 'marketing';
      message_status: 'queued' | 'sent' | 'delivered' | 'failed' | 'skipped';
      message_template_status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
      organisation_type: 'agency' | 'individual_landlord';
      payment_method: 'cash' | 'bank_transfer' | 'pos' | 'cheque' | 'mobile_money' | 'other';
      payment_status: 'recorded' | 'confirmed' | 'reversed';
      plan_tier: 'free' | 'landlord' | 'agent' | 'growth' | 'enterprise';
      property_type: 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'land';
      receipt_status: 'issued' | 'void' | 'reversed';
      remittance_schedule:
        'on_receipt' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';
      rent_frequency: 'annual' | 'half_yearly' | 'quarterly' | 'monthly' | 'irregular';
      statement_status: 'draft' | 'reviewed' | 'issued';
      subscription_change_kind: 'upgrade' | 'downgrade';
      subscription_status: 'trialing' | 'active' | 'past_due' | 'grace' | 'suspended' | 'cancelled';
      task_priority: 'low' | 'normal' | 'high' | 'urgent';
      task_status: 'open' | 'done' | 'cancelled';
      tenant_contact_kind: 'next_of_kin' | 'employer' | 'business' | 'emergency' | 'referee';
      tenant_kind: 'individual' | 'organisation';
      unit_status: 'vacant' | 'occupied' | 'reserved' | 'under_maintenance' | 'inactive';
      unit_type:
        | 'flat'
        | 'self_contained'
        | 'room'
        | 'duplex'
        | 'bungalow'
        | 'shop'
        | 'office'
        | 'warehouse'
        | 'other';
      usage_reading_status: 'provisional' | 'final';
      vendor_status: 'active' | 'inactive';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: [
        'owner',
        'admin',
        'property_manager',
        'letting_agent',
        'caretaker',
        'maintenance_coordinator',
        'accountant',
        'screening_reviewer',
        'landlord',
        'tenant',
      ],
      assignment_scope: ['organisation', 'branch', 'property', 'landlord'],
      billing_invoice_line_kind: ['subscription', 'unit_overage', 'adjustment'],
      billing_invoice_status: ['draft', 'open', 'paid', 'void'],
      billing_period: ['monthly', 'annual'],
      charge_frequency: ['one_off', 'monthly', 'quarterly', 'half_yearly', 'annual'],
      charge_kind: ['rent', 'service_charge', 'utility', 'agreed_fee', 'repair'],
      charge_status: ['open', 'cancelled'],
      commission_basis: ['on_receipt', 'on_invoice'],
      commission_type: ['percentage', 'fixed'],
      contact_channel: ['phone', 'sms', 'whatsapp', 'email'],
      deduction_category: [
        'commission',
        'maintenance',
        'service_charge',
        'utilities',
        'statutory_fee',
        'agency_expense',
        'other',
      ],
      deposit_custodian: ['agency', 'landlord'],
      deposit_status: [
        'expected',
        'held',
        'partially_refunded',
        'refunded',
        'forfeited',
        'transferred',
      ],
      document_type: [
        'lease_agreement',
        'tenancy_agreement',
        'identification',
        'proof_of_ownership',
        'inspection_report',
        'insurance',
        'receipt',
        'statement',
        'notice',
        'photo',
        'other',
      ],
      handover_kind: ['move_in', 'move_out'],
      import_kind: ['properties_units', 'landlords', 'tenants_leases', 'opening_balances'],
      import_row_status: ['pending', 'valid', 'invalid', 'applied'],
      import_status: ['draft', 'validated', 'applied', 'rolled_back', 'failed'],
      lease_party_role: ['tenant', 'co_tenant', 'guarantor'],
      lease_status: ['draft', 'active', 'expired', 'terminated', 'renewed'],
      ledger_entry_kind: [
        'rent_collected',
        'commission',
        'remittance',
        'adjustment',
        'opening_balance',
        'maintenance_cost',
      ],
      ledger_funds_class: ['client_funds', 'agency_income'],
      maintenance_approval_status: ['pending', 'approved', 'rejected'],
      maintenance_category: [
        'plumbing',
        'electrical',
        'structural',
        'appliance',
        'hvac',
        'pest',
        'cleaning',
        'security',
        'other',
      ],
      maintenance_payer: ['landlord', 'tenant', 'agency', 'service_charge', 'other'],
      maintenance_priority: ['low', 'normal', 'high', 'urgent'],
      maintenance_status: [
        'submitted',
        'acknowledged',
        'assigned',
        'in_progress',
        'on_hold',
        'awaiting_approval',
        'completed',
        'rejected',
        'closed',
      ],
      maintenance_submitted_by: ['staff', 'tenant'],
      maintenance_urgency: ['low', 'normal', 'high', 'emergency'],
      membership_status: ['invited', 'active', 'suspended'],
      message_channel: ['whatsapp', 'sms', 'email'],
      message_purpose: ['operational', 'marketing'],
      message_status: ['queued', 'sent', 'delivered', 'failed', 'skipped'],
      message_template_status: ['draft', 'pending_approval', 'approved', 'rejected'],
      organisation_type: ['agency', 'individual_landlord'],
      payment_method: ['cash', 'bank_transfer', 'pos', 'cheque', 'mobile_money', 'other'],
      payment_status: ['recorded', 'confirmed', 'reversed'],
      plan_tier: ['free', 'landlord', 'agent', 'growth', 'enterprise'],
      property_type: ['residential', 'commercial', 'mixed_use', 'estate', 'land'],
      receipt_status: ['issued', 'void', 'reversed'],
      remittance_schedule: [
        'on_receipt',
        'weekly',
        'fortnightly',
        'monthly',
        'quarterly',
        'annually',
      ],
      rent_frequency: ['annual', 'half_yearly', 'quarterly', 'monthly', 'irregular'],
      statement_status: ['draft', 'reviewed', 'issued'],
      subscription_change_kind: ['upgrade', 'downgrade'],
      subscription_status: ['trialing', 'active', 'past_due', 'grace', 'suspended', 'cancelled'],
      task_priority: ['low', 'normal', 'high', 'urgent'],
      task_status: ['open', 'done', 'cancelled'],
      tenant_contact_kind: ['next_of_kin', 'employer', 'business', 'emergency', 'referee'],
      tenant_kind: ['individual', 'organisation'],
      unit_status: ['vacant', 'occupied', 'reserved', 'under_maintenance', 'inactive'],
      unit_type: [
        'flat',
        'self_contained',
        'room',
        'duplex',
        'bungalow',
        'shop',
        'office',
        'warehouse',
        'other',
      ],
      usage_reading_status: ['provisional', 'final'],
      vendor_status: ['active', 'inactive'],
    },
  },
  storage: {
    Enums: {},
  },
} as const;
