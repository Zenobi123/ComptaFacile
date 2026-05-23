export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TenantType = "company" | "firm" | "association";
export type MemberRole =
  | "super_admin_saas"
  | "admin_saas"
  | "admin_entreprise"
  | "chef_comptable"
  | "comptable"
  | "caissier"
  | "fiscaliste"
  | "dirigeant"
  | "auditeur"
  | "collaborateur_cabinet";
export type MemberStatus = "invited" | "active" | "suspended" | "disabled";
export type FiscalYearStatus = "draft" | "open" | "closed" | "archived";
export type AccountingPeriodStatus = "open" | "in_review" | "locked" | "closed";
export type JournalEntryStatus =
  | "draft"
  | "pending_review"
  | "validated"
  | "rejected"
  | "reversed";
export type ThirdPartyType = "customer" | "supplier" | "administration" | "employee" | "partner";
export type SalesInvoiceStatus = "draft" | "issued" | "paid" | "cancelled";

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type TimestampColumns = {
  created_at: string;
  updated_at: string;
};

type AuditColumns = TimestampColumns & {
  created_by: string | null;
  updated_by: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        TimestampColumns & {
          id: string;
          email: string;
          full_name: string | null;
          is_platform_admin: boolean;
        },
        {
          id: string;
          email: string;
          full_name?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      tenants: Table<
        AuditColumns & {
          id: string;
          name: string;
          tenant_type: TenantType;
          status: string;
        },
        {
          id?: string;
          name: string;
          tenant_type?: TenantType;
          status?: string;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      tenant_memberships: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          user_id: string | null;
          invited_email: string | null;
          role: MemberRole;
          status: MemberStatus;
        },
        {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          invited_email?: string | null;
          role: MemberRole;
          status?: MemberStatus;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      companies: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          legal_name: string;
          trade_name: string | null;
          legal_form: string | null;
          niu: string | null;
          rccm: string | null;
          sector: string | null;
          address: string | null;
          city: string | null;
          tax_center: string | null;
          default_currency: string;
          status: string;
        },
        {
          id?: string;
          tenant_id: string;
          legal_name: string;
          trade_name?: string | null;
          legal_form?: string | null;
          niu?: string | null;
          rccm?: string | null;
          sector?: string | null;
          address?: string | null;
          city?: string | null;
          tax_center?: string | null;
          default_currency?: string;
          status?: string;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      fiscal_years: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          company_id: string;
          label: string;
          starts_on: string;
          ends_on: string;
          status: FiscalYearStatus;
        },
        {
          id?: string;
          tenant_id: string;
          company_id: string;
          label: string;
          starts_on: string;
          ends_on: string;
          status?: FiscalYearStatus;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      accounting_periods: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          company_id: string;
          fiscal_year_id: string;
          label: string;
          starts_on: string;
          ends_on: string;
          status: AccountingPeriodStatus;
          reopened_reason: string | null;
        },
        {
          id?: string;
          tenant_id: string;
          company_id: string;
          fiscal_year_id: string;
          label: string;
          starts_on: string;
          ends_on: string;
          status?: AccountingPeriodStatus;
          reopened_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      company_fiscal_profiles: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          company_id: string;
          fiscal_year_id: string;
          tax_regime: string;
          dsf_type: string | null;
          accounting_system: string;
          vat_enabled: boolean;
          withholding_enabled: boolean;
          stock_enabled: boolean;
          fixed_assets_enabled: boolean;
          payroll_enabled: boolean;
        },
        {
          id?: string;
          tenant_id: string;
          company_id: string;
          fiscal_year_id: string;
          tax_regime: string;
          dsf_type?: string | null;
          accounting_system?: string;
          vat_enabled?: boolean;
          withholding_enabled?: boolean;
          stock_enabled?: boolean;
          fixed_assets_enabled?: boolean;
          payroll_enabled?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      ohada_account_classes: Table<
        {
          class_code: string;
          label: string;
          description: string | null;
          sort_order: number;
        },
        {
          class_code: string;
          label: string;
          description?: string | null;
          sort_order: number;
        }
      >;
      company_accounts: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          company_id: string;
          account_number: string;
          label: string;
          class_code: string;
          parent_account_id: string | null;
          is_active: boolean;
          is_reference: boolean;
          requires_lettering: boolean;
          treasury_kind: string | null;
        },
        {
          id?: string;
          tenant_id: string;
          company_id: string;
          account_number: string;
          label: string;
          class_code: string;
          parent_account_id?: string | null;
          is_active?: boolean;
          is_reference?: boolean;
          requires_lettering?: boolean;
          treasury_kind?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      journal_type_templates: Table<
        {
          code: string;
          label: string;
          sort_order: number;
        },
        {
          code: string;
          label: string;
          sort_order: number;
        }
      >;
      journals: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          company_id: string;
          code: string;
          label: string;
          journal_type: string;
          is_active: boolean;
        },
        {
          id?: string;
          tenant_id: string;
          company_id: string;
          code: string;
          label: string;
          journal_type: string;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      journal_entries: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          company_id: string;
          fiscal_year_id: string;
          accounting_period_id: string;
          journal_id: string;
          entry_number: string | null;
          entry_date: string;
          label: string;
          reference: string | null;
          status: JournalEntryStatus;
          reversal_of_entry_id: string | null;
          validated_at: string | null;
          validated_by: string | null;
        },
        {
          id?: string;
          tenant_id: string;
          company_id: string;
          fiscal_year_id: string;
          accounting_period_id: string;
          journal_id: string;
          entry_number?: string | null;
          entry_date: string;
          label: string;
          reference?: string | null;
          status?: JournalEntryStatus;
          reversal_of_entry_id?: string | null;
          validated_at?: string | null;
          validated_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      journal_entry_lines: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          company_id: string;
          journal_entry_id: string;
          account_id: string;
          line_number: number;
          label: string | null;
          debit_amount: number;
          credit_amount: number;
        },
        {
          id?: string;
          tenant_id: string;
          company_id: string;
          journal_entry_id: string;
          account_id: string;
          line_number: number;
          label?: string | null;
          debit_amount?: number;
          credit_amount?: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      third_parties: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          company_id: string;
          party_type: ThirdPartyType;
          name: string;
          niu: string | null;
          email: string | null;
          phone: string | null;
          city: string | null;
          address: string | null;
          is_active: boolean;
        },
        {
          id?: string;
          tenant_id: string;
          company_id: string;
          party_type: ThirdPartyType;
          name: string;
          niu?: string | null;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          address?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      sales_invoices: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          company_id: string;
          fiscal_year_id: string;
          customer_id: string;
          invoice_number: string;
          invoice_date: string;
          due_date: string | null;
          status: SalesInvoiceStatus;
          currency: string;
          subtotal_amount: number;
          tax_amount: number;
          total_amount: number;
          notes: string | null;
        },
        {
          id?: string;
          tenant_id: string;
          company_id: string;
          fiscal_year_id: string;
          customer_id: string;
          invoice_number: string;
          invoice_date: string;
          due_date?: string | null;
          status?: SalesInvoiceStatus;
          currency?: string;
          subtotal_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          notes?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      sales_invoice_lines: Table<
        AuditColumns & {
          id: string;
          tenant_id: string;
          company_id: string;
          invoice_id: string;
          line_number: number;
          description: string;
          quantity: number;
          unit_price: number;
          tax_rate: number;
          subtotal_amount: number;
          tax_amount: number;
          total_amount: number;
        },
        {
          id?: string;
          tenant_id: string;
          company_id: string;
          invoice_id: string;
          line_number: number;
          description: string;
          quantity?: number;
          unit_price?: number;
          tax_rate?: number;
          subtotal_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      audit_logs: Table<
        {
          id: string;
          tenant_id: string | null;
          company_id: string | null;
          actor_id: string | null;
          action: string;
          entity_table: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        },
        {
          id?: string;
          tenant_id?: string | null;
          company_id?: string | null;
          actor_id?: string | null;
          action: string;
          entity_table: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      has_tenant_role: {
        Args: {
          check_tenant_id: string;
          allowed_roles: MemberRole[];
          check_user_id?: string;
        };
        Returns: boolean;
      };
      create_company_onboarding: {
        Args: {
          tenant_name: string;
          legal_name: string;
          trade_name?: string | null;
          legal_form?: string | null;
          niu?: string | null;
          rccm?: string | null;
          sector?: string | null;
          address?: string | null;
          city?: string | null;
          tax_center?: string | null;
          tax_regime?: string;
          dsf_type?: string;
          accounting_system?: string;
          starts_on?: string;
          ends_on?: string;
          vat_enabled?: boolean;
          withholding_enabled?: boolean;
          stock_enabled?: boolean;
          fixed_assets_enabled?: boolean;
          payroll_enabled?: boolean;
        };
        Returns: {
          tenant_id: string;
          company_id: string;
          fiscal_year_id: string;
        }[];
      };
      create_journal_entry: {
        Args: {
          tenant_id: string;
          company_id: string;
          fiscal_year_id: string;
          accounting_period_id: string;
          journal_id: string;
          entry_date: string;
          label: string;
          reference?: string | null;
          target_status?: JournalEntryStatus;
          lines?: Json;
        };
        Returns: string;
      };
      create_sales_invoice: {
        Args: {
          tenant_id: string;
          company_id: string;
          fiscal_year_id: string;
          customer_id: string;
          invoice_number: string;
          invoice_date: string;
          due_date?: string | null;
          status?: SalesInvoiceStatus;
          notes?: string | null;
          lines?: Json;
        };
        Returns: string;
      };
      get_accounting_snapshot: {
        Args: {
          p_tenant_id: string;
          p_company_id: string;
          p_fiscal_year_id: string;
        };
        Returns: Json;
      };
      get_billing_snapshot: {
        Args: {
          p_tenant_id: string;
          p_company_id: string;
          p_fiscal_year_id: string;
        };
        Returns: Json;
      };
      is_platform_admin: {
        Args: { check_user_id?: string };
        Returns: boolean;
      };
      is_tenant_member: {
        Args: { check_tenant_id: string; check_user_id?: string };
        Returns: boolean;
      };
    };
    Enums: {
      tenant_type: TenantType;
      member_role: MemberRole;
      member_status: MemberStatus;
      fiscal_year_status: FiscalYearStatus;
      accounting_period_status: AccountingPeriodStatus;
      journal_entry_status: JournalEntryStatus;
      third_party_type: ThirdPartyType;
      sales_invoice_status: SalesInvoiceStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
