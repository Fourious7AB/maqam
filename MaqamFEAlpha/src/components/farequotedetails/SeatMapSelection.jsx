import { useState, useMemo, useEffect } from "react";
import { ChevronDown, Armchair, X, RotateCcw, UserPlus, Plus } from "lucide-react";

// Distinct color themes for multiple passengers
const PAX_THEMES = [
  {
    name: "Blue",
    activeBtn: "bg-blue-600 text-white shadow-md ring-2 ring-blue-300",
    tabActive: "bg-blue-600 text-white shadow-md",
    badge: "bg-blue-600 text-white",
    seatClass: "bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-300 scale-105",
    chipClass: "bg-blue-50 border-blue-200 text-blue-800",
    dotClass: "bg-blue-600",
  },
  {
    name: "Emerald",
    activeBtn: "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300",
    tabActive: "bg-emerald-600 text-white shadow-md",
    badge: "bg-emerald-600 text-white",
    seatClass: "bg-emerald-600 border-emerald-600 text-white shadow-md ring-2 ring-emerald-300 scale-105",
    chipClass: "bg-emerald-50 border-emerald-200 text-emerald-800",
    dotClass: "bg-emerald-600",
  },
  {
    name: "Purple",
    activeBtn: "bg-purple-600 text-white shadow-md ring-2 ring-purple-300",
    tabActive: "bg-purple-600 text-white shadow-md",
    badge: "bg-purple-600 text-white",
    seatClass: "bg-purple-600 border-purple-600 text-white shadow-md ring-2 ring-purple-300 scale-105",
    chipClass: "bg-purple-50 border-purple-200 text-purple-800",
    dotClass: "bg-purple-600",
  },
  {
    name: "Amber",
    activeBtn: "bg-amber-600 text-white shadow-md ring-2 ring-amber-300",
    tabActive: "bg-amber-600 text-white shadow-md",
    badge: "bg-amber-600 text-white",
    seatClass: "bg-amber-600 border-amber-600 text-white shadow-md ring-2 ring-amber-300 scale-105",
    chipClass: "bg-amber-50 border-amber-200 text-amber-800",
    dotClass: "bg-amber-600",
  },
  {
    name: "Rose",
    activeBtn: "bg-rose-600 text-white shadow-md ring-2 ring-rose-300",
    tabActive: "bg-rose-600 text-white shadow-md",
    badge: "bg-rose-600 text-white",
    seatClass: "bg-rose-600 border-rose-600 text-white shadow-md ring-2 ring-rose-300 scale-105",
    chipClass: "bg-rose-50 border-rose-200 text-rose-800",
    dotClass: "bg-rose-600",
  },
  {
    name: "Cyan",
    activeBtn: "bg-cyan-600 text-white shadow-md ring-2 ring-cyan-300",
    tabActive: "bg-cyan-600 text-white shadow-md",
    badge: "bg-cyan-600 text-white",
    seatClass: "bg-cyan-600 border-cyan-600 text-white shadow-md ring-2 ring-cyan-300 scale-105",
    chipClass: "bg-cyan-50 border-cyan-200 text-cyan-800",
    dotClass: "bg-cyan-600",
  },
];

const getPaxTheme = (paxIndex) => {
  return PAX_THEMES[paxIndex % PAX_THEMES.length];
};

// Standard realistic commercial aircraft seat layout fallback (A320/B737 layout)
const generateFallbackSeatLayout = () => {
  const rows = [];
  const seatLetters = ["A", "B", "C", "D", "E", "F"];

  for (let r = 1; r <= 22; r++) {
    const isExitRow = r === 12 || r === 13;
    const isFrontRow = r === 1;

    const seats = seatLetters.map((letter, idx) => {
      // Deterministic realistic booking pattern
      const isBooked = (r * 7 + idx * 3) % 5 === 0 && r > 2;
      const isAisle = letter === "C" || letter === "D";
      const isWindow = letter === "A" || letter === "F";

      let amount = 0;
      if (isFrontRow) amount = 750;
      else if (isExitRow) amount = 550;
      else if (r <= 5) amount = 350;
      else if (isWindow || isAisle) amount = r <= 10 ? 200 : 0;

      return {
        seatNumber: `${r}${letter}`,
        isBooked,
        isLegroom: isExitRow || isFrontRow,
        isAisle,
        isWindow,
        amount,
        code: `${r}${letter}`,
      };
    });

    rows.push({
      rowNumber: r,
      seats,
    });
  }

  return rows;
};

