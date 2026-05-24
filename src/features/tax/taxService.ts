import { z } from "zod";
import { loadAccountingContext, type AccountingContext } from "../accounting/accountingService";
import { supabase } from "../../lib/supabase";
import type { Json, TaxDeclarationStatus } from "../../lib/database.types";

export type TaxDeclaration = {
  id: string;
  tax_type: string;
  period_label: string;
  due_date: string;
  status: TaxDeclarationStatus;
  amount_due: number;
  submitted_at: string | null;
  payment_reference: string | null;
  notes: string | null;
};

export type TaxTotals = {
  planned_count: number;
  submitted_count: number;
  late_count: number;
  amount_due: number;
};

export type TaxSnapshot = {
  declarations: TaxDeclaration[];
  totals: TaxTotals;
};

export type TaxContext = AccountingContext & {
  snapshot: TaxSnapshot;
};

export const taxDeclarationSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid(),
  fiscalYearId: z.string().uuid(),
  taxType: z.string().min(2, "Type d'impot requis"),
  periodLabel: z.string().min(2, "Periode requise"),
  dueDate: z.string().min(10, "Date d'echeance requise"),
  amountDue: z.number().min(0, "Montant invalide"),
  status: z.enum(["planned", "prepared", "submitted", "paid", "late"]),
  notes: z.string().optional(),
});

export type TaxDeclarationFormData = z.infer<typeof taxDeclarationSchema>;

const emptySnapshot: TaxSnapshot = {
  declarations: [],
  totals: {
    planned_count: 0,
    submitted_count: 0,
    late_count: 0,
    amount_due: 0,
  },
};

export async function loadTaxContext(): Promise<TaxContext> {
  const accountingContext = await loadAccountingContext();

  if (!supabase || !accountingContext.company || !accountingContext.fiscalYear) {
    return {
      ...accountingContext,
      snapshot: emptySnapshot,
    };
  }

  const { data, error } = await supabase.rpc("get_tax_snapshot", {
    p_tenant_id: accountingContext.company.tenant_id,
    p_company_id: accountingContext.company.id,
    p_fiscal_year_id: accountingContext.fiscalYear.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...accountingContext,
    snapshot: parseTaxSnapshot(data),
  };
}

export async function createTaxDeclaration(values: TaxDeclarationFormData) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configure.");
  }

  const payload = taxDeclarationSchema.parse(values);

  const { data, error } = await supabase.rpc("create_tax_declaration", {
    tenant_id: payload.tenantId,
    company_id: payload.companyId,
    fiscal_year_id: payload.fiscalYearId,
    tax_type: payload.taxType.trim(),
    period_label: payload.periodLabel.trim(),
    due_date: payload.dueDate,
    amount_due: payload.amountDue,
    status: payload.status,
    notes: payload.notes?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function parseTaxSnapshot(value: Json): TaxSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptySnapshot;
  }

  const record = value as Record<string, Json>;

  return {
    declarations: Array.isArray(record.declarations)
      ? record.declarations
          .map(parseTaxDeclaration)
          .filter((declaration): declaration is TaxDeclaration => Boolean(declaration))
      : [],
    totals: parseTotals(record.totals),
  };
}

function parseTaxDeclaration(value: Json): TaxDeclaration | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, Json>;

  if (
    typeof record.id !== "string" ||
    typeof record.tax_type !== "string" ||
    typeof record.period_label !== "string" ||
    typeof record.due_date !== "string" ||
    typeof record.status !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    tax_type: record.tax_type,
    period_label: record.period_label,
    due_date: record.due_date,
    status: record.status as TaxDeclarationStatus,
    amount_due: typeof record.amount_due === "number" ? record.amount_due : 0,
    submitted_at: typeof record.submitted_at === "string" ? record.submitted_at : null,
    payment_reference:
      typeof record.payment_reference === "string" ? record.payment_reference : null,
    notes: typeof record.notes === "string" ? record.notes : null,
  };
}

function parseTotals(value: Json): TaxTotals {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptySnapshot.totals;
  }

  const record = value as Record<string, Json>;

  return {
    planned_count: typeof record.planned_count === "number" ? record.planned_count : 0,
    submitted_count: typeof record.submitted_count === "number" ? record.submitted_count : 0,
    late_count: typeof record.late_count === "number" ? record.late_count : 0,
    amount_due: typeof record.amount_due === "number" ? record.amount_due : 0,
  };
}
