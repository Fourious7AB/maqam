import React, { useEffect } from "react";
import { X, Plane } from "lucide-react";
import DigitalBoardingPass from "./DigitalBoardingPass";

export default function BoardingPassModal({
  isOpen,
  onClose,
  booking,
  passengers,
  flight,
  pnr,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 my-8 border border-slate-100 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2 text-[#011B94]">
            <Plane className="w-5 h-5" />
            <h3 className="text-lg font-black tracking-tight text-slate-900">
              Official Digital Boarding Pass
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Boarding Pass Component */}
        <DigitalBoardingPass
          booking={booking}
          passengers={passengers}
          flight={flight}
          pnr={pnr}
          showActions={true}
        />
      </div>
    </div>
  );
}
