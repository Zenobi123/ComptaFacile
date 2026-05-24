import { z } from "zod";
import { supabase } from "../../lib/supabase";
import type { JournalEntryStatus, Json } from "../../lib/database.types";

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

export type SnapshotEntryLine = {
  line_number: number;
  account_number: string;
  account_label: string;
  label: string | null;
  debit_amount: number;
  credit_amount: number;
};

export type SnapshotEntry = {
  id: string;
  entry_date: string;
  label: string;
  reference: string | null;
  status: JournalEntryStatus;
  journal_code: string;
  journal_label: string;
  lines: SnapshotEntryLine[];
};

export type BalanceRow = {
  account_id: string;
  account_number: string;
  label: string;
  debit_total: number;
  credit_total: number;
  balance: number;
};

export type AccountingSnapshot = {
  entries: SnapshotEntry[];
  balance: BalanceRow[];
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

export async function loadAccountingSnapshot(
  tenantId: string,
  companyId: string,
  fiscalYearId: string,
): Promise<AccountingSnapshot> {
  if (!supabase) {
    return { entries: [], balance: [] };
  }

  const { data, error } = await supabase.rpc("get_accounting_snapshot", {
    p_tenant_id: tenantId,
    p_company_id: companyId,
    p_fiscal_year_id: fiscalYearId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return parseAccountingSnapshot(data);
}

function parseAccountingSnapshot(value: Json): AccountingSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { entries: [], balance: [] };
  }

  const record = value as Record<string, Json>;

  return {
    entries: Array.isArray(record.entries)
      ? record.entries.map(parseSnapshotEntry).filter((entry): entry is SnapshotEntry => Boolean(entry))
      : [],
    balance: Array.isArray(record.balance)
      ? record.balance.map(parseBalanceRow).filter((row): row is BalanceRow => Boolean(row))
      : [],
  };
}

function parseSnapshotEntry(value: Json): SnapshotEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, Json>;

  if (
    typeof record.id !== "string" ||
    typeof record.entry_date !== "string" ||
    typeof record.label !== "string" ||
    typeof record.status !== "string" ||
    typeof record.journal_code !== "string" ||
    typeof record.journal_label !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    entry_date: record.entry_date,
    label: record.label,
    reference: typeof record.reference === "string" ? record.reference : null,
    status: record.status as JournalEntryStatus,
    journal_code: record.journal_code,
    journal_label: record.journal_label,
    lines: Array.isArray(record.lines)
      ? record.lines.map(parseSnapshotEntryLine).filter((line): line is SnapshotEntryLine => Boolean(line))
      : [],
  };
}

function parseSnapshotEntryLine(value: Json): SnapshotEntryLine | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, Json>;

  if (
    typeof record.line_number !== "number" ||
    typeof record.account_number !== "string" ||
    typeof record.account_label !== "string"
  ) {
    return null;
  }

  return {
    line_number: record.line_number,
    account_number: record.account_number,
    account_label: record.account_label,
    label: typeof record.label === "string" ? record.label : null,
    debit_amount: typeof record.debit_amount === "number" ? record.debit_amount : 0,
    credit_amount: typeof record.credit_amount === "number" ? record.credit_amount : 0,
  };
}

function parseBalanceRow(value: Json): BalanceRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, Json>;

  if (
    typeof record.account_id !== "string" ||
    typeof record.account_number !== "string" ||
    typeof record.label !== "string"
  ) {
    return null;
  }

  return {
    account_id: record.account_id,
    account_number: record.account_number,
    label: record.label,
    debit_total: typeof record.debit_total === "number" ? record.debit_total : 0,
    credit_total: typeof record.credit_total === "number" ? record.credit_total : 0,
    balance: typeof record.balance === "number" ? record.balance : 0,
  };
}
