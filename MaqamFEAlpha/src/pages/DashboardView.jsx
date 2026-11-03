import React, { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import StatCards from "../components/dashboard/StatCards";
import ManagementGrid from "../components/dashboard/ManagementGrid";
import PricingOverview from "../components/dashboard/PricingOverview";
import RecentBookings from "../components/dashboard/RecentBookings";
import RevenueOverview from "../components/dashboard/RevenueOverview";
import TopDestinations from "../components/dashboard/TopDestinations";
import QuickActions from "../components/dashboard/QuickActions";

export default function DashboardView() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="min-w-0 flex-1">
          <Header onMenu={() => setSidebarOpen(true)} />

          <main className="mx-auto w-full max-w-[1550px] space-y-4 p-3 sm:p-4 lg:p-6">
            <StatCards />

            <ManagementGrid />

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <PricingOverview />
              <RecentBookings />
              <RevenueOverview />
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <QuickActions />
              </div>

              <div className="lg:col-span-4">
                <TopDestinations />
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
