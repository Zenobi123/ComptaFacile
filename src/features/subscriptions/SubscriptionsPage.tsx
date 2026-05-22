import { CreditCard } from "lucide-react";
import { SectionHeader } from "../../components/SectionHeader";
import { planMatrix } from "../../data/modules";

export function SubscriptionsPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Abonnements"
        title="Plans, limites et cycle de vie client"
        description="Les offres activent des modules et imposent des limites par entreprise, utilisateurs, stockage et exports."
      />
      <section className="overflow-hidden rounded-lg border border-line bg-white/70 shadow-soft">
        <div className="flex items-center gap-3 border-b border-line px-6 py-5">
          <CreditCard className="text-ledger" size={20} aria-hidden="true" />
          <h2 className="text-lg font-semibold text-ink">Matrice commerciale initiale</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-ink/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Offre</th>
                <th className="px-6 py-4 font-semibold">Cible</th>
                <th className="px-6 py-4 font-semibold">Modules</th>
                <th className="px-6 py-4 font-semibold">Limites</th>
              </tr>
            </thead>
            <tbody>
              {planMatrix.map((plan) => (
                <tr key={plan.plan} className="border-t border-line">
                  <td className="px-6 py-4 font-semibold text-ink">{plan.plan}</td>
                  <td className="px-6 py-4 text-ink/65">{plan.target}</td>
                  <td className="px-6 py-4 text-ink/65">{plan.modules}</td>
                  <td className="px-6 py-4 text-ink/65">{plan.limit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
