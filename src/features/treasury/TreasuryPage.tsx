import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, Landmark, Loader2, Plus, RefreshCw, Send, WalletCards } from "lucide-react";
import { SectionHeader } from "../../components/SectionHeader";
import { useAuth } from "../auth/AuthProvider";
import {
  createTreasuryAccount,
  createTreasuryTransaction,
  loadTreasuryContext,
  type TreasuryContext,
  type TreasuryTransaction,
} from "./treasuryService";

const emptyContext: TreasuryContext = {
  company: null,
  fiscalYear: null,
  periods: [],
  journals: [],
  accounts: [],
  snapshot: {
    accounts: [],
    transactions: [],
  },
};

export function TreasuryPage() {
  const { isConfigured } = useAuth();
  const [context, setContext] = useState<TreasuryContext>(emptyContext);
  const [isLoading, setIsLoading] = useState(isConfigured);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [accountType, setAccountType] = useState<"bank" | "cash" | "mobile_money">("cash");
  const [accountName, setAccountName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");

  const [treasuryAccountId, setTreasuryAccountId] = useState("");
  const [direction, setDirection] = useState<"inflow" | "outflow">("inflow");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [transactionLabel, setTransactionLabel] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [amount, setAmount] = useState("");

  const totalBalance = useMemo(
    () => context.snapshot.accounts.reduce((sum, account) => sum + account.current_balance, 0),
    [context.snapshot.accounts],
  );

  const canUseTreasury = isConfigured && context.company && context.fiscalYear;

  async function refreshContext() {
    if (!isConfigured) {
      setContext(emptyContext);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextContext = await loadTreasuryContext();
      setContext(nextContext);
      setTreasuryAccountId((current) => current || nextContext.snapshot.accounts[0]?.id || "");
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
      await createTreasuryAccount({
        tenantId: context.company.tenant_id,
        companyId: context.company.id,
        accountType,
        name: accountName,
        institutionName,
        accountNumber,
        openingBalance: toAmount(openingBalance),
      });
      setAccountName("");
      setInstitutionName("");
      setAccountNumber("");
      setOpeningBalance("0");
      setFeedback("Compte de tresorerie ajoute.");
      await refreshContext();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Compte non cree");
    } finally {
      setIsSavingAccount(false);
    }
  }

  async function handleTransactionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (!context.company || !context.fiscalYear) {
      setError("Contexte entreprise ou exercice manquant.");
      return;
    }

    setIsSavingTransaction(true);

    try {
      const transactionId = await createTreasuryTransaction({
        tenantId: context.company.tenant_id,
        companyId: context.company.id,
        fiscalYearId: context.fiscalYear.id,
        treasuryAccountId,
        direction,
        transactionDate,
        label: transactionLabel,
        amount: toAmount(amount),
        reference: transactionReference,
      });
      setTransactionLabel("");
      setTransactionReference("");
      setAmount("");
      setFeedback(`Mouvement cree : ${transactionId}`);
      await refreshContext();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Mouvement non cree");
    } finally {
      setIsSavingTransaction(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 border-b border-line pb-8 xl:grid-cols-[1fr_360px]">
        <SectionHeader
          eyebrow="Tresorerie"
          title="Caisses, banques et mobile money"
          description="Suivi des comptes de tresorerie et mouvements entrants ou sortants par exercice."
        />
        <div className="rounded-lg border border-line bg-white/70 p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Landmark className="text-ledger" size={22} aria-hidden="true" />
              <p className="font-semibold text-ink">Position</p>
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
            <Metric label="Comptes" value={String(context.snapshot.accounts.length)} />
            <Metric label="Mouvements" value={String(context.snapshot.transactions.length)} />
            <Metric label="Solde total" value={formatAmount(totalBalance)} />
          </dl>
        </div>
      </section>

      {!isConfigured ? (
        <Notice tone="warning">
          Supabase n'est pas configure. Les comptes et mouvements de tresorerie necessitent les migrations appliquees.
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
            <WalletCards className="text-ledger" size={20} aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Compte rapide</h2>
          </div>
          <form className="mt-5 space-y-4" onSubmit={handleAccountSubmit}>
            <SelectField
              label="Type"
              value={accountType}
              onChange={(value) => setAccountType(value as "bank" | "cash" | "mobile_money")}
              options={[
                ["cash", "Caisse"],
                ["bank", "Banque"],
                ["mobile_money", "Mobile money"],
              ]}
            />
            <InputField label="Nom" value={accountName} onChange={setAccountName} placeholder="Caisse principale" />
            <InputField label="Institution" value={institutionName} onChange={setInstitutionName} placeholder="Banque ou operateur" />
            <InputField label="Numero" value={accountNumber} onChange={setAccountNumber} placeholder="Compte ou wallet" />
            <InputField label="Solde initial" type="number" step="0.01" value={openingBalance} onChange={setOpeningBalance} />
            <button
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ledger px-4 py-3 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canUseTreasury || isSavingAccount}
            >
              {isSavingAccount ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              Ajouter le compte
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Banknote className="text-ledger" size={20} aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Nouveau mouvement</h2>
            </div>
            <div className="rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">
              {direction === "inflow" ? "Encaissement" : "Decaissement"}
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleTransactionSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField label="Compte" value={treasuryAccountId} onChange={setTreasuryAccountId} options={context.snapshot.accounts.map((account) => [account.id, account.name])} />
              <SelectField
                label="Sens"
                value={direction}
                onChange={(value) => setDirection(value as "inflow" | "outflow")}
                options={[
                  ["inflow", "Entree"],
                  ["outflow", "Sortie"],
                ]}
              />
              <InputField label="Date" type="date" value={transactionDate} onChange={setTransactionDate} />
              <InputField label="Montant" type="number" min="0.01" step="0.01" value={amount} onChange={setAmount} />
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <InputField label="Libelle" value={transactionLabel} onChange={setTransactionLabel} placeholder="Reglement client, achat fournitures" />
              <InputField label="Reference" value={transactionReference} onChange={setTransactionReference} placeholder="Piece, cheque, depot" />
            </div>
            <div className="flex justify-end">
              <button
                className="flex min-h-11 items-center gap-2 rounded-md bg-ledger px-5 py-3 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canUseTreasury || !treasuryAccountId || toAmount(amount) <= 0 || isSavingTransaction}
              >
                {isSavingTransaction ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                Enregistrer
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-ink">Comptes actifs</h2>
          <div className="mt-5 space-y-3">
            {context.snapshot.accounts.length ? (
              context.snapshot.accounts.map((account) => (
                <div key={account.id} className="rounded-lg border border-line bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{account.name}</p>
                      <p className="mt-1 text-sm text-ink/55">{account.account_type} - {account.institution_name || "Interne"}</p>
                    </div>
                    <p className="font-semibold text-ink">{formatAmount(account.current_balance)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-ink/55">Aucun compte de tresorerie cree.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-ink">Derniers mouvements</h2>
          <div className="mt-5 overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full min-w-[650px] border-collapse text-sm">
              <thead className="bg-surface text-left text-ink/58">
                <tr>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Compte</th>
                  <th className="px-3 py-3 font-semibold">Libelle</th>
                  <th className="px-3 py-3 font-semibold">Sens</th>
                  <th className="px-3 py-3 text-right font-semibold">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {context.snapshot.transactions.length ? (
                  context.snapshot.transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)
                ) : (
                  <tr>
                    <td className="px-3 py-5 text-ink/55" colSpan={5}>
                      Aucun mouvement de tresorerie cree.
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

function TransactionRow({ transaction }: { transaction: TreasuryTransaction }) {
  return (
    <tr>
      <td className="px-3 py-3 text-ink/70">{transaction.transaction_date}</td>
      <td className="px-3 py-3 font-semibold text-ink">{transaction.account_name}</td>
      <td className="px-3 py-3 text-ink/70">{transaction.label}</td>
      <td className="px-3 py-3">
        <span className="rounded-full bg-ledger/10 px-2 py-1 text-xs font-semibold text-ledger">
          {transaction.direction}
        </span>
      </td>
      <td className="px-3 py-3 text-right font-semibold text-ink">{formatAmount(transaction.amount)}</td>
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
