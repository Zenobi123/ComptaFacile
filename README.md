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

## Validation Supabase locale

La validation complete des migrations et des politiques RLS necessite Docker Desktop et le CLI Supabase installe dans les dependances du projet.

```powershell
npm.cmd install
npm.cmd run supabase:start
npm.cmd run supabase:reset
npm.cmd run verify:supabase
```

Les scripts disponibles sont :

- `npm.cmd run supabase:start` : demarre la stack Supabase locale.
- `npm.cmd run supabase:reset` : recree la base locale et applique toutes les migrations.
- `npm.cmd run supabase:status` : affiche les URLs et cles locales.
- `npm.cmd run verify:supabase` : execute un smoke test Auth, onboarding, comptabilite, ventes, tresorerie, fiscalite et isolation RLS.

Si Docker Desktop n'est pas disponible, utiliser un projet Supabase Cloud de test, jamais la production :

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref <project-ref-test>
npx.cmd supabase db push
npm.cmd run verify:supabase
```

Dans ce cas, renseigner `.env.local` avec l'URL et la cle anon du projet de test. Les confirmations email doivent etre desactivees pour les utilisateurs de verification, ou les deux utilisateurs de test doivent etre precrees.

## Build Netlify

```powershell
npm.cmd run build
```

La configuration Netlify est dans `netlify.toml` :

- build command : `npm run build`
- publish directory : `dist`
- redirection SPA vers `/index.html`
- fonction de sante : `netlify/functions/health.ts`

## CI GitHub

Le workflow `.github/workflows/ci.yml` s'execute sur les pull requests, les push vers `main` et les branches `feature/**`, ainsi qu'en lancement manuel.

Il verifie :

- installation reproductible avec `npm ci` ;
- build frontend avec `npm run build` ;
- disponibilite du CLI Supabase avec `npx supabase --version` ;
- smoke test Supabase avec `npm run verify:supabase` si les secrets de verification sont configures.

Secrets GitHub attendus pour activer le smoke test Supabase dans la CI :

```text
SUPABASE_VERIFY_URL
SUPABASE_VERIFY_ANON_KEY
SUPABASE_VERIFY_USER_EMAIL
SUPABASE_VERIFY_USER_PASSWORD
SUPABASE_VERIFY_INTRUDER_EMAIL
SUPABASE_VERIFY_INTRUDER_PASSWORD
```

Si `SUPABASE_VERIFY_URL` ou `SUPABASE_VERIFY_ANON_KEY` est absent, le workflow saute uniquement le smoke test Supabase et conserve les controles de build. Utiliser un projet Supabase Cloud dedie a la verification, jamais la production.

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

Une fonction RPC `create_company_onboarding` initialise le premier dossier d'une entreprise en une transaction :

- tenant et appartenance `admin_entreprise` de l'utilisateur connecte ;
- entreprise et profil fiscal ;
- exercice ouvert et periodes mensuelles ;
- journaux standards ;
- entree d'audit.

Une fonction RPC `create_journal_entry` cree une ecriture comptable avec lignes en controlant cote serveur :

- appartenance et role autorise sur le tenant ;
- periode ouverte ou en revue ;
- journal actif ;
- comptes actifs ;
- debit total egal au credit total ;
- au moins deux lignes.

Une fonction RPC `get_accounting_snapshot` alimente les premieres vues de consultation :

- dernieres ecritures de l'exercice avec leurs lignes ;
- balance de travail par compte, hors brouillons ;
- controle d'appartenance au tenant avant lecture.

Le module commercial ajoute les fondations ventes :

- clients dans `third_parties` ;
- factures et lignes de vente ;
- RPC `create_sales_invoice` pour creer une facture avec totalisation serveur ;
- RPC `get_billing_snapshot` pour les clients, dernieres factures et indicateurs de vente.

Le module tresorerie ajoute :

- comptes banque, caisse et mobile money ;
- mouvements entrants et sortants ;
- RPC `create_treasury_transaction` avec controles de role et montant positif ;
- RPC `get_treasury_snapshot` pour les soldes et derniers mouvements.

Le module fiscalite ajoute :

- declarations fiscales par exercice ;
- suivi echeance, statut, montant et notes ;
- RPC `create_tax_declaration` avec controles de role ;
- RPC `get_tax_snapshot` pour calendrier fiscal et indicateurs.

### Prerequis local

Installer Supabase CLI puis connecter le projet si necessaire :

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref <project-ref>
```

Pour appliquer les migrations sur une base locale Supabase :

```powershell
npm.cmd run supabase:start
npm.cmd run supabase:reset
```

Pour pousser les migrations vers un projet Supabase lie :

```powershell
npx.cmd supabase db push
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
- Onboarding entreprise
- Tableau de bord
- Comptabilite OHADA
- Ventes et achats
- Tresorerie
- Fiscalite et DSF
- Abonnements
- Administration SaaS
