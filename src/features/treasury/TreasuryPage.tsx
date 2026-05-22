import { Landmark } from "lucide-react";
import { SectionHeader } from "../../components/SectionHeader";
import { WorkList } from "../../components/WorkList";
import { treasuryBacklog } from "../../data/modules";

export function TreasuryPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Tresorerie"
        title="Banques, caisses et mobile money"
        description="Le socle prevoit des comptes de tresorerie par entreprise, site, devise et role utilisateur."
      />
      <WorkList title="Controles de tresorerie MVP" items={treasuryBacklog} icon={Landmark} />
    </div>
  );
}
