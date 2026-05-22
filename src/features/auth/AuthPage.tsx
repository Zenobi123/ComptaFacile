import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function AuthPage() {
  const sampleValidation = loginSchema.safeParse({
    email: "admin@comptafacile.cm",
    password: "motdepasse",
  });

  return (
    <main className="min-h-screen bg-ink px-5 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8ed7cb]">
            ComptaFacile
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-normal md:text-6xl">
            Connexion au socle comptable OHADA
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/68">
            Authentification prevue pour Supabase Auth, roles par entreprise et isolation stricte des donnees.
          </p>
        </section>
        <section className="rounded-lg bg-white p-6 text-ink shadow-soft">
          <h2 className="text-xl font-semibold">Acces utilisateur</h2>
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink/70">Email</span>
              <input className="mt-2 w-full rounded-md border border-line px-3 py-3 outline-none focus:border-ledger" placeholder="admin@entreprise.cm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink/70">Mot de passe</span>
              <input className="mt-2 w-full rounded-md border border-line px-3 py-3 outline-none focus:border-ledger" type="password" placeholder="Minimum 8 caracteres" />
            </label>
            <button className="w-full rounded-md bg-ledger px-4 py-3 font-semibold text-white transition hover:bg-ink">
              Se connecter
            </button>
            <p className="text-xs leading-5 text-ink/50">
              Validation formulaire prete avec Zod : {sampleValidation.success ? "schema actif" : "schema a corriger"}.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
