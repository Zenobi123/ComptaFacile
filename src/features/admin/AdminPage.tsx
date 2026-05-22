import { SectionHeader } from "../../components/SectionHeader";
import { adminTracks } from "../../data/modules";
import { isSupabaseConfigured } from "../../lib/supabase";

export function AdminPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Administration"
        title="Console SaaS et parametres techniques"
        description="Cette console centralisera tenants, roles, plans, sources fiscales, exports et support client."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminTracks.map((track) => (
          <div key={track.label} className="rounded-lg border border-line bg-white/70 p-5 shadow-soft">
            <track.icon className="text-ledger" size={22} aria-hidden="true" />
            <h2 className="mt-4 font-semibold text-ink">{track.label}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/62">{track.value}</p>
          </div>
        ))}
      </section>
      <section className="rounded-lg border border-line bg-ink p-6 text-white shadow-soft">
        <h2 className="text-lg font-semibold">Configuration Supabase</h2>
        <p className="mt-2 text-sm leading-6 text-white/68">
          Statut actuel : {isSupabaseConfigured ? "variables renseignees" : "variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY a renseigner"}.
        </p>
      </section>
    </div>
  );
}
