import { Scale } from "lucide-react";
import { SectionHeader } from "../../components/SectionHeader";
import { WorkList } from "../../components/WorkList";
import { taxBacklog } from "../../data/modules";

export function TaxPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Fiscalite"
        title="Regles fiscales et DSF preparatoire"
        description="Les obligations camerounaises seront gerees par parametrage versionne afin de suivre les changements annuels."
      />
      <WorkList title="Chantiers fiscalite et DSF" items={taxBacklog} icon={Scale} />
    </div>
  );
}
