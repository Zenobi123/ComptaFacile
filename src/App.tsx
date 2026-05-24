import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AccountingPage } from "./features/accounting/AccountingPage";
import { AdminPage } from "./features/admin/AdminPage";
import { AuthPage } from "./features/auth/AuthPage";
import { useAuth } from "./features/auth/AuthProvider";
import { BillingPage } from "./features/billing/BillingPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { OnboardingPage } from "./features/onboarding/OnboardingPage";
import { SubscriptionsPage } from "./features/subscriptions/SubscriptionsPage";
import { TaxPage } from "./features/tax/TaxPage";
import { TreasuryPage } from "./features/treasury/TreasuryPage";

function ProtectedShell() {
  const { isConfigured, isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-5 text-ink">
        <div className="rounded-lg border border-line bg-white p-6 text-sm font-semibold shadow-soft">
          Initialisation de la session
        </div>
      </main>
    );
  }

  if (isConfigured && !session) {
    return <Navigate to="/connexion" replace />;
  }

  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<AuthPage />} />
      <Route element={<ProtectedShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="comptabilite" element={<AccountingPage />} />
        <Route path="ventes-achats" element={<BillingPage />} />
        <Route path="tresorerie" element={<TreasuryPage />} />
        <Route path="fiscalite" element={<TaxPage />} />
        <Route path="abonnements" element={<SubscriptionsPage />} />
        <Route path="administration" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