const SeatMapSelection = ({
  seatMapData,
  loading,
  passengerCount = 1,
  passengerList = [],
  onAddPassenger,
  onRemovePassenger,
  onSelectionChange,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedPaxIndex, setSelectedPaxIndex] = useState(0);

  // PaxIndex -> selected seat object { seatNumber, amount, code, ... }
  const [paxSeats, setPaxSeats] = useState({});

  const seatData = seatMapData?.data?.data || seatMapData?.data || seatMapData || {};
  const liveSeatLayout = seatData.seatLayout || [];
  const isAvailable =
    seatData.isAvailable !== false &&
    Array.isArray(liveSeatLayout) &&
    liveSeatLayout.length > 0;

  useEffect(() => {
    if (!isAvailable && Object.keys(paxSeats).length > 0) {
      setPaxSeats({});
      if (onSelectionChange) onSelectionChange({});
    }
  }, [isAvailable]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-200"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-40"></div>
            <div className="h-3 bg-gray-100 rounded w-60"></div>
          </div>
        </div>
        <div className="h-20 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">
          Checking live seat map with airline...
        </div>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  Seat Selection (Optional)
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Not available for this flight
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Seat assignment is managed directly by the airline at check-in at no extra charge. You may proceed directly to booking without selecting seats.
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shrink-0">
            Free Check-in Seating
          </div>
        </div>
      </div>
    );
  }

  const seatLayout = liveSeatLayout;

  const handleSeatClick = (seat) => {
    if (seat.isBooked) return; // Cannot select booked seats

    setPaxSeats((prev) => {
      // 1. If clicking current passenger's seat -> deselect it
      if (prev[selectedPaxIndex]?.seatNumber === seat.seatNumber) {
        const updated = { ...prev };
        delete updated[selectedPaxIndex];
        if (onSelectionChange) onSelectionChange(updated);
        return updated;
      }

      // 2. Check if seat is currently assigned to another passenger -> reassign
      const existingPaxIndex = Object.keys(prev).find(
        (key) => prev[key]?.seatNumber === seat.seatNumber
      );

      const updated = { ...prev };
      if (existingPaxIndex !== undefined) {
        delete updated[existingPaxIndex];
      }

      // Assign to currently active passenger
      updated[selectedPaxIndex] = seat;
      if (onSelectionChange) onSelectionChange(updated);

      // 3. Auto-advance to the next traveller without a seat
      const nextUnassignedIndex = Array.from({ length: passengerCount }).findIndex(
        (_, idx) => idx !== selectedPaxIndex && !updated[idx]
      );
      if (nextUnassignedIndex !== -1) {
        setSelectedPaxIndex(nextUnassignedIndex);
      }

      return updated;
    });
  };

  const handleRemoveSeat = (paxIdx, e) => {
    if (e) e.stopPropagation();
    setPaxSeats((prev) => {
      const updated = { ...prev };
      delete updated[paxIdx];
      if (onSelectionChange) onSelectionChange(updated);
      return updated;
    });
  };

  const handleClearAllSeats = () => {
    setPaxSeats({});
    if (onSelectionChange) onSelectionChange({});
  };

  const handleAddPassengerClick = (type = "ADULT") => {
    if (onAddPassenger) {
      onAddPassenger(type);
      setSelectedPaxIndex(passengerCount);
      setIsOpen(true);
    }
  };

  // Find which passenger (if any) owns this seat
  const getSeatOwner = (seat) => {
    const ownerIndex = Object.keys(paxSeats).find(
      (key) => paxSeats[key]?.seatNumber === seat.seatNumber
    );
    return ownerIndex !== undefined ? Number(ownerIndex) : null;
  };

  const totalSeatAmount = Object.values(paxSeats).reduce(
    (sum, seat) => sum + Number(seat?.amount || seat?.Amount || 0),
    0
  );

  const selectedCount = Object.keys(paxSeats).length;
  const activeTheme = getPaxTheme(selectedPaxIndex);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="bg-gray-50 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
            <Armchair className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                Select Your Seats
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                {selectedCount}/{passengerCount} Selected
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Pick preferred seats for all {passengerCount} traveller{passengerCount > 1 ? "s" : ""} (optional)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {totalSeatAmount > 0 && (
            <div className="bg-teal-50 border border-teal-200 text-teal-800 font-semibold px-3.5 py-1.5 rounded-lg text-xs sm:text-sm">
              Seats Total: ₹{totalSeatAmount.toLocaleString()}
            </div>
          )}

          {onAddPassenger && (
            <button
              type="button"
              onClick={() => handleAddPassengerClick("ADULT")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-teal-50 text-teal-700 font-bold text-xs sm:text-sm rounded-xl border border-teal-300 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Passenger</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <span>{isOpen ? "Hide Seats" : selectedCount > 0 ? "View Selected Seats" : "Select Seats"}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Selected Seats Preview Summary Strip */}
      {selectedCount > 0 && (
        <div className="px-6 py-3 bg-slate-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700">Assigned Seats:</span>
            {Array.from({ length: passengerCount }).map((_, idx) => {
              const seat = paxSeats[idx];
              if (!seat) return null;
              const theme = getPaxTheme(idx);
              const paxInfo = passengerList[idx];
              const paxDisplayName = paxInfo?.firstName
                ? `${paxInfo.title || ""} ${paxInfo.firstName} ${paxInfo.lastName || ""}`.trim()
                : `Passenger ${idx + 1}`;

              return (
                <div
                  key={idx}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-medium shadow-2xs ${theme.chipClass}`}
                >
                  <span className={`w-2 h-2 rounded-full ${theme.dotClass}`} />
                  <span>
                    {paxDisplayName}: <strong>{seat.seatNumber}</strong>{" "}
                    {seat.amount ? `(+₹${seat.amount})` : "(Free)"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveSeat(idx, e)}
                    className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition cursor-pointer text-gray-500 hover:text-gray-800"
                    title="Remove seat"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {isOpen && (
            <button
              type="button"
              onClick={handleClearAllSeats}
              className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 font-medium transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All Seats</span>
            </button>
          )}
        </div>
      )}

      {/* Expanded Seat Map Content */}
      {isOpen && (
        <div className="border-t border-gray-200 animate-in fade-in duration-200">
          {/* Passenger Switcher Tabs */}
          <div className="border-b border-gray-100 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                SELECT TRAVELLER TO ASSIGN SEAT:
              </span>
              <span className="text-xs text-gray-500 font-medium">
                Click any available seat below to assign to active passenger
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {Array.from({ length: passengerCount }).map((_, idx) => {
                const assignedSeat = paxSeats[idx];
                const isSelected = selectedPaxIndex === idx;
                const theme = getPaxTheme(idx);
                const paxInfo = passengerList[idx];
                const paxDisplayName = paxInfo?.firstName
                  ? `${paxInfo.firstName} ${paxInfo.lastName || ""}`.trim()
                  : `Passenger ${idx + 1}`;

                return (
                  <div
                    key={idx}
                    className={`inline-flex items-center rounded-xl border transition-all ${
                      isSelected
                        ? `${theme.tabActive} border-transparent shadow-md scale-[1.02]`
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPaxIndex(idx)}
                      className="px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                          isSelected ? "bg-white/25 text-white" : `${theme.badge}`
                        }`}
                      >
                        P{idx + 1}
                      </span>
                      <span>{paxDisplayName}</span>
                      {assignedSeat ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-green-100 text-green-800 border border-green-200"
                          }`}
                        >
                          {assignedSeat.seatNumber} ({assignedSeat.amount ? `+₹${assignedSeat.amount}` : "Free"})
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-normal italic ${
                            isSelected ? "text-white/80" : "text-gray-400"
                          }`}
                        >
                          (Click seat)
                        </span>
                      )}
                    </button>

                    {idx > 0 && onRemovePassenger && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePassenger(paxInfo?.id ?? idx);
                          if (selectedPaxIndex >= idx) {
                            setSelectedPaxIndex(Math.max(0, idx - 1));
                          }
                        }}
                        className={`pr-2.5 pl-1 py-2 text-xs transition cursor-pointer ${
                          isSelected ? "text-white/80 hover:text-white" : "text-gray-400 hover:text-red-600"
                        }`}
                        title="Remove this passenger"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add Passenger Button */}
              {onAddPassenger && (
                <button
                  type="button"
                  onClick={() => handleAddPassengerClick("ADULT")}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-teal-50 text-teal-800 border-2 border-dashed border-teal-400 hover:bg-teal-100 hover:border-teal-600 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <UserPlus className="w-4 h-4 text-teal-600" />
                  <span>+ Add Passenger</span>
                </button>
              )}
            </div>
          </div>

          {/* Color Legend */}
          <div className="px-6 py-3 border-b border-gray-100 bg-white flex flex-wrap gap-4 text-xs font-medium text-gray-600 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border border-gray-300 bg-white" />
              <span>Free Seat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border border-purple-300 bg-purple-50" />
              <span>Extra Legroom / Paid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-4 h-4 rounded ${activeTheme.badge}`} />
              <span>Selected (P{selectedPaxIndex + 1})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gray-300" />
              <span>Booked / Unavailable</span>
            </div>
          </div>

          {/* Seat Map Visual Layout */}
          <div className="p-6 overflow-x-auto flex justify-center bg-slate-50/30">
            <div className="inline-block bg-white p-6 rounded-2xl border border-gray-200 shadow-inner">
              {/* Airplane Nose Header */}
              <div className="w-full text-center text-xs font-bold text-gray-400 tracking-widest uppercase mb-6 pb-2 border-b border-gray-200">
                FRONT OF AIRCRAFT ✈️
              </div>

              <div className="space-y-3 min-w-[280px]">
                {seatLayout.map((row, rIdx) => {
                  const rowNum = row.rowNumber || rIdx + 1;
                  const seats = row.seats || [];
                  const leftSeats = seats.filter((s) =>
                    ["A", "B", "C"].some((letter) => (s.seatNumber || "").includes(letter))
                  );
                  const rightSeats = seats.filter((s) =>
                    ["D", "E", "F"].some((letter) => (s.seatNumber || "").includes(letter))
                  );

                  // If seats aren't strictly lettered A-F, split in half
                  const half = Math.ceil(seats.length / 2);
                  const groupLeft = leftSeats.length > 0 ? leftSeats : seats.slice(0, half);
                  const groupRight = rightSeats.length > 0 ? rightSeats : seats.slice(half);

                  return (
                    <div key={rowNum} className="flex items-center justify-center gap-4">
                      {/* Left Column Group */}
                      <div className="flex gap-2">
                        {groupLeft.map((seat, sIdx) => {
                          const ownerIndex = getSeatOwner(seat);
                          const isAssigned = ownerIndex !== null;
                          const ownerTheme = isAssigned ? getPaxTheme(ownerIndex) : null;
                          const price = Number(seat.amount || seat.Amount || 0);

                          let btnClass = "border-gray-300 bg-white text-gray-800 hover:border-blue-500";
                          if (seat.isBooked) {
                            btnClass = "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed";
                          } else if (isAssigned) {
                            btnClass = ownerTheme.seatClass;
                          } else if (seat.isLegroom || price > 0) {
                            btnClass = "bg-purple-50 border-purple-300 text-purple-900 hover:bg-purple-100 font-semibold";
                          }

                          return (
                            <button
                              key={seat.seatNumber || sIdx}
                              disabled={seat.isBooked}
                              type="button"
                              onClick={() => handleSeatClick(seat)}
                              title={`${seat.seatNumber || "Seat"} ${
                                isAssigned
                                  ? `(Assigned to Passenger ${ownerIndex + 1})`
                                  : price > 0
                                  ? `- ₹${price}`
                                  : "(Free)"
                              }`}
                              className={`w-10 h-11 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all border cursor-pointer select-none ${btnClass}`}
                            >
                              <span className="leading-tight">{seat.seatNumber || `S${sIdx}`}</span>
                              {isAssigned ? (
                                <span className="text-[9px] font-black tracking-tight px-1 rounded bg-black/25 text-white mt-0.5">
                                  P{ownerIndex + 1}
                                </span>
                              ) : price > 0 && !seat.isBooked ? (
                                <span className="text-[8px] opacity-75 leading-none mt-0.5">₹{price}</span>
                              ) : (
                                <span className="text-[8px] opacity-50 leading-none mt-0.5">Free</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Row Number Aisle */}
                      <div className="w-8 text-center text-xs font-bold text-gray-400 select-none">
                        {rowNum}
                      </div>

                      {/* Right Column Group */}
                      <div className="flex gap-2">
                        {groupRight.map((seat, sIdx) => {
                          const ownerIndex = getSeatOwner(seat);
                          const isAssigned = ownerIndex !== null;
                          const ownerTheme = isAssigned ? getPaxTheme(ownerIndex) : null;
                          const price = Number(seat.amount || seat.Amount || 0);

                          let btnClass = "border-gray-300 bg-white text-gray-800 hover:border-blue-500";
                          if (seat.isBooked) {
                            btnClass = "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed";
                          } else if (isAssigned) {
                            btnClass = ownerTheme.seatClass;
                          } else if (seat.isLegroom || price > 0) {
                            btnClass = "bg-purple-50 border-purple-300 text-purple-900 hover:bg-purple-100 font-semibold";
                          }

                          return (
                            <button
                              key={seat.seatNumber || sIdx}
                              disabled={seat.isBooked}
                              type="button"
                              onClick={() => handleSeatClick(seat)}
                              title={`${seat.seatNumber || "Seat"} ${
                                isAssigned
                                  ? `(Assigned to Passenger ${ownerIndex + 1})`
                                  : price > 0
                                  ? `- ₹${price}`
                                  : "(Free)"
                              }`}
                              className={`w-10 h-11 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all border cursor-pointer select-none ${btnClass}`}
                            >
                              <span className="leading-tight">{seat.seatNumber || `S${sIdx}`}</span>
                              {isAssigned ? (
                                <span className="text-[9px] font-black tracking-tight px-1 rounded bg-black/25 text-white mt-0.5">
                                  P{ownerIndex + 1}
                                </span>
                              ) : price > 0 && !seat.isBooked ? (
                                <span className="text-[8px] opacity-75 leading-none mt-0.5">₹{price}</span>
                              ) : (
                                <span className="text-[8px] opacity-50 leading-none mt-0.5">Free</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatMapSelection;
