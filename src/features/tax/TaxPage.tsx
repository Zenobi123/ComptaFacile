import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, FileCheck2, Loader2, Plus, RefreshCw, Scale } from "lucide-react";
import { SectionHeader } from "../../components/SectionHeader";
import { useAuth } from "../auth/AuthProvider";
import {
  createTaxDeclaration,
  loadTaxContext,
  type TaxContext,
  type TaxDeclaration,
} from "./taxService";

const emptyContext: TaxContext = {
  company: null,
  fiscalYear: null,
  periods: [],
  journals: [],
  accounts: [],
  snapshot: {
    declarations: [],
    totals: {
      planned_count: 0,
      submitted_count: 0,
      late_count: 0,
      amount_due: 0,
    },
  },
};

export function TaxPage() {
  const { isConfigured } = useAuth();
  const [context, setContext] = useState<TaxContext>(emptyContext);
  const [isLoading, setIsLoading] = useState(isConfigured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [taxType, setTaxType] = useState("TVA");
  const [periodLabel, setPeriodLabel] = useState(`${new Date().getFullYear()}-01`);
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountDue, setAmountDue] = useState("");
  const [status, setStatus] = useState<"planned" | "prepared" | "submitted" | "paid" | "late">(
    "planned",
  );
  const [notes, setNotes] = useState("");

  const canUseTax = isConfigured && context.company && context.fiscalYear;

  async function refreshContext() {
    if (!isConfigured) {
      setContext(emptyContext);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setContext(await loadTaxContext());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Chargement impossible");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshContext();
  }, [isConfigured]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (!context.company || !context.fiscalYear) {
      setError("Contexte entreprise ou exercice manquant.");
      return;
    }

    setIsSaving(true);

    try {
      const declarationId = await createTaxDeclaration({
        tenantId: context.company.tenant_id,
        companyId: context.company.id,
        fiscalYearId: context.fiscalYear.id,
        taxType,
        periodLabel,
        dueDate,
        amountDue: toAmount(amountDue),
        status,
        notes,
      });
      setFeedback(`Declaration creee : ${declarationId}`);
      setAmountDue("");
      setNotes("");
      await refreshContext();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Declaration non creee");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 border-b border-line pb-8 xl:grid-cols-[1fr_360px]">
        <SectionHeader
          eyebrow="Fiscalite"
          title="Declarations et echeances"
          description="Suivi operationnel des obligations fiscales camerounaises par exercice, statut et montant."
        />
        <div className="rounded-lg border border-line bg-white/70 p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Scale className="text-ledger" size={22} aria-hidden="true" />
              <p className="font-semibold text-ink">Position fiscale</p>
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
            <Metric label="Planifiees" value={String(context.snapshot.totals.planned_count)} />
            <Metric label="Declarees" value={String(context.snapshot.totals.submitted_count)} />
            <Metric label="En retard" value={String(context.snapshot.totals.late_count)} />
            <Metric label="Montant ouvert" value={formatAmount(context.snapshot.totals.amount_due)} />
          </dl>
        </div>
      </section>

      {!isConfigured ? (
        <Notice tone="warning">
          Supabase n'est pas configure. Les declarations fiscales necessitent les migrations appliquees.
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
            <CalendarClock className="text-ledger" size={20} aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Nouvelle obligation</h2>
          </div>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <SelectField
              label="Type"
              value={taxType}
              onChange={setTaxType}
              options={[
                ["TVA", "TVA"],
                ["Acompte IS", "Acompte IS"],
                ["Retenue a la source", "Retenue a la source"],
                ["DSF", "DSF"],
                ["Patente", "Patente"],
              ]}
            />
            <InputField label="Periode" value={periodLabel} onChange={setPeriodLabel} placeholder="2026-01" />
            <InputField label="Echeance" type="date" value={dueDate} onChange={setDueDate} />
            <InputField label="Montant" type="number" min="0" step="0.01" value={amountDue} onChange={setAmountDue} />
            <SelectField
              label="Statut"
              value={status}
              onChange={(value) => setStatus(value as "planned" | "prepared" | "submitted" | "paid" | "late")}
              options={[
                ["planned", "Planifiee"],
                ["prepared", "Preparee"],
                ["submitted", "Soumise"],
                ["paid", "Payee"],
                ["late", "En retard"],
              ]}
            />
            <InputField label="Notes" value={notes} onChange={setNotes} placeholder="Reference DGI, controle, commentaire" />
            <button
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ledger px-4 py-3 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canUseTax || isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              Ajouter
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileCheck2 className="text-ledger" size={20} aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Calendrier fiscal</h2>
            </div>
            <span className="text-sm font-semibold text-ink/55">
              {context.snapshot.declarations.length} obligations
            </span>
          </div>
          <div className="mt-5 overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead className="bg-surface text-left text-ink/58">
                <tr>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Periode</th>
                  <th className="px-3 py-3 font-semibold">Echeance</th>
                  <th className="px-3 py-3 font-semibold">Statut</th>
                  <th className="px-3 py-3 text-right font-semibold">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {context.snapshot.declarations.length ? (
                  context.snapshot.declarations.map((declaration) => (
                    <DeclarationRow key={declaration.id} declaration={declaration} />
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-5 text-ink/55" colSpan={5}>
                      Aucune declaration fiscale creee.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
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

function DeclarationRow({ declaration }: { declaration: TaxDeclaration }) {
  return (
    <tr>
      <td className="px-3 py-3 font-semibold text-ink">{declaration.tax_type}</td>
      <td className="px-3 py-3 text-ink/70">{declaration.period_label}</td>
      <td className="px-3 py-3 text-ink/70">{declaration.due_date}</td>
      <td className="px-3 py-3">
        <span className="rounded-full bg-ledger/10 px-2 py-1 text-xs font-semibold text-ledger">
          {declaration.status}
        </span>
      </td>
      <td className="px-3 py-3 text-right font-semibold text-ink">
        {formatAmount(declaration.amount_due)}
      </td>
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
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
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
