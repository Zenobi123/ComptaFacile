import { ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "./AuthProvider";

const authSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Minimum 8 caracteres"),
  fullName: z.string().optional(),
});

type AuthMode = "sign-in" | "sign-up";

export function AuthPage() {
  const navigate = useNavigate();
  const { isConfigured, isLoading, session, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = mode === "sign-in" ? "Connexion" : "Creation du compte";
  const actionLabel = mode === "sign-in" ? "Se connecter" : "Creer le compte";

  const validation = useMemo(
    () =>
      authSchema.safeParse({
        email,
        password,
        fullName,
      }),
    [email, fullName, password],
  );

  useEffect(() => {
    setFeedback(null);
  }, [mode]);

  if (!isLoading && session) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!validation.success) {
      setFeedback(validation.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }

    if (mode === "sign-up" && fullName.trim().length < 2) {
      setFeedback("Le nom complet est requis pour creer un compte.");
      return;
    }

    setIsSubmitting(true);

    const result =
      mode === "sign-in"
        ? await signIn(email, password)
        : await signUp(email, password, fullName.trim());

    setIsSubmitting(false);

    if (result.error) {
      setFeedback(result.error);
      return;
    }

    navigate(mode === "sign-up" ? "/onboarding" : "/", { replace: true });
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8ed7cb]">
            ComptaFacile
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-normal md:text-6xl">
            Acces securise au dossier OHADA
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/68">
            Connexion Supabase Auth, profil utilisateur et parcours de creation d'entreprise.
          </p>
          <div className="mt-8 flex max-w-xl gap-4 rounded-lg border border-white/10 bg-white/6 p-4 text-sm leading-6 text-white/70">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#8ed7cb]" size={20} aria-hidden="true" />
            <p>
              Les donnees metier restent filtrees par tenant et role des que Supabase est configure.
            </p>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 text-ink shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              type="button"
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-ledger hover:text-ledger"
            >
              {mode === "sign-in" ? "Nouveau compte" : "Deja inscrit"}
            </button>
          </div>

          {!isConfigured ? (
            <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Supabase n'est pas encore configure. Le tableau de bord reste accessible en mode apercu.
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <label className="block">
                <span className="text-sm font-medium text-ink/70">Nom complet</span>
                <input
                  className="mt-2 w-full rounded-md border border-line px-3 py-3 outline-none focus:border-ledger"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Nathan OBIANG TIME"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-ink/70">Email</span>
              <input
                className="mt-2 w-full rounded-md border border-line px-3 py-3 outline-none focus:border-ledger"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@entreprise.cm"
                type="email"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink/70">Mot de passe</span>
              <input
                className="mt-2 w-full rounded-md border border-line px-3 py-3 outline-none focus:border-ledger"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Minimum 8 caracteres"
              />
            </label>

            {feedback ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {feedback}
              </p>
            ) : null}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-md bg-ledger px-4 py-3 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || isLoading || !isConfigured}
            >
              {isSubmitting ? "Traitement..." : actionLabel}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          {!isConfigured ? (
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-3 w-full rounded-md border border-line px-4 py-3 font-semibold text-ink transition hover:border-ledger hover:text-ledger"
            >
              Continuer en apercu
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}
