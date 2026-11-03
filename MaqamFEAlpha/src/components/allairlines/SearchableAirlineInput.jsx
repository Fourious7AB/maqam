import { useEffect, useState } from "react";
import { ChevronRight, Plane} from "lucide-react";
import {
  CheckCircle,
} from "lucide-react";

const AIRLINES = [
  "Air India",
  "Air India Express",
  "Akasa Air",
  "Alliance Air",
  "IndiGo",
  "SpiceJet",
  "Go First",
  "Vistara",
  "Emirates",
  "Etihad Airways",
  "Qatar Airways",
  "Saudia",
  "Flynas",
  "Flyadeal",
  "Air Arabia",
  "Air Arabia Abu Dhabi",
  "Oman Air",
  "Gulf Air",
  "Kuwait Airways",
  "Bahrain Air",
  "Singapore Airlines",
  "Malaysia Airlines",
  "Thai Airways",
  "SriLankan Airlines",
  "Turkish Airlines",
  "British Airways",
  "Lufthansa",
  "Air France",
  "KLM",
  "Swiss International Air Lines",
  "Qantas",
  "Cathay Pacific",
  "ANA",
  "Japan Airlines",
  "Ethiopian Airlines",
  "Kenya Airways",
];


const SearchableAirlineInput = ({
  label,
  placeholder,
  icon: Icon,
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || "");

  const filteredAirlines = AIRLINES.filter((airline) =>
    airline.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  const handleSelect = (airline) => {
    setSearch(airline);
    onChange(airline);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Label */}
      <label
        className="
          text-[11px]
          sm:text-xs
          font-bold
          text-zinc-500
          uppercase
          tracking-[0.12em]
          flex
          items-center
          gap-1.5
        "
      >
        {Icon && (
          <Icon
            size={13}
            className="text-emerald-600 shrink-0"
            strokeWidth={2.2}
          />
        )}

        {label}
      </label>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={search}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          className="
            w-full
            h-12
            px-4
            pr-10
            rounded-xl
            outline-none
            text-sm
            font-medium
            text-zinc-900
            placeholder:text-zinc-400
            bg-white
            border
            border-zinc-200
            transition-all
            duration-200
            hover:border-zinc-300
            focus:border-zinc-400
            focus:ring-4
            focus:ring-zinc-900/5
          "
        />

        {/* Dropdown Arrow */}
        <ChevronRight
          size={17}
          className={`
            absolute
            right-4
            top-1/2
            -translate-y-1/2
            text-zinc-400
            transition-transform
            duration-200
            pointer-events-none
            ${isOpen ? "rotate-90" : ""}
          `}
        />

        {/* Dropdown */}
        {isOpen && (
          <div
            className="
              absolute
              left-0
              right-0
              top-full
              mt-2
              z-[300]
              overflow-hidden
              rounded-xl
              border
              border-zinc-200
              bg-white
              shadow-xl
            "
          >
            {/* Search Result Count */}
            <div className="px-4 py-2 border-b border-zinc-100">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {filteredAirlines.length} Airlines
              </span>
            </div>

            {/* Airline List */}
            <div className="max-h-60 overflow-y-auto scrollbar-hide">
              {filteredAirlines.length > 0 ? (
                filteredAirlines.map((airline) => {
                  const active = value === airline;

                  return (
                    <button
                      key={airline}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(airline)}
                      className={`
                        w-full
                        flex
                        items-center
                        gap-3
                        px-4
                        py-3
                        text-left
                        text-sm
                        transition-colors
                        duration-150
                        cursor-pointer
                        ${
                          active
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-zinc-700 hover:bg-gray-100"
                        }
                      `}
                    >
                      {/* Airline Icon */}
                      <div
                        className={`
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          ${
                            active
                              ? "bg-emerald-100"
                              : "bg-zinc-100"
                          }
                        `}
                      >
                        <Plane
                          size={15}
                          className={
                            active
                              ? "text-emerald-600"
                              : "text-zinc-500"
                          }
                        />
                      </div>

                      {/* Airline Name */}
                      <span className="font-medium">
                        {airline}
                      </span>

                      {/* Selected Check */}
                      {active && (
                        <CheckCircle
                          size={17}
                          className="ml-auto text-emerald-600"
                        />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center">
                  <Plane
                    size={24}
                    className="mx-auto mb-2 text-zinc-300"
                  />

                  <p className="text-sm font-medium text-zinc-500">
                    No airline found
                  </p>

                  <p className="mt-1 text-xs text-zinc-400">
                    Try another airline name
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableAirlineInput