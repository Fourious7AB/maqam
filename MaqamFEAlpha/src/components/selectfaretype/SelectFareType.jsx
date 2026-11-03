import React from "react";

const SelectFareType = ({ setSelectedFare, fareTypes, selectedFare }) => {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center gap-2.5 sm:gap-4 w-full">
      <h3 className="text-xs sm:text-sm font-bold text-gray-700 whitespace-nowrap tracking-wide uppercase">
        Select Fare Type
      </h3>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 flex-1">
        {fareTypes.map((fare) => (
          <label
            key={fare}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition-all duration-200 text-xs font-semibold ${
              selectedFare === fare
                ? "border-teal-600 bg-teal-50 text-teal-700 shadow-2xs"
                : "border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="fareType"
              value={fare}
              checked={selectedFare === fare}
              onChange={() => setSelectedFare(fare)}
              className="accent-teal-600 h-3.5 w-3.5"
            />

            <span className="whitespace-nowrap">
              {fare}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default SelectFareType;
