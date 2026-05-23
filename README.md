# ComptaFacile

Socle web React/TypeScript pour un SaaS comptable OHADA destine aux entreprises camerounaises.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- React Router
- Supabase client pret a configurer
- Supabase PostgreSQL avec migrations SQL et Row Level Security
- Netlify hosting + Netlify Functions

## Demarrage local

```powershell
npm.cmd install
npm.cmd run dev
```

## Build Netlify

```powershell
npm.cmd run build
```

La configuration Netlify est dans `netlify.toml` :

- build command : `npm run build`
- publish directory : `dist`
- redirection SPA vers `/index.html`
- fonction de sante : `netlify/functions/health.ts`

## Variables d'environnement

Copier `.env.example` vers `.env.local` et renseigner :

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Ne jamais commiter les valeurs reelles de Supabase. Les cles privees, service role keys et secrets de paiement doivent rester hors du depot.

## Socle Supabase

Le dossier `supabase/migrations` contient la base multi-tenant initiale du SaaS :

- profils utilisateurs et tenants ;
- appartenances, roles et statuts d'acces ;
- entreprises, profils fiscaux, exercices et periodes ;
- classes comptables OHADA minimales, comptes d'entreprise, journaux, ecritures et lignes ;
- journal d'audit.

La migration active RLS sur les tables sensibles et ajoute des fonctions SQL internes pour verifier l'appartenance a un tenant, les roles autorises et l'acces super administrateur SaaS.

### Prerequis local

Installer Supabase CLI puis connecter le projet si necessaire :

```powershell
supabase login
supabase init
supabase link --project-ref <project-ref>
```

Pour appliquer les migrations sur une base locale Supabase :

```powershell
supabase start
supabase db reset
```

Pour pousser les migrations vers un projet Supabase lie :

```powershell
supabase db push
```

### Regles RLS attendues

- Un utilisateur authentifie ne lit que les donnees des tenants dont il est membre actif.
- Un utilisateur non membre ne doit voir aucune ligne d'un autre tenant.
- Les roles lecture seule, comme auditeur, ne doivent pas modifier les ecritures.
- Les ecritures validees ou contre-passees ne doivent pas etre modifiees directement.
- Les lignes d'ecriture doivent porter soit un debit positif, soit un credit positif, jamais les deux.
- Les donnees comptables doivent rester coherentes entre `tenant_id`, `company_id`, `fiscal_year_id` et les periodes.

## Modules MVP

- Authentification
- Tableau de bord
- Comptabilite OHADA
- Ventes et achats
- Tresorerie
- Fiscalite et DSF
- Abonnements
- Administration SaaS
