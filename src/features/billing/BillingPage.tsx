import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, FileText, Loader2, Plus, ReceiptText, RefreshCw, Send } from "lucide-react";
import { SectionHeader } from "../../components/SectionHeader";
import { useAuth } from "../auth/AuthProvider";
import {
  createCustomer,
  createSalesInvoice,
  loadBillingContext,
  type BillingContext,
  type BillingInvoice,
} from "./billingService";

type InvoiceLine = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
};

const emptyLine: InvoiceLine = {
  description: "",
  quantity: "1",
  unitPrice: "",
  taxRate: "0",
};

const emptyContext: BillingContext = {
  company: null,
  fiscalYear: null,
  periods: [],
  journals: [],
  accounts: [],
  snapshot: {
    customers: [],
    invoices: [],
    totals: {
      draft_count: 0,
      issued_count: 0,
      paid_count: 0,
      issued_amount: 0,
    },
  },
};

export function BillingPage() {
  const { isConfigured } = useAuth();
  const [context, setContext] = useState<BillingContext>(emptyContext);
  const [isLoading, setIsLoading] = useState(isConfigured);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerNiu, setCustomerNiu] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCity, setCustomerCity] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(() => `FAC-${new Date().getFullYear()}-001`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"draft" | "issued">("draft");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([{ ...emptyLine }]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
    const tax = lines.reduce((sum, line) => sum + lineTax(line), 0);

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [lines]);

  const canUseBilling = isConfigured && context.company && context.fiscalYear;

  async function refreshContext() {
    if (!isConfigured) {
      setContext(emptyContext);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextContext = await loadBillingContext();
      setContext(nextContext);
      setCustomerId((current) => current || nextContext.snapshot.customers[0]?.id || "");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Chargement impossible");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshContext();
  }, [isConfigured]);

  async function handleCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (!context.company) {
      setError("Cree d'abord une entreprise depuis l'onboarding.");
      return;
    }

    setIsSavingCustomer(true);

    try {
      await createCustomer({
        tenantId: context.company.tenant_id,
        companyId: context.company.id,
        name: customerName,
        niu: customerNiu,
        phone: customerPhone,
        email: customerEmail,
        city: customerCity,
      });
      setCustomerName("");
      setCustomerNiu("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerCity("");
      setFeedback("Client ajoute.");
      await refreshContext();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Client non cree");
    } finally {
      setIsSavingCustomer(false);
    }
  }

  async function handleInvoiceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (!context.company || !context.fiscalYear) {
      setError("Contexte entreprise ou exercice manquant.");
      return;
    }

    setIsSavingInvoice(true);

    try {
      const invoiceId = await createSalesInvoice({
        tenantId: context.company.tenant_id,
        companyId: context.company.id,
        fiscalYearId: context.fiscalYear.id,
        customerId,
        invoiceNumber,
        invoiceDate,
        dueDate,
        status,
        notes,
        lines: lines.map((line) => ({
          description: line.description,
          quantity: toAmount(line.quantity),
          unitPrice: toAmount(line.unitPrice),
          taxRate: toAmount(line.taxRate),
        })),
      });
      setFeedback(`Facture creee : ${invoiceId}`);
      setNotes("");
      setLines([{ ...emptyLine }]);
      await refreshContext();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Facture non creee");
    } finally {
      setIsSavingInvoice(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 border-b border-line pb-8 xl:grid-cols-[1fr_360px]">
        <SectionHeader
          eyebrow="Ventes et achats"
          title="Clients et factures de vente"
          description="Creation de tiers clients, facturation simple et suivi des montants emis pour l'exercice."
        />
        <div className="rounded-lg border border-line bg-white/70 p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ReceiptText className="text-ledger" size={22} aria-hidden="true" />
              <p className="font-semibold text-ink">Synthese ventes</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshContext()}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-ink/70 transition hover:border-ledger hover:text-ledger"
              aria-label="Rafraichir"
            >
              <RefreshCw size={17} aria-hidden="true" />
            </button>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <Metric label="Clients" value={String(context.snapshot.customers.length)} />
            <Metric label="Brouillons" value={String(context.snapshot.totals.draft_count)} />
            <Metric label="Emises" value={String(context.snapshot.totals.issued_count)} />
            <Metric label="Montant emis" value={formatAmount(context.snapshot.totals.issued_amount)} />
          </dl>
        </div>
      </section>

      {!isConfigured ? (
        <Notice tone="warning">
          Supabase n'est pas configure. La page reste consultable en apercu, mais les clients et factures necessitent les migrations appliquees.
        </Notice>
      ) : null}

      {isConfigured && !isLoading && !context.company ? (
        <Notice tone="warning">
          Aucun dossier entreprise accessible. Lance d'abord l'onboarding depuis{" "}
          <Link className="font-semibold underline" to="/onboarding">
            la page Onboarding
          </Link>
          .
        </Notice>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}
      {feedback ? <Notice tone="success">{feedback}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <Building2 className="text-ledger" size={20} aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Client rapide</h2>
          </div>
          <form className="mt-5 space-y-4" onSubmit={handleCustomerSubmit}>
            <InputField label="Nom client" value={customerName} onChange={setCustomerName} placeholder="Client Exemple SARL" />
            <InputField label="NIU" value={customerNiu} onChange={setCustomerNiu} placeholder="Identifiant fiscal" />
            <InputField label="Telephone" value={customerPhone} onChange={setCustomerPhone} placeholder="+237 ..." />
            <InputField label="Email" value={customerEmail} onChange={setCustomerEmail} placeholder="client@example.cm" />
            <InputField label="Ville" value={customerCity} onChange={setCustomerCity} placeholder="Yaounde" />
            <button
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ledger px-4 py-3 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canUseBilling || isSavingCustomer}
            >
              {isSavingCustomer ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              Ajouter le client
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="text-ledger" size={20} aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Nouvelle facture</h2>
            </div>
            <div className="rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">
              Total {formatAmount(totals.total)}
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleInvoiceSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField label="Client" value={customerId} onChange={setCustomerId} options={context.snapshot.customers.map((customer) => [customer.id, customer.name])} />
              <InputField label="Numero" value={invoiceNumber} onChange={setInvoiceNumber} />
              <InputField label="Date facture" type="date" value={invoiceDate} onChange={setInvoiceDate} />
              <InputField label="Echeance" type="date" value={dueDate} onChange={setDueDate} />
            </div>
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <SelectField
                label="Statut"
                value={status}
                onChange={(value) => setStatus(value as "draft" | "issued")}
                options={[
                  ["draft", "Brouillon"],
                  ["issued", "Emise"],
                ]}
              />
              <InputField label="Notes" value={notes} onChange={setNotes} placeholder="Conditions, reference, observation" />
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-line bg-surface p-3 md:grid-cols-[1fr_110px_140px_110px]">
                  <InputField label={`Description ${index + 1}`} value={line.description} onChange={(value) => updateLine(index, "description", value, setLines)} placeholder="Prestation ou article" />
                  <InputField label="Quantite" type="number" min="0.01" step="0.01" value={line.quantity} onChange={(value) => updateLine(index, "quantity", value, setLines)} />
                  <InputField label="Prix unitaire" type="number" min="0" step="0.01" value={line.unitPrice} onChange={(value) => updateLine(index, "unitPrice", value, setLines)} />
                  <InputField label="TVA %" type="number" min="0" step="0.01" value={line.taxRate} onChange={(value) => updateLine(index, "taxRate", value, setLines)} />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setLines((current) => [...current, { ...emptyLine }])}
                className="flex min-h-10 items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink/70 transition hover:border-ledger hover:text-ledger"
              >
                <Plus size={17} aria-hidden="true" />
                Ajouter une ligne
              </button>
              <button
                className="flex min-h-11 items-center gap-2 rounded-md bg-ledger px-5 py-3 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canUseBilling || !customerId || totals.total <= 0 || isSavingInvoice}
              >
                {isSavingInvoice ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                Enregistrer
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Dernieres factures</h2>
          <span className="text-sm font-semibold text-ink/55">
            {context.snapshot.invoices.length} factures
          </span>
        </div>
        <div className="mt-5 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="bg-surface text-left text-ink/58">
              <tr>
                <th className="px-3 py-3 font-semibold">Numero</th>
                <th className="px-3 py-3 font-semibold">Client</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Statut</th>
                <th className="px-3 py-3 text-right font-semibold">TVA</th>
                <th className="px-3 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {context.snapshot.invoices.length ? (
                context.snapshot.invoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} />)
              ) : (
                <tr>
                  <td className="px-3 py-5 text-ink/55" colSpan={6}>
                    Aucune facture creee pour cet exercice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink/55">{label}</dt>
      <dd className="truncate font-semibold text-ink">{value}</dd>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: BillingInvoice }) {
  return (
    <tr>
      <td className="px-3 py-3 font-semibold text-ink">{invoice.invoice_number}</td>
      <td className="px-3 py-3 text-ink/70">{invoice.customer_name}</td>
      <td className="px-3 py-3 text-ink/70">{invoice.invoice_date}</td>
      <td className="px-3 py-3">
        <span className="rounded-full bg-ledger/10 px-2 py-1 text-xs font-semibold text-ledger">
          {invoice.status}
        </span>
      </td>
      <td className="px-3 py-3 text-right font-medium text-ink">{formatAmount(invoice.tax_amount)}</td>
      <td className="px-3 py-3 text-right font-semibold text-ink">{formatAmount(invoice.total_amount)}</td>
    </tr>
  );
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "warning" | "error" | "success";
}) {
  const styles = {
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className={`rounded-lg border p-4 text-sm leading-6 ${styles[tone]}`}>
      {children}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink/70">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 outline-none focus:border-ledger"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        min={min}
        step={step}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink/70">{label}</span>
      <select
        className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 outline-none focus:border-ledger"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Selectionner</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function updateLine(
  index: number,
  key: keyof InvoiceLine,
  value: string,
  setLines: React.Dispatch<React.SetStateAction<InvoiceLine[]>>,
) {
  setLines((current) =>
    current.map((line, lineIndex) =>
      lineIndex === index
        ? {
            ...line,
            [key]: value,
          }
        : line,
    ),
  );
}

function lineSubtotal(line: InvoiceLine) {
  return toAmount(line.quantity) * toAmount(line.unitPrice);
}

function lineTax(line: InvoiceLine) {
  return lineSubtotal(line) * (toAmount(line.taxRate) / 100);
}

function toAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}
