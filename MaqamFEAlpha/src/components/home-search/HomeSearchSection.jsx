import { createElement, useState } from "react";
import { Building2, Plane } from "lucide-react";
import CommonFlightHotelSearchBox from "../commonflighthotelsearchbox/CommonFlightHotelSearchBox";
import HotelSearch from "../../pages/HotelSearch";

const SERVICES = [
  { id: "flight", label: "Flights", Icon: Plane },
  { id: "hotel", label: "Hotels", Icon: Building2 },
];

export default function HomeSearchSection() {
  const [activeService, setActiveService] = useState("flight");
  const [selectedFare, setSelectedFare] = useState("Regular Fare");

  const changeService = (service) => {
    setActiveService(service);
  };

  const handleTabKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = SERVICES.findIndex(({ id }) => id === activeService);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? SERVICES.length - 1
          : (currentIndex + (event.key === "ArrowRight" ? 1 : SERVICES.length - 1)) %
            SERVICES.length;
    const nextService = SERVICES[nextIndex];
    changeService(nextService.id);
    document.getElementById(`home-search-tab-${nextService.id}`)?.focus();
  };

  return (
    <section
      className="relative z-30 mx-auto -mt-16 sm:-mt-20 lg:-mt-24 mb-6 sm:mb-8 lg:mb-10 w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 xl:px-12 font-poppins"
      aria-label="Search flights and hotels"
    >
      <div className="relative rounded-2xl sm:rounded-3xl border border-white/40 dark:border-white/15 bg-white/25 dark:bg-slate-900/45 backdrop-blur-xl p-3 sm:p-3.5 lg:p-4 shadow-[0_16px_36px_rgba(15,23,42,0.18)] transition-all">
        {/* Top-Left Pill Service Switcher */}
        <div className="mb-2.5 sm:mb-3 flex items-center justify-start">
          <div
            className="inline-flex w-full sm:w-auto items-center gap-1 rounded-full bg-white/50 dark:bg-slate-800/80 backdrop-blur-md p-1 border border-white/45 dark:border-white/15 shadow-2xs"
            role="tablist"
            aria-label="Choose a travel service"
            onKeyDown={handleTabKeyDown}
          >
            {SERVICES.map(({ id, label, Icon }) => {
              const selected = activeService === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`home-search-tab-${id}`}
                  aria-selected={selected}
                  aria-controls={`home-search-panel-${id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => changeService(id)}
                  className={`inline-flex min-h-8 sm:min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-4 sm:px-5 py-1.5 text-xs font-semibold transition-all duration-200 sm:flex-none cursor-pointer ${
                    selected
                      ? "bg-[#045C45] text-white shadow-sm"
                      : "text-slate-800 hover:text-slate-950 hover:bg-white/40 dark:text-slate-200 dark:hover:text-white"
                  }`}
                >
                  {createElement(Icon, { className: "h-3.5 w-3.5 shrink-0", "aria-hidden": true })}{" "}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Flights */}
        <div
          id="home-search-panel-flight"
          role="tabpanel"
          aria-labelledby="home-search-tab-flight"
          tabIndex={0}
          hidden={activeService !== "flight"}
        >
          {activeService === "flight" && (
            <CommonFlightHotelSearchBox
              embedded
              selectedFare={selectedFare}
              setSelectedFare={setSelectedFare}
            />
          )}
        </div>

        {/* Tab 2: Hotels */}
        <div
          id="home-search-panel-hotel"
          role="tabpanel"
          aria-labelledby="home-search-tab-hotel"
          tabIndex={0}
          hidden={activeService !== "hotel"}
        >
          {activeService === "hotel" && <HotelSearch embedded />}
        </div>
      </div>
    </section>
  );
}
