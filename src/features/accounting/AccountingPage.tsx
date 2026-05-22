import { BookOpenCheck } from "lucide-react";
import { SectionHeader } from "../../components/SectionHeader";
import { WorkList } from "../../components/WorkList";
import { accountingBacklog } from "../../data/modules";

export function AccountingPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Comptabilite"
        title="Plan OHADA, journaux et ecritures"
        description="Cette zone regroupera les exercices, periodes, comptes, journaux et controles de validation debit-credit."
      />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <WorkList title="Backlog comptable MVP" items={accountingBacklog} icon={BookOpenCheck} />
        <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-ink">Flux de validation</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            {["Brouillon", "A valider", "Validee", "Contrepassee", "Archivee"].map((state) => (
              <div key={state} className="rounded-md border border-line bg-surface px-3 py-4 text-center text-sm font-semibold text-ink/70">
                {state}
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-ink/60">
            Une ecriture validee deviendra non modifiable. Les corrections passeront par une ecriture de correction ou une contrepassation liee.
          </p>
        </section>
      </div>
    </div>
  );
}
