import { Activity, FileCheck2, Landmark, Scale } from "lucide-react";
import { MetricBlock } from "../../components/MetricBlock";
import { SectionHeader } from "../../components/SectionHeader";
import { operationalChecks, readinessMetrics } from "../../data/modules";

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-8 border-b border-line pb-8 xl:grid-cols-[1fr_360px]">
        <SectionHeader
          eyebrow="Pilotage"
          title="Vue operationnelle du SaaS comptable"
          description="Le socle ComptaFacile prepare les flux multi-entreprises, les controles comptables et les obligations fiscales camerounaises."
        />
        <div className="rounded-lg border border-line bg-white/70 p-5 shadow-soft">
          <p className="text-sm font-semibold text-ink">Etat du socle</p>
          <div className="mt-4 space-y-4">
            {[
              ["Frontend Netlify", "Pret"],
              ["Supabase", "Variables a renseigner"],
              ["RLS", "A implementer cote base"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink/60">{label}</span>
                <span className="text-sm font-semibold text-ink">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-line bg-white/70 p-5 shadow-soft sm:grid-cols-2 xl:grid-cols-4">
        {readinessMetrics.map((metric) => (
          <MetricBlock key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
          <div className="mb-6 flex items-center gap-3">
            <Activity className="text-ledger" size={22} aria-hidden="true" />
            <h2 className="text-xl font-semibold text-ink">Parcours MVP</h2>
          </div>
          <div className="space-y-5">
            {[
              {
                icon: Landmark,
                title: "Entreprises, exercices et journaux",
                text: "Installer la structure de donnees avant les saisies metier.",
              },
              {
                icon: FileCheck2,
                title: "Ecritures et pieces justificatives",
                text: "Garder les brouillons modifiables et les validations immuables.",
              },
              {
                icon: Scale,
                title: "Fiscalite et DSF preparatoire",
                text: "Versionner les regles pour eviter les taux fiscaux codes en dur.",
              },
            ].map((step) => (
              <div key={step.title} className="grid gap-3 border-t border-line pt-5 first:border-t-0 first:pt-0 sm:grid-cols-[48px_1fr]">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ledger/10 text-ledger">
                  <step.icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-ink/62">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-ink p-6 text-white shadow-soft">
          <h2 className="text-xl font-semibold">Garde-fous metier</h2>
          <div className="mt-6 space-y-5">
            {operationalChecks.map((check) => (
              <div key={check.title} className="flex gap-4 border-t border-white/10 pt-5 first:border-t-0 first:pt-0">
                <check.icon className="mt-0.5 text-[#8ed7cb]" size={20} aria-hidden="true" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{check.title}</h3>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/78">
                      {check.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-white/68">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
