import { motion } from "framer-motion";
import { Menu, Search, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { navItems } from "../data/modules";
import { cn } from "../lib/utils";

export function AppShell() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-[#fbfaf6] px-5 py-6 lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-white">
            CF
          </div>
          <div>
            <p className="text-lg font-semibold leading-none">ComptaFacile</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink/45">
              OHADA Cameroun
            </p>
          </div>
        </div>

        <nav className="mt-10 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-ink text-white shadow-soft"
                    : "text-ink/68 hover:bg-white hover:text-ink",
                )
              }
            >
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 rounded-lg border border-line bg-white/70 p-4">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <ShieldCheck className="text-ledger" size={18} aria-hidden="true" />
            Donnees isolees
          </div>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Socle prepare pour Supabase RLS, audit logs et permissions par tenant.
          </p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/90 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setIsMobileNavOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white"
                aria-label="Ouvrir la navigation"
                aria-expanded={isMobileNavOpen}
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <span className="font-semibold">ComptaFacile</span>
            </div>
            <div className="hidden min-w-0 max-w-md flex-1 items-center gap-3 rounded-md border border-line bg-white px-3 py-2 md:flex">
              <Search size={17} className="text-ink/45" aria-hidden="true" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
                placeholder="Rechercher une entreprise, un journal, une declaration"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full bg-ledger/10 px-3 py-1 text-xs font-semibold text-ledger sm:inline-flex">
                MVP en initialisation
              </span>
              <div className="h-10 w-10 rounded-full bg-ink text-center text-sm font-semibold leading-10 text-white">
                NO
              </div>
            </div>
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="px-5 py-8 md:px-8"
        >
          <Outlet />
        </motion.main>
      </div>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-ink/28"
            aria-label="Fermer la navigation"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative h-full w-[min(22rem,88vw)] border-r border-line bg-[#fbfaf6] px-5 py-6 shadow-soft"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-white">
                  CF
                </div>
                <div>
                  <p className="text-lg font-semibold leading-none">ComptaFacile</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink/45">
                    OHADA Cameroun
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileNavOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white"
                aria-label="Fermer la navigation"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-9 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-ink text-white shadow-soft"
                        : "text-ink/68 hover:bg-white hover:text-ink",
                    )
                  }
                >
                  <item.icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </motion.aside>
        </div>
      ) : null}
    </div>
  );
}
