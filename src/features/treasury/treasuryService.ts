import { z } from "zod";
import { loadAccountingContext, type AccountingContext } from "../accounting/accountingService";
import { supabase } from "../../lib/supabase";
import type { Json, TreasuryAccountType, TreasuryTransactionDirection } from "../../lib/database.types";

export type TreasuryAccount = {
  id: string;
  name: string;
  account_type: TreasuryAccountType;
  institution_name: string | null;
  currency: string;
  opening_balance: number;
  current_balance: number;
};

export type TreasuryTransaction = {
  id: string;
  transaction_date: string;
  direction: TreasuryTransactionDirection;
  label: string;
  reference: string | null;
  amount: number;
  account_name: string;
};

export type TreasurySnapshot = {
  accounts: TreasuryAccount[];
  transactions: TreasuryTransaction[];
};

export type TreasuryContext = AccountingContext & {
  snapshot: TreasurySnapshot;
};

export const treasuryAccountSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid(),
  accountType: z.enum(["bank", "cash", "mobile_money"]),
  name: z.string().min(2, "Nom du compte requis"),
  institutionName: z.string().optional(),
  accountNumber: z.string().optional(),
  openingBalance: z.number(),
});

export const treasuryTransactionSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid(),
  fiscalYearId: z.string().uuid(),
  treasuryAccountId: z.string().uuid("Compte de tresorerie requis"),
  direction: z.enum(["inflow", "outflow"]),
  transactionDate: z.string().min(10, "Date requise"),
  label: z.string().min(2, "Libelle requis"),
  amount: z.number().positive("Montant requis"),
  reference: z.string().optional(),
});

export type TreasuryAccountFormData = z.infer<typeof treasuryAccountSchema>;
export type TreasuryTransactionFormData = z.infer<typeof treasuryTransactionSchema>;

const emptySnapshot: TreasurySnapshot = {
  accounts: [],
  transactions: [],
};

export async function loadTreasuryContext(): Promise<TreasuryContext> {
  const accountingContext = await loadAccountingContext();

  if (!supabase || !accountingContext.company || !accountingContext.fiscalYear) {
    return {
      ...accountingContext,
      snapshot: emptySnapshot,
    };
  }

  const { data, error } = await supabase.rpc("get_treasury_snapshot", {
    p_tenant_id: accountingContext.company.tenant_id,
    p_company_id: accountingContext.company.id,
    p_fiscal_year_id: accountingContext.fiscalYear.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...accountingContext,
    snapshot: parseTreasurySnapshot(data),
  };
}

export async function createTreasuryAccount(values: TreasuryAccountFormData) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configure.");
  }

  const payload = treasuryAccountSchema.parse(values);

  const { error } = await supabase.from("treasury_accounts").insert({
    tenant_id: payload.tenantId,
    company_id: payload.companyId,
    account_type: payload.accountType,
    name: payload.name.trim(),
    institution_name: nullable(payload.institutionName),
    account_number: nullable(payload.accountNumber),
    opening_balance: payload.openingBalance,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createTreasuryTransaction(values: TreasuryTransactionFormData) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configure.");
  }

  const payload = treasuryTransactionSchema.parse(values);

  const { data, error } = await supabase.rpc("create_treasury_transaction", {
    tenant_id: payload.tenantId,
    company_id: payload.companyId,
    fiscal_year_id: payload.fiscalYearId,
    treasury_account_id: payload.treasuryAccountId,
    direction: payload.direction,
    transaction_date: payload.transactionDate,
    label: payload.label.trim(),
    amount: payload.amount,
    reference: nullable(payload.reference),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function nullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseTreasurySnapshot(value: Json): TreasurySnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptySnapshot;
  }

  const record = value as Record<string, Json>;

  return {
    accounts: Array.isArray(record.accounts)
      ? record.accounts.map(parseAccount).filter((account): account is TreasuryAccount => Boolean(account))
      : [],
    transactions: Array.isArray(record.transactions)
      ? record.transactions.map(parseTransaction).filter((transaction): transaction is TreasuryTransaction => Boolean(transaction))
      : [],
  };
}

function parseAccount(value: Json): TreasuryAccount | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, Json>;

  if (
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.account_type !== "string" ||
    typeof record.currency !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    account_type: record.account_type as TreasuryAccountType,
    institution_name: typeof record.institution_name === "string" ? record.institution_name : null,
    currency: record.currency,
    opening_balance: typeof record.opening_balance === "number" ? record.opening_balance : 0,
    current_balance: typeof record.current_balance === "number" ? record.current_balance : 0,
  };
}

function parseTransaction(value: Json): TreasuryTransaction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, Json>;

  if (
    typeof record.id !== "string" ||
    typeof record.transaction_date !== "string" ||
    typeof record.direction !== "string" ||
    typeof record.label !== "string" ||
    typeof record.account_name !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    transaction_date: record.transaction_date,
    direction: record.direction as TreasuryTransactionDirection,
    label: record.label,
    reference: typeof record.reference === "string" ? record.reference : null,
    amount: typeof record.amount === "number" ? record.amount : 0,
    account_name: record.account_name,
  };
}
