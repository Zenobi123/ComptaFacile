import { Building2, CalendarCheck2, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  createCompanyOnboarding,
  type OnboardingFormData,
  onboardingSchema,
} from "./onboardingService";

const initialValues: OnboardingFormData = {
  tenantName: "",
  legalName: "",
  tradeName: "",
  legalForm: "SARL",
  niu: "",
  rccm: "",
  sector: "",
  address: "",
  city: "Yaounde",
  taxCenter: "",
  taxRegime: "reel",
  dsfType: "systeme_normal",
  accountingSystem: "normal",
  startsOn: `${new Date().getFullYear()}-01-01`,
  endsOn: `${new Date().getFullYear()}-12-31`,
  vatEnabled: false,
  withholdingEnabled: false,
  stockEnabled: false,
  fixedAssetsEnabled: false,
  payrollEnabled: false,
};

const optionFields = [
  ["vatEnabled", "TVA"] as const,
  ["withholdingEnabled", "Retenues a la source"] as const,
  ["stockEnabled", "Stocks"] as const,
  ["fixedAssetsEnabled", "Immobilisations"] as const,
  ["payrollEnabled", "Paie"] as const,
];

export function OnboardingPage() {
  const { isConfigured, user } = useAuth();
  const [values, setValues] = useState<OnboardingFormData>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    tenantId: string;
    companyId: string;
    fiscalYearId: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<Key extends keyof OnboardingFormData>(
    key: Key,
    value: OnboardingFormData[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    const validation = onboardingSchema.safeParse(values);

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await createCompanyOnboarding(validation.data);
      setResult(created);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Creation impossible");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 border-b border-line pb-8 xl:grid-cols-[1fr_360px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ledger">
            Onboarding entreprise
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold text-ink md:text-4xl">
            Initialiser le premier dossier comptable et fiscal
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink/62">
            Creation transactionnelle du tenant, de l'entreprise, de l'exercice, des periodes, du profil fiscal et des journaux standards.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-white/70 p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <Building2 className="text-ledger" size={22} aria-hidden="true" />
            <p className="font-semibold text-ink">Session</p>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink/55">Supabase</dt>
              <dd className="font-semibold text-ink">{isConfigured ? "Configure" : "Apercu"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink/55">Utilisateur</dt>
              <dd className="truncate font-semibold text-ink">{user?.email ?? "Demo local"}</dd>
            </div>
          </dl>
        </div>
      </section>

      {!isConfigured ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, applique les migrations Supabase, puis reconnecte-toi pour creer un dossier reel.
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
          <div className="mb-5 flex items-center gap-3">
            <Building2 className="text-ledger" size={20} aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Entreprise</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom espace client" value={values.tenantName} onChange={(value) => updateField("tenantName", value)} placeholder="Groupe Exemple" />
            <Field label="Raison sociale" value={values.legalName} onChange={(value) => updateField("legalName", value)} placeholder="Exemple SARL" />
            <Field label="Nom commercial" value={values.tradeName ?? ""} onChange={(value) => updateField("tradeName", value)} placeholder="Compta Exemple" />
            <Field label="Forme juridique" value={values.legalForm ?? ""} onChange={(value) => updateField("legalForm", value)} placeholder="SARL" />
            <Field label="NIU" value={values.niu ?? ""} onChange={(value) => updateField("niu", value)} placeholder="Identifiant fiscal" />
            <Field label="RCCM" value={values.rccm ?? ""} onChange={(value) => updateField("rccm", value)} placeholder="RCCM si applicable" />
            <Field label="Secteur" value={values.sector ?? ""} onChange={(value) => updateField("sector", value)} placeholder="Commerce, services, sante" />
            <Field label="Ville" value={values.city ?? ""} onChange={(value) => updateField("city", value)} placeholder="Yaounde" />
            <Field label="Adresse" value={values.address ?? ""} onChange={(value) => updateField("address", value)} placeholder="Adresse complete" />
            <Field label="Centre des impots" value={values.taxCenter ?? ""} onChange={(value) => updateField("taxCenter", value)} placeholder="Centre de rattachement" />
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
          <div className="mb-5 flex items-center gap-3">
            <CalendarCheck2 className="text-ledger" size={20} aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Profil fiscal et exercice</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Regime fiscal"
              value={values.taxRegime}
              onChange={(value) => updateField("taxRegime", value)}
              options={[
                ["reel", "Reel"],
                ["simplifie", "Simplifie"],
                ["liberatoire", "Liberatoire"],
              ]}
            />
            <SelectField
              label="Type DSF"
              value={values.dsfType}
              onChange={(value) => updateField("dsfType", value)}
              options={[
                ["systeme_normal", "Systeme normal"],
                ["systeme_minimal", "Systeme minimal"],
                ["obnl", "OBNL"],
              ]}
            />
            <SelectField
              label="Systeme comptable"
              value={values.accountingSystem}
              onChange={(value) => updateField("accountingSystem", value)}
              options={[
                ["normal", "Normal"],
                ["minimal_tresorerie", "Minimal de tresorerie"],
                ["obnl", "OBNL"],
              ]}
            />
            <Field label="Debut exercice" type="date" value={values.startsOn} onChange={(value) => updateField("startsOn", value)} />
            <Field label="Fin exercice" type="date" value={values.endsOn} onChange={(value) => updateField("endsOn", value)} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {optionFields.map(([key, label]) => (
              <label key={key} className="flex min-h-12 items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink/70">
                <input
                  type="checkbox"
                  checked={values[key]}
                  onChange={(event) => updateField(key, event.target.checked)}
                  className="h-4 w-4 accent-ledger"
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={18} aria-hidden="true" />
              Dossier initialise
            </div>
            <p className="mt-2">
              Tenant {result.tenantId}, entreprise {result.companyId}, exercice {result.fiscalYearId}.
            </p>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            className="flex min-h-11 items-center gap-2 rounded-md bg-ledger px-5 py-3 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isConfigured || isSubmitting}
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : null}
            Creer le dossier
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
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
