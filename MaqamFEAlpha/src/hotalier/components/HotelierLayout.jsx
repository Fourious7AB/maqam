import { useState } from "react";
import { Outlet } from "react-router-dom";

import { HotelierProvider } from "./HotelierDataContext";
import HotelierSidebar from "./HotelierSidebar";
import HotelierHeader from "./HotelierHeader";

/**
 * Shell for the entire Hotelier Dashboard. This is a React Router *layout route*:
 * it renders the green sidebar + "Hotel Dashboard" header once, and swaps the
 * body via <Outlet /> as you move between screens.
 *
 * Crucially, the HotelierProvider wraps everything here, so the rooms / cars /
 * bookings persist while you navigate — a room added on "Add Room" immediately
 * shows up on "Room Availability".
 */
export default function HotelierLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <HotelierProvider>
      <div className="min-h-screen bg-[#eef5f1] text-slate-900">
        <div className="flex min-h-screen">
          <HotelierSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex min-w-0 flex-1 flex-col">
            <HotelierHeader onMenu={() => setSidebarOpen(true)} />

            <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-5 p-3 sm:p-5 lg:p-7">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </HotelierProvider>
  );
}
