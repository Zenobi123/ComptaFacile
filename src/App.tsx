import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AccountingPage } from "./features/accounting/AccountingPage";
import { AdminPage } from "./features/admin/AdminPage";
import { AuthPage } from "./features/auth/AuthPage";
import { BillingPage } from "./features/billing/BillingPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { SubscriptionsPage } from "./features/subscriptions/SubscriptionsPage";
import { TaxPage } from "./features/tax/TaxPage";
import { TreasuryPage } from "./features/treasury/TreasuryPage";

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<AuthPage />} />
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
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
