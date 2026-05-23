import { z } from "zod";
import { loadAccountingContext, type AccountingContext } from "../accounting/accountingService";
import { supabase } from "../../lib/supabase";
import type { Json, SalesInvoiceStatus } from "../../lib/database.types";

export type BillingCustomer = {
  id: string;
  name: string;
  niu: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
};

export type BillingInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: SalesInvoiceStatus;
  total_amount: number;
  tax_amount: number;
  customer_name: string;
};

export type BillingTotals = {
  draft_count: number;
  issued_count: number;
  paid_count: number;
  issued_amount: number;
};

export type BillingSnapshot = {
  customers: BillingCustomer[];
  invoices: BillingInvoice[];
  totals: BillingTotals;
};

export type BillingContext = AccountingContext & {
  snapshot: BillingSnapshot;
};

export const customerSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().min(2, "Nom client requis"),
  niu: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
});

export const salesInvoiceSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid(),
  fiscalYearId: z.string().uuid(),
  customerId: z.string().uuid("Client requis"),
  invoiceNumber: z.string().min(2, "Numero requis"),
  invoiceDate: z.string().min(10, "Date requise"),
  dueDate: z.string().optional(),
  status: z.enum(["draft", "issued"]),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        description: z.string().min(2, "Description requise"),
        quantity: z.number().positive("Quantite invalide"),
        unitPrice: z.number().min(0, "Prix invalide"),
        taxRate: z.number().min(0, "Taux invalide"),
      }),
    )
    .min(1, "Au moins une ligne est requise"),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
export type SalesInvoiceFormData = z.infer<typeof salesInvoiceSchema>;

const emptySnapshot: BillingSnapshot = {
  customers: [],
  invoices: [],
  totals: {
    draft_count: 0,
    issued_count: 0,
    paid_count: 0,
    issued_amount: 0,
  },
};

export async function loadBillingContext(): Promise<BillingContext> {
  const accountingContext = await loadAccountingContext();

  if (!supabase || !accountingContext.company || !accountingContext.fiscalYear) {
    return {
      ...accountingContext,
      snapshot: emptySnapshot,
    };
  }

  const { data, error } = await supabase.rpc("get_billing_snapshot", {
    p_tenant_id: accountingContext.company.tenant_id,
    p_company_id: accountingContext.company.id,
    p_fiscal_year_id: accountingContext.fiscalYear.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...accountingContext,
    snapshot: parseBillingSnapshot(data),
  };
}

export async function createCustomer(values: CustomerFormData) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configure.");
  }

  const payload = customerSchema.parse(values);

  const { error } = await supabase.from("third_parties").insert({
    tenant_id: payload.tenantId,
    company_id: payload.companyId,
    party_type: "customer",
    name: payload.name.trim(),
    niu: nullable(payload.niu),
    email: nullable(payload.email),
    phone: nullable(payload.phone),
    city: nullable(payload.city),
    address: nullable(payload.address),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createSalesInvoice(values: SalesInvoiceFormData) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configure.");
  }

  const payload = salesInvoiceSchema.parse(values);

  const { data, error } = await supabase.rpc("create_sales_invoice", {
    tenant_id: payload.tenantId,
    company_id: payload.companyId,
    fiscal_year_id: payload.fiscalYearId,
    customer_id: payload.customerId,
    invoice_number: payload.invoiceNumber.trim(),
    invoice_date: payload.invoiceDate,
    due_date: payload.dueDate || null,
    status: payload.status,
    notes: nullable(payload.notes),
    lines: payload.lines.map((line) => ({
      description: line.description.trim(),
      quantity: line.quantity,
      unit_price: line.unitPrice,
      tax_rate: line.taxRate,
    })),
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

function parseBillingSnapshot(value: Json): BillingSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptySnapshot;
  }

  const record = value as Record<string, Json>;

  return {
    customers: Array.isArray(record.customers)
      ? record.customers.map(parseCustomer).filter((customer): customer is BillingCustomer => Boolean(customer))
      : [],
    invoices: Array.isArray(record.invoices)
      ? record.invoices.map(parseInvoice).filter((invoice): invoice is BillingInvoice => Boolean(invoice))
      : [],
    totals: parseTotals(record.totals),
  };
}

function parseCustomer(value: Json): BillingCustomer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, Json>;

  if (typeof record.id !== "string" || typeof record.name !== "string") {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    niu: typeof record.niu === "string" ? record.niu : null,
    city: typeof record.city === "string" ? record.city : null,
    phone: typeof record.phone === "string" ? record.phone : null,
    email: typeof record.email === "string" ? record.email : null,
  };
}

function parseInvoice(value: Json): BillingInvoice | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, Json>;

  if (
    typeof record.id !== "string" ||
    typeof record.invoice_number !== "string" ||
    typeof record.invoice_date !== "string" ||
    typeof record.status !== "string" ||
    typeof record.customer_name !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    invoice_number: record.invoice_number,
    invoice_date: record.invoice_date,
    due_date: typeof record.due_date === "string" ? record.due_date : null,
    status: record.status as SalesInvoiceStatus,
    total_amount: typeof record.total_amount === "number" ? record.total_amount : 0,
    tax_amount: typeof record.tax_amount === "number" ? record.tax_amount : 0,
    customer_name: record.customer_name,
  };
}

function parseTotals(value: Json): BillingTotals {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptySnapshot.totals;
  }

  const record = value as Record<string, Json>;

  return {
    draft_count: typeof record.draft_count === "number" ? record.draft_count : 0,
    issued_count: typeof record.issued_count === "number" ? record.issued_count : 0,
    paid_count: typeof record.paid_count === "number" ? record.paid_count : 0,
    issued_amount: typeof record.issued_amount === "number" ? record.issued_amount : 0,
  };
}
