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
      organisations: {
        Row: {
          country_code: string;
          created_at: string;
          id: string;
          name: string;
          timezone: string;
          type: Database['public']['Enums']['organisation_type'];
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          country_code?: string;
          created_at?: string;
          id?: string;
          name: string;
          timezone?: string;
          type: Database['public']['Enums']['organisation_type'];
          updated_at?: string | null;
        };
        Update: {
          country_code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          timezone?: string;
          type?: Database['public']['Enums']['organisation_type'];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          billing_period: Database['public']['Enums']['billing_period'];
          created_at: string;
          description: string | null;
          id: string;
          is_public: boolean;
          name: string;
          price_kobo: number;
          sort_order: number;
          trial_days: number;
          unit_limit: number | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          billing_period: Database['public']['Enums']['billing_period'];
          created_at?: string;
          description?: string | null;
          id: string;
          is_public?: boolean;
          name: string;
          price_kobo: number;
          sort_order?: number;
          trial_days?: number;
          unit_limit?: number | null;
          updated_at?: string | null;
        };
        Update: {
          billing_period?: Database['public']['Enums']['billing_period'];
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          name?: string;
          price_kobo?: number;
          sort_order?: number;
          trial_days?: number;
          unit_limit?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
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
    };
    Views: {
      pg_all_foreign_keys: {
        Row: {
          fk_columns: unknown[] | null;
          fk_constraint_name: unknown;
          fk_schema_name: unknown;
          fk_table_name: unknown;
          fk_table_oid: unknown;
          is_deferrable: boolean | null;
          is_deferred: boolean | null;
          match_type: string | null;
          on_delete: string | null;
          on_update: string | null;
          pk_columns: unknown[] | null;
          pk_constraint_name: unknown;
          pk_index_name: unknown;
          pk_schema_name: unknown;
          pk_table_name: unknown;
          pk_table_oid: unknown;
        };
        ComputedFields: never;
        Relationships: [];
      };
      tap_funky: {
        Row: {
          args: string | null;
          is_definer: boolean | null;
          is_strict: boolean | null;
          is_visible: boolean | null;
          kind: unknown;
          langoid: unknown;
          name: unknown;
          oid: unknown;
          owner: unknown;
          returns: string | null;
          returns_set: boolean | null;
          schema: unknown;
          volatility: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      _cleanup: { Args: Record<PropertyKey, never>; Returns: boolean };
      _contract_on: { Args: { '': string }; Returns: unknown };
      _currtest: { Args: Record<PropertyKey, never>; Returns: number };
      _db_privs: { Args: Record<PropertyKey, never>; Returns: unknown[] };
      _extensions: { Args: Record<PropertyKey, never>; Returns: unknown[] };
      _get: { Args: { '': string }; Returns: number };
      _get_latest: { Args: { '': string }; Returns: number[] };
      _get_note: { Args: { '': string }; Returns: string };
      _is_verbose: { Args: Record<PropertyKey, never>; Returns: boolean };
      _prokind: { Args: { p_oid: unknown }; Returns: unknown };
      _query: { Args: { '': string }; Returns: string };
      _refine_vol: { Args: { '': string }; Returns: string };
      _retval: { Args: { '': string }; Returns: string };
      _table_privs: { Args: Record<PropertyKey, never>; Returns: unknown[] };
      _temptypes: { Args: { '': string }; Returns: string };
      _todo: { Args: Record<PropertyKey, never>; Returns: string };
      change_membership_role: {
        Args: {
          change_reason: string;
          new_role: Database['public']['Enums']['app_role'];
          target_membership_id: string;
        };
        Returns: undefined;
      };
      col_is_null:
        | {
            Args: {
              column_name: unknown;
              description?: string;
              schema_name: unknown;
              table_name: unknown;
            };
            Returns: string;
          }
        | {
            Args: { column_name: unknown; description?: string; table_name: unknown };
            Returns: string;
          };
      col_not_null:
        | {
            Args: {
              column_name: unknown;
              description?: string;
              schema_name: unknown;
              table_name: unknown;
            };
            Returns: string;
          }
        | {
            Args: { column_name: unknown; description?: string; table_name: unknown };
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
      diag:
        | {
            Args: { msg: unknown };
            Returns: {
              error: true;
            } & 'Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved';
          }
        | {
            Args: { msg: string };
            Returns: {
              error: true;
            } & 'Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved';
          };
      diag_test_name: { Args: { '': string }; Returns: string };
      do_tap:
        | { Args: Record<PropertyKey, never>; Returns: string[] }
        | { Args: { '': string }; Returns: string[] };
      fail:
        | { Args: Record<PropertyKey, never>; Returns: string }
        | { Args: { '': string }; Returns: string };
      findfuncs: { Args: { '': string }; Returns: string[] };
      finish: { Args: { exception_on_failure?: boolean }; Returns: string[] };
      format_type_string: { Args: { '': string }; Returns: string };
      has_unique: { Args: { '': string }; Returns: string };
      in_todo: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_empty: { Args: { '': string }; Returns: string };
      isnt_empty: { Args: { '': string }; Returns: string };
      lives_ok: { Args: { '': string }; Returns: string };
      no_plan: { Args: Record<PropertyKey, never>; Returns: boolean[] };
      num_failed: { Args: Record<PropertyKey, never>; Returns: number };
      os_name: { Args: Record<PropertyKey, never>; Returns: string };
      pass:
        | { Args: Record<PropertyKey, never>; Returns: string }
        | { Args: { '': string }; Returns: string };
      pg_version: { Args: Record<PropertyKey, never>; Returns: string };
      pg_version_num: { Args: Record<PropertyKey, never>; Returns: number };
      pgtap_version: { Args: Record<PropertyKey, never>; Returns: number };
      runtests:
        | { Args: Record<PropertyKey, never>; Returns: string[] }
        | { Args: { '': string }; Returns: string[] };
      skip:
        | { Args: { '': string }; Returns: string }
        | { Args: { how_many: number; why: string }; Returns: string };
      throws_ok: { Args: { '': string }; Returns: string };
      todo:
        | { Args: { how_many: number }; Returns: boolean[] }
        | { Args: { how_many: number; why: string }; Returns: boolean[] }
        | { Args: { why: string }; Returns: boolean[] }
        | { Args: { how_many: number; why: string }; Returns: boolean[] };
      todo_end: { Args: Record<PropertyKey, never>; Returns: boolean[] };
      todo_start:
        | { Args: Record<PropertyKey, never>; Returns: boolean[] }
        | { Args: { '': string }; Returns: boolean[] };
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
      billing_period: 'monthly' | 'annual';
      membership_status: 'invited' | 'active' | 'suspended';
      organisation_type: 'agency' | 'individual_landlord';
      subscription_status: 'trialing' | 'active' | 'past_due' | 'grace' | 'suspended' | 'cancelled';
    };
    CompositeTypes: {
      _time_trial_type: {
        a_time: number | null;
      };
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
      billing_period: ['monthly', 'annual'],
      membership_status: ['invited', 'active', 'suspended'],
      organisation_type: ['agency', 'individual_landlord'],
      subscription_status: ['trialing', 'active', 'past_due', 'grace', 'suspended', 'cancelled'],
    },
  },
  storage: {
    Enums: {},
  },
} as const;
