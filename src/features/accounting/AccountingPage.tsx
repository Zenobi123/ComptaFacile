import { BookOpenCheck, CheckCircle2, Loader2, Plus, RefreshCw, Send } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SectionHeader } from "../../components/SectionHeader";
import { useAuth } from "../auth/AuthProvider";
import {
  createCompanyAccount,
  createJournalEntry,
  loadAccountingContext,
  type AccountingAccount,
  type AccountingContext,
} from "./accountingService";

type EntryLine = {
  accountId: string;
  label: string;
  debitAmount: string;
  creditAmount: string;
};

const emptyLine: EntryLine = {
  accountId: "",
  label: "",
  debitAmount: "",
  creditAmount: "",
};

const fallbackContext: AccountingContext = {
  company: null,
  fiscalYear: null,
  periods: [],
  journals: [],
  accounts: [],
};

export function AccountingPage() {
  const { isConfigured } = useAuth();
  const [context, setContext] = useState<AccountingContext>(fallbackContext);
  const [isLoading, setIsLoading] = useState(isConfigured);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [accountNumber, setAccountNumber] = useState("");
  const [accountLabel, setAccountLabel] = useState("");

  const [periodId, setPeriodId] = useState("");
  const [journalId, setJournalId] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryLabel, setEntryLabel] = useState("");
  const [entryReference, setEntryReference] = useState("");
  const [targetStatus, setTargetStatus] = useState<"draft" | "pending_review" | "validated">(
    "draft",
  );
  const [lines, setLines] = useState<EntryLine[]>([
    { ...emptyLine },
    { ...emptyLine },
  ]);

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + toAmount(line.debitAmount), 0);
    const credit = lines.reduce((sum, line) => sum + toAmount(line.creditAmount), 0);
    return {
      debit,
      credit,
      balanced: debit > 0 && debit === credit,
    };
  }, [lines]);

  const canUseLiveAccounting =
    isConfigured && context.company && context.fiscalYear && context.periods.length > 0;

  async function refreshContext() {
    if (!isConfigured) {
      setContext(fallbackContext);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextContext = await loadAccountingContext();
      setContext(nextContext);
      setPeriodId((current) => current || nextContext.periods[0]?.id || "");
      setJournalId((current) => current || nextContext.journals[0]?.id || "");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Chargement impossible");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshContext();
  }, [isConfigured]);

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (!context.company) {
      setError("Cree d'abord une entreprise depuis l'onboarding.");
      return;
    }

    setIsSavingAccount(true);

    try {
      await createCompanyAccount({
        tenantId: context.company.tenant_id,
        companyId: context.company.id,
        accountNumber,
        label: accountLabel,
        classCode: accountNumber.slice(0, 1),
      });
      setAccountNumber("");
      setAccountLabel("");
      setFeedback("Compte ajoute au plan comptable.");
      await refreshContext();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Compte non cree");
    } finally {
      setIsSavingAccount(false);
    }
  }

  async function handleEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (!context.company || !context.fiscalYear) {
      setError("Contexte entreprise ou exercice manquant.");
      return;
    }

    setIsSavingEntry(true);

    try {
      const entryId = await createJournalEntry({
        tenantId: context.company.tenant_id,
        companyId: context.company.id,
        fiscalYearId: context.fiscalYear.id,
        accountingPeriodId: periodId,
        journalId,
        entryDate,
        label: entryLabel,
        reference: entryReference,
        targetStatus,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          label: line.label,
          debitAmount: toAmount(line.debitAmount),
          creditAmount: toAmount(line.creditAmount),
        })),
      });

      setEntryLabel("");
      setEntryReference("");
      setTargetStatus("draft");
      setLines([{ ...emptyLine }, { ...emptyLine }]);
      setFeedback(`Ecriture creee : ${entryId}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Ecriture non creee");
    } finally {
      setIsSavingEntry(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 border-b border-line pb-8 xl:grid-cols-[1fr_340px]">
        <SectionHeader
          eyebrow="Comptabilite"
          title="Saisie controlee des ecritures"
          description="Creation de comptes OHADA, selection de la periode ouverte et envoi d'ecritures equilibrees vers une fonction serveur."
        />
        <div className="rounded-lg border border-line bg-white/70 p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BookOpenCheck className="text-ledger" size={22} aria-hidden="true" />
              <p className="font-semibold text-ink">Contexte</p>
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
            <ContextRow label="Entreprise" value={context.company?.legal_name ?? "Aucune"} />
            <ContextRow label="Exercice" value={context.fiscalYear?.label ?? "Non cree"} />
            <ContextRow label="Comptes actifs" value={String(context.accounts.length)} />
            <ContextRow label="Journaux" value={String(context.journals.length)} />
          </dl>
        </div>
      </section>

      {!isConfigured ? (
        <Notice tone="warning">
          Supabase n'est pas configure. La page affiche le poste de travail, mais la creation de comptes et d'ecritures necessite les variables d'environnement et les migrations appliquees.
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
          <h2 className="text-lg font-semibold text-ink">Compte rapide</h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Ajoute un sous-compte utilisable en saisie. Le premier chiffre determine la classe OHADA.
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleAccountSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-ink/70">Numero</span>
              <input
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 outline-none focus:border-ledger"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                placeholder="411100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink/70">Libelle</span>
              <input
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 outline-none focus:border-ledger"
                value={accountLabel}
                onChange={(event) => setAccountLabel(event.target.value)}
                placeholder="Clients locaux"
              />
            </label>
            <button
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ledger px-4 py-3 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canUseLiveAccounting || isSavingAccount}
            >
              {isSavingAccount ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              Ajouter le compte
            </button>
          </form>

          <div className="mt-6 max-h-80 space-y-2 overflow-auto border-t border-line pt-4">
            {context.accounts.length ? (
              context.accounts.map((account) => <AccountRow key={account.id} account={account} />)
            ) : (
              <p className="text-sm leading-6 text-ink/55">Aucun compte actif charge.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Nouvelle ecriture</h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">
                Les lignes sont controlees cote client puis recontrolees par la RPC Supabase.
              </p>
            </div>
            <div className="rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">
              Debit {formatAmount(totals.debit)} / Credit {formatAmount(totals.credit)}
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleEntrySubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField label="Periode" value={periodId} onChange={setPeriodId} options={context.periods.map((period) => [period.id, `${period.label} (${period.status})`])} />
              <SelectField label="Journal" value={journalId} onChange={setJournalId} options={context.journals.map((journal) => [journal.id, `${journal.code} - ${journal.label}`])} />
              <InputField label="Date" type="date" value={entryDate} onChange={setEntryDate} />
              <SelectField
                label="Statut"
                value={targetStatus}
                onChange={(value) => setTargetStatus(value as "draft" | "pending_review" | "validated")}
                options={[
                  ["draft", "Brouillon"],
                  ["pending_review", "A valider"],
                  ["validated", "Validee"],
                ]}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <InputField label="Libelle" value={entryLabel} onChange={setEntryLabel} placeholder="Facture client FC-001" />
              <InputField label="Reference" value={entryReference} onChange={setEntryReference} placeholder="Piece ou facture" />
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-line bg-surface p-3 md:grid-cols-[1.1fr_1fr_130px_130px]">
                  <SelectField
                    label={`Compte ${index + 1}`}
                    value={line.accountId}
                    onChange={(value) => updateLine(index, "accountId", value, setLines)}
                    options={context.accounts.map((account) => [
                      account.id,
                      `${account.account_number} - ${account.label}`,
                    ])}
                  />
                  <InputField
                    label="Libelle ligne"
                    value={line.label}
                    onChange={(value) => updateLine(index, "label", value, setLines)}
                    placeholder={entryLabel}
                  />
                  <InputField
                    label="Debit"
                    type="number"
                    value={line.debitAmount}
                    onChange={(value) => updateLine(index, "debitAmount", value, setLines)}
                    min="0"
                    step="0.01"
                  />
                  <InputField
                    label="Credit"
                    type="number"
                    value={line.creditAmount}
                    onChange={(value) => updateLine(index, "creditAmount", value, setLines)}
                    min="0"
                    step="0.01"
                  />
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
                disabled={!canUseLiveAccounting || !totals.balanced || isSavingEntry}
              >
                {isSavingEntry ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                Enregistrer
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-ink p-5 text-white shadow-soft">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-[#8ed7cb]" size={20} aria-hidden="true" />
          <h2 className="text-lg font-semibold">Regles appliquees</h2>
        </div>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-white/70 md:grid-cols-3">
          <p>Debit et credit doivent etre strictement egaux avant validation serveur.</p>
          <p>Les comptes inactifs et les periodes verrouillees sont refuses par la RPC.</p>
          <p>Les ecritures validees restent protegees par les triggers deja en place.</p>
        </div>
      </section>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink/55">{label}</dt>
      <dd className="truncate font-semibold text-ink">{value}</dd>
    </div>
  );
}

function AccountRow({ account }: { account: AccountingAccount }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 text-sm">
      <span className="font-semibold text-ink">{account.account_number}</span>
      <span className="truncate text-ink/62">{account.label}</span>
    </div>
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
  key: keyof EntryLine,
  value: string,
  setLines: React.Dispatch<React.SetStateAction<EntryLine[]>>,
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
