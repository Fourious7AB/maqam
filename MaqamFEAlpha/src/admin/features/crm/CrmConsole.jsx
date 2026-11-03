import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  UsersRound,
  Hotel,
  Boxes,
  Package,
  CalendarDays,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import DataSourceBadge from "../../components/common/DataSourceBadge";
import OverviewSection from "./sections/OverviewSection";
import LeadsSection from "./sections/LeadsSection";
import HotelsSection from "./sections/HotelsSection";
import HotelStockSection from "./sections/HotelStockSection";
import PackagesSection from "./sections/PackagesSection";
import BookingsSection from "./sections/BookingsSection";
import StaffSection from "./sections/StaffSection";
import CustomersSection from "./sections/CustomersSection";

// CRM workspace: one page, one active section. The URL picks the panel
// (/admin/crm/overview, /admin/crm/leads, /admin/crm/stock, ...) so links
// are shareable and the browser back button works.
// mock: whether the section's data source has a mock branch (follows
// VITE_USE_MOCK_API). crmApi-only sections are always live.
const sections = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, component: OverviewSection, hint: "CRM operations pulse & analytics", mock: false },
  { key: "leads", label: "Leads", icon: UsersRound, component: LeadsSection, hint: "Sales pipeline", mock: false },
  { key: "customers", label: "Customers", icon: UserRound, component: CustomersSection, hint: "Customer 360° & travellers", mock: false },
  { key: "hotels", label: "Hotels", icon: Hotel, component: HotelsSection, hint: "Catalogue & tie-ups", mock: false },
  { key: "stock", label: "Hotel Stock", icon: Boxes, component: HotelStockSection, hint: "Wholesale batches", mock: false },
  { key: "packages", label: "Packages", icon: Package, component: PackagesSection, hint: "Catalogue & direct bookings", mock: true },
  { key: "bookings", label: "Bookings", icon: CalendarDays, component: BookingsSection, hint: "Operate package bookings", mock: false },
  { key: "staff", label: "Users & Roles", icon: ShieldCheck, component: StaffSection, hint: "CRM users & roles", mock: false },
];

export default function CrmConsole() {
  const { section } = useParams();
  const active = sections.some((s) => s.key === section) ? section : "overview";

  // Panels load their data once, the first time they are opened. Opened
  // panels stay mounted (hidden when inactive), so switching tabs never
  // re-fetches. Data refreshes only after a mutation or manual refresh.
  const [opened, setOpened] = useState(() => new Set([active]));
  if (!opened.has(active)) {
    setOpened((previous) => {
      const next = new Set(previous);
      next.add(active);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="CRM"
        subtitle="Leads, catalogue, wholesale stock, package bookings and roles — one workspace."
        actions={<DataSourceBadge mockCapable={sections.find((s) => s.key === active)?.mock} />}
      />

      <nav className="flex flex-wrap gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.key;
          return (
            <NavLink
              key={s.key}
              to={`/admin/crm/${s.key}`}
              title={s.hint}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon size={16} />
              {s.label}
            </NavLink>
          );
        })}
      </nav>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6">
        {sections
          .filter((s) => opened.has(s.key))
          .map((s) => {
            const Component = s.component;
            const isActive = active === s.key;
            return (
              <div key={s.key} className={isActive ? "animate-slide-in" : "hidden"}>
                <Component />
              </div>
            );
          })}
      </section>
    </div>
  );
}
