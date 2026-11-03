import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { useThemeStore } from "../../store/themeStore";

import Sidebar from "./Sidebar";
import Header from "./Header";
import Breadcrumbs from "./Breadcrumbs";

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const { pathname } = useLocation();
  const isDashboard = pathname === "/admin/dashboard";

  return (
    <div className={`flex min-h-screen bg-[#f5f8f6] text-slate-900 dark:bg-slate-950 dark:text-slate-100 ${theme === "dark" ? "dark" : ""}`}>
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden"
        />
      )}

      <div className="min-w-0 flex-1">
        <Header
          dashboard={isDashboard}
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className={`p-4 sm:p-6 ${isDashboard ? "pt-0 sm:pt-0" : ""}`}>
          {!isDashboard && <Breadcrumbs />}

          <Outlet />
        </main>
      </div>
    </div>
  );
}
