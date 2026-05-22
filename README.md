# ComptaFacile

Socle web React/TypeScript pour un SaaS comptable OHADA destine aux entreprises camerounaises.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- React Router
- Supabase client pret a configurer
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

## Modules MVP

- Authentification
- Tableau de bord
- Comptabilite OHADA
- Ventes et achats
- Tresorerie
- Fiscalite et DSF
- Abonnements
- Administration SaaS
