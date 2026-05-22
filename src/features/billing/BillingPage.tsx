import { ReceiptText } from "lucide-react";
import { SectionHeader } from "../../components/SectionHeader";
import { WorkList } from "../../components/WorkList";
import { commercialBacklog } from "../../data/modules";

export function BillingPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Ventes et achats"
        title="Tiers, factures et pieces"
        description="Le module reliera clients, fournisseurs, pieces justificatives, paiements et generation automatique d'ecritures."
      />
      <WorkList title="Flux commerciaux a brancher" items={commercialBacklog} icon={ReceiptText} />
    </div>
  );
}
