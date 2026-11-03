import { useState } from "react";
import { Luggage, UtensilsCrossed, CheckCircle2 } from "lucide-react";

const SsrSelection = ({
  ssrData,
  loading,
  passengerCount = 1,
  passengerList = [],
  onSelectionChange,
}) => {
  const [activeTab, setActiveTab] = useState("baggage"); // 'baggage' | 'meals'
  const [selectedPaxIndex, setSelectedPaxIndex] = useState(0);

  // Per-passenger selections: paxIndex -> { baggage: item, meal: item }
  const [paxSelections, setPaxSelections] = useState(() => {
    const init = {};
    for (let i = 0; i < passengerCount; i++) {
      init[i] = { baggage: null, meal: null };
    }
    return init;
  });

  const ssr = ssrData?.data?.data || ssrData?.data || ssrData || {};
  const baggageList = ssr.baggage || [];
  const mealsList = ssr.meals || [];
  const standardMeals = ssr.standardMeals || [];

  const handleSelectBaggage = (item) => {
    setPaxSelections((prev) => {
      const updated = {
        ...prev,
        [selectedPaxIndex]: {
          ...prev[selectedPaxIndex],
          baggage: prev[selectedPaxIndex]?.baggage?.code === item?.code ? null : item,
        },
      };
      if (onSelectionChange) onSelectionChange(updated);
      return updated;
    });
  };

  const handleSelectMeal = (item) => {
    setPaxSelections((prev) => {
      const updated = {
        ...prev,
        [selectedPaxIndex]: {
          ...prev[selectedPaxIndex],
          meal: prev[selectedPaxIndex]?.meal?.code === item?.code ? null : item,
        },
      };
      if (onSelectionChange) onSelectionChange(updated);
      return updated;
    });
  };

  const calculatePaxTotal = (paxIdx) => {
    const sel = paxSelections[paxIdx] || {};
    const bPrice = Number(sel.baggage?.price || sel.baggage?.Price || 0);
    const mPrice = Number(sel.meal?.price || sel.meal?.Price || 0);
    return bPrice + mPrice;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-100 rounded w-full mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-gray-100 rounded"></div>
          <div className="h-24 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!baggageList.length && !mealsList.length && !standardMeals.length) {
    return null; // No SSR available for this flight
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header Tabs */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Add Extra Baggage & Meals</h3>
          <p className="text-xs text-gray-500">Customize your flight options per passenger</p>
        </div>

        <div className="flex bg-gray-200 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("baggage")}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "baggage"
                ? "bg-white text-teal-800 shadow-xs"
                : "text-gray-600 hover:text-slate-900"
            }`}
          >
            <Luggage className="w-4 h-4" />
            Excess Baggage
          </button>
          <button
            onClick={() => setActiveTab("meals")}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "meals"
                ? "bg-white text-teal-800 shadow-xs"
                : "text-gray-600 hover:text-slate-900"
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            Meals
          </button>
        </div>
      </div>

      {/* Passenger Switcher */}
      {passengerCount > 1 && (
        <div className="flex border-b border-gray-100 bg-slate-50/70 px-6 py-2.5 gap-2 overflow-x-auto">
          {Array.from({ length: passengerCount }).map((_, idx) => {
            const paxTotal = calculatePaxTotal(idx);
            const isSelected = selectedPaxIndex === idx;
            const paxInfo = passengerList[idx];
            const paxDisplayName = paxInfo?.firstName
              ? `${paxInfo.firstName} ${paxInfo.lastName || ""}`.trim()
              : `Passenger ${idx + 1}`;

            return (
              <button
                key={idx}
                onClick={() => setSelectedPaxIndex(idx)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <span>{paxDisplayName}</span>
                {paxTotal > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-teal-100 text-teal-800"
                    }`}
                  >
                    +₹{paxTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "baggage" && (
          <div>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-700">
                Select Excess Baggage for Passenger {selectedPaxIndex + 1}
              </h4>
              <p className="text-xs text-gray-500">Standard check-in baggage is already included</p>
            </div>

            {baggageList.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No extra baggage options available for this flight.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Default Included Baggage */}
                <div
                  onClick={() => handleSelectBaggage(null)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                    !paxSelections[selectedPaxIndex]?.baggage
                      ? "border-blue-600 bg-blue-50/30 ring-2 ring-blue-500/20"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <Luggage className="w-6 h-6 text-gray-500" />
                    {!paxSelections[selectedPaxIndex]?.baggage && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-50" />
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="font-semibold text-sm text-slate-800">No Extra Baggage</p>
                    <p className="text-xs text-gray-500 mt-0.5">Standard Allowance Only</p>
                  </div>
                  <p className="mt-3 text-sm font-bold text-green-700">Included (Free)</p>
                </div>

                {baggageList.map((item, i) => {
                  const isSelected = paxSelections[selectedPaxIndex]?.baggage?.code === item.code;
                  const price = Number(item.price || item.Price || 0);
                  const weightStr = item.weight ? `${item.weight} Kg` : item.description || `Extra Baggage`;
                  return (
                    <div
                      key={item.code || i}
                      onClick={() => handleSelectBaggage(item)}
                      className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <Luggage className={`w-6 h-6 ${isSelected ? "text-blue-600" : "text-gray-500"}`} />
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-50" />}
                      </div>
                      <div className="mt-4">
                        <p className="font-bold text-sm text-slate-800">
                          +{weightStr}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.description || "Check-in allowance"}</p>
                      </div>
                      <p className="mt-3 text-sm font-bold text-blue-700">
                        +₹{price.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "meals" && (
          <div>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-700">
                Select Meals for Passenger {selectedPaxIndex + 1}
              </h4>
              <p className="text-xs text-gray-500">Pre-book your favorite meal on board</p>
            </div>

            {mealsList.length === 0 && standardMeals.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No meal selection available for this flight.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* No Meal Option */}
                <div
                  onClick={() => handleSelectMeal(null)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                    !paxSelections[selectedPaxIndex]?.meal
                      ? "border-blue-600 bg-blue-50/30 ring-2 ring-blue-500/20"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <UtensilsCrossed className="w-6 h-6 text-gray-500" />
                    {!paxSelections[selectedPaxIndex]?.meal && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-50" />
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="font-semibold text-sm text-slate-800">No Meal Selected</p>
                    <p className="text-xs text-gray-500 mt-0.5">Skip onboard meal</p>
                  </div>
                  <p className="mt-3 text-sm font-bold text-gray-600">₹0</p>
                </div>

                {mealsList.map((item, i) => {
                  const isSelected = paxSelections[selectedPaxIndex]?.meal?.code === item.code;
                  const price = Number(item.price || item.Price || 0);
                  const desc = item.airlineDescription || item.description || item.code || "Onboard Meal";
                  return (
                    <div
                      key={item.code || i}
                      onClick={() => handleSelectMeal(item)}
                      className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <UtensilsCrossed className={`w-6 h-6 ${isSelected ? "text-blue-600" : "text-gray-500"}`} />
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-50" />}
                      </div>
                      <div className="mt-4">
                        <p className="font-bold text-sm text-slate-800 line-clamp-2">
                          {desc}
                        </p>
                        {item.quantity && <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>}
                      </div>
                      <p className="mt-3 text-sm font-bold text-blue-700">
                        +₹{price.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SsrSelection;
