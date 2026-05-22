import {
  BadgeCheck,
  Banknote,
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  Files,
  Gauge,
  Landmark,
  LockKeyhole,
  ReceiptText,
  Scale,
  Settings2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ModuleKey =
  | "dashboard"
  | "accounting"
  | "billing"
  | "treasury"
  | "tax"
  | "subscriptions"
  | "admin";

export type NavItem = {
  key: ModuleKey;
  label: string;
  path: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { key: "dashboard", label: "Tableau de bord", path: "/", icon: Gauge },
  {
    key: "accounting",
    label: "Comptabilite",
    path: "/comptabilite",
    icon: BookOpenCheck,
  },
  { key: "billing", label: "Ventes et achats", path: "/ventes-achats", icon: ReceiptText },
  { key: "treasury", label: "Tresorerie", path: "/tresorerie", icon: Landmark },
  { key: "tax", label: "Fiscalite et DSF", path: "/fiscalite", icon: Scale },
  {
    key: "subscriptions",
    label: "Abonnements",
    path: "/abonnements",
    icon: CreditCard,
  },
  { key: "admin", label: "Administration", path: "/administration", icon: Settings2 },
];

export const readinessMetrics = [
  { label: "Entreprises actives", value: "12", change: "+3 ce mois" },
  { label: "Ecritures a valider", value: "48", change: "6 journaux" },
  { label: "Echeances fiscales", value: "7", change: "30 prochains jours" },
  { label: "Exports prets", value: "5", change: "Balance, GL, DSF" },
];

export const operationalChecks = [
  {
    title: "Isolation multi-tenant",
    status: "Socle",
    detail: "Les tables metier devront porter tenant_id et etre protegees par RLS.",
    icon: LockKeyhole,
  },
  {
    title: "Ecritures equilibrees",
    status: "Regle",
    detail: "La validation debit = credit sera traitee cote serveur avant cloture.",
    icon: BadgeCheck,
  },
  {
    title: "Parametrage fiscal",
    status: "Versionne",
    detail: "Les taux et echeances resteront configurables par exercice.",
    icon: CalendarClock,
  },
  {
    title: "Audit trail",
    status: "Obligatoire",
    detail: "Les actions sensibles alimenteront un journal non destructif.",
    icon: ShieldCheck,
  },
];

export const accountingBacklog = [
  "Plan comptable OHADA avec sous-comptes par entreprise",
  "Journaux, exercices, periodes et numerotation automatique",
  "Saisie d'ecritures brouillon, validation, rejet et contrepassation",
  "Balance, journal general et grand livre filtrables",
];

export const commercialBacklog = [
  "Clients, fournisseurs et tiers administratifs",
  "Factures de ventes, achats et pieces justificatives",
  "Encaissements, paiements et suivi des creances",
  "Exports PDF et Excel pour dossiers comptables",
];

export const treasuryBacklog = [
  "Banques, caisses et mobile money par site",
  "Mouvements de tresorerie autorises par role",
  "Rapprochement simple et alertes de solde",
  "Vue consolidee par entreprise et exercice",
];

export const taxBacklog = [
  "Regles fiscales versionnees par exercice",
  "Calendrier des declarations et alertes",
  "Cartographie comptes OHADA vers rubriques DSF",
  "Export preparatoire DSF, PDF et Excel",
];

export const planMatrix = [
  {
    plan: "Essentiel",
    target: "TPE",
    modules: "Comptabilite de base, caisse, banque",
    limit: "1 entreprise, 2 utilisateurs",
  },
  {
    plan: "Standard",
    target: "PME",
    modules: "Facturation, achats, taxes, documents",
    limit: "1 entreprise, 5 utilisateurs",
  },
  {
    plan: "Professionnel",
    target: "PME structuree",
    modules: "DSF, immobilisations, stocks, analyses",
    limit: "1 entreprise, 10 utilisateurs",
  },
  {
    plan: "Cabinet",
    target: "Experts comptables",
    modules: "Portail cabinet, dossiers clients, collaboration",
    limit: "Portefeuille multi-entreprises",
  },
];

export const adminTracks = [
  { label: "Tenants", value: "Cabinets, entreprises et associations", icon: Building2 },
  { label: "Utilisateurs", value: "Roles, permissions et invitations", icon: UsersRound },
  { label: "Documents", value: "Pieces, exports et archivage", icon: Files },
  { label: "Rapports", value: "Balance, grand livre, DSF", icon: FileSpreadsheet },
  { label: "Support", value: "Demandes, priorites et historique", icon: ClipboardList },
  { label: "Paiements", value: "Stripe maintenant, mobile money plus tard", icon: Banknote },
  { label: "Pilotage", value: "Usage, limites et abonnements", icon: BarChart3 },
];
