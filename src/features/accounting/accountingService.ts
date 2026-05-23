import { z } from "zod";
import { supabase } from "../../lib/supabase";
import type { JournalEntryStatus } from "../../lib/database.types";

export type AccountingCompany = {
  id: string;
  tenant_id: string;
  legal_name: string;
};

export type AccountingFiscalYear = {
  id: string;
  label: string;
  status: string;
};

export type AccountingPeriod = {
  id: string;
  label: string;
  status: string;
};

export type AccountingJournal = {
  id: string;
  code: string;
  label: string;
};

export type AccountingAccount = {
  id: string;
  account_number: string;
  label: string;
  is_active: boolean;
};

export type AccountingContext = {
  company: AccountingCompany | null;
  fiscalYear: AccountingFiscalYear | null;
  periods: AccountingPeriod[];
  journals: AccountingJournal[];
  accounts: AccountingAccount[];
};

export const accountSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid(),
  accountNumber: z.string().regex(/^[1-8][0-9A-Z.]{1,15}$/, "Numero OHADA invalide"),
  label: z.string().min(2, "Libelle requis"),
  classCode: z.string().regex(/^[1-8]$/),
});

export const journalEntrySchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid(),
  fiscalYearId: z.string().uuid(),
  accountingPeriodId: z.string().uuid(),
  journalId: z.string().uuid(),
  entryDate: z.string().min(10),
  label: z.string().min(2, "Libelle requis"),
  reference: z.string().optional(),
  targetStatus: z.enum(["draft", "pending_review", "validated"]),
  lines: z
    .array(
      z.object({
        accountId: z.string().uuid("Compte requis"),
        label: z.string().optional(),
        debitAmount: z.number().min(0),
        creditAmount: z.number().min(0),
      }),
    )
    .min(2, "Au moins deux lignes sont requises"),
});

export type AccountFormData = z.infer<typeof accountSchema>;
export type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

export async function loadAccountingContext(): Promise<AccountingContext> {
  if (!supabase) {
    return {
      company: null,
      fiscalYear: null,
      periods: [],
      journals: [],
      accounts: [],
    };
  }

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, tenant_id, legal_name")
    .order("created_at", { ascending: true })
    .limit(1);

  if (companiesError) {
    throw new Error(companiesError.message);
  }

  const company = companies[0] ?? null;

  if (!company) {
    return {
      company: null,
      fiscalYear: null,
      periods: [],
      journals: [],
      accounts: [],
    };
  }

  const { data: fiscalYears, error: fiscalYearsError } = await supabase
    .from("fiscal_years")
    .select("id, label, status")
    .eq("tenant_id", company.tenant_id)
    .eq("company_id", company.id)
    .order("starts_on", { ascending: false })
    .limit(1);

  if (fiscalYearsError) {
    throw new Error(fiscalYearsError.message);
  }

  const fiscalYear = fiscalYears[0] ?? null;

  const [periodsResult, journalsResult, accountsResult] = await Promise.all([
    fiscalYear
      ? supabase
          .from("accounting_periods")
          .select("id, label, status")
          .eq("tenant_id", company.tenant_id)
          .eq("company_id", company.id)
          .eq("fiscal_year_id", fiscalYear.id)
          .order("starts_on", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("journals")
      .select("id, code, label")
      .eq("tenant_id", company.tenant_id)
      .eq("company_id", company.id)
      .eq("is_active", true)
      .order("code", { ascending: true }),
    supabase
      .from("company_accounts")
      .select("id, account_number, label, is_active")
      .eq("tenant_id", company.tenant_id)
      .eq("company_id", company.id)
      .eq("is_active", true)
      .order("account_number", { ascending: true }),
  ]);

  if (periodsResult.error) {
    throw new Error(periodsResult.error.message);
  }

  if (journalsResult.error) {
    throw new Error(journalsResult.error.message);
  }

  if (accountsResult.error) {
    throw new Error(accountsResult.error.message);
  }

  return {
    company,
    fiscalYear,
    periods: periodsResult.data,
    journals: journalsResult.data,
    accounts: accountsResult.data,
  };
}

export async function createCompanyAccount(values: AccountFormData) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configure.");
  }

  const payload = accountSchema.parse(values);

  const { error } = await supabase.from("company_accounts").insert({
    tenant_id: payload.tenantId,
    company_id: payload.companyId,
    account_number: payload.accountNumber.trim(),
    label: payload.label.trim(),
    class_code: payload.classCode,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createJournalEntry(values: JournalEntryFormData) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configure.");
  }

  const payload = journalEntrySchema.parse(values);
  const debitTotal = payload.lines.reduce((sum, line) => sum + line.debitAmount, 0);
  const creditTotal = payload.lines.reduce((sum, line) => sum + line.creditAmount, 0);

  if (debitTotal !== creditTotal) {
    throw new Error("L'ecriture doit etre equilibree avant envoi.");
  }

  const { data, error } = await supabase.rpc("create_journal_entry", {
    tenant_id: payload.tenantId,
    company_id: payload.companyId,
    fiscal_year_id: payload.fiscalYearId,
    accounting_period_id: payload.accountingPeriodId,
    journal_id: payload.journalId,
    entry_date: payload.entryDate,
    label: payload.label.trim(),
    reference: payload.reference?.trim() || null,
    target_status: payload.targetStatus as JournalEntryStatus,
    lines: payload.lines.map((line) => ({
      account_id: line.accountId,
      label: line.label?.trim() || null,
      debit_amount: line.debitAmount,
      credit_amount: line.creditAmount,
    })),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
