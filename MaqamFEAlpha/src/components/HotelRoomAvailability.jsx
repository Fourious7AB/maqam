import {
  Calendar,
  DollarSign,
  Flag,
  Minus,
  Plus,
  Users,
  X,
} from "lucide-react";
import React from "react";

const HotelRoomAvailability = ({
  isReservationModalOpen,
  setIsReservationModalOpen,
  hotelId,
  hotelName,
  reservationData,
  setReservationData,
  handleSubmitReservation,
  handleReservationInputChange,
  handleOccupancyChange,
  isLoading,
}) => {
  return (
    <>
      {" "}
      {isReservationModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 font-poppins">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Reserve Room
                </h2>
                <p className="text-gray-600 text-sm mt-1">{hotelName}</p>
              </div>
              <button
                onClick={() => setIsReservationModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Hotel IDs (Read-only) */}
              {/* <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hotel ID
                </label>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-gray-600">{hotelId}</span>
                </div>
              </div> */}

              {/* Check-in & Check-out Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} className="text-teal-500" />
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    value={reservationData.checkin}
                    onChange={(e) =>
                      handleReservationInputChange("checkin", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} className="text-teal-500" />
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    value={reservationData.checkout}
                    onChange={(e) =>
                      handleReservationInputChange("checkout", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    min={reservationData.checkin}
                  />
                </div>
              </div>

              {/* Occupancy */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Users size={18} className="text-teal-500" />
                  Guest Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adults
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleOccupancyChange(
                            "adults",
                            reservationData.occupancies[0].adults - 1,
                          )
                        }
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        disabled={reservationData.occupancies[0].adults <= 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="flex-1 text-center text-lg font-semibold">
                        {reservationData.occupancies[0].adults}
                      </span>
                      <button
                        onClick={() =>
                          handleOccupancyChange(
                            "adults",
                            reservationData.occupancies[0].adults + 1,
                          )
                        }
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Children
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleOccupancyChange(
                            "children",
                            reservationData.occupancies[0].children - 1,
                          )
                        }
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        disabled={reservationData.occupancies[0].children <= 0}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="flex-1 text-center text-lg font-semibold">
                        {reservationData.occupancies[0].children}
                      </span>
                      <button
                        onClick={() =>
                          handleOccupancyChange(
                            "children",
                            reservationData.occupancies[0].children + 1,
                          )
                        }
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div> */}
                </div>
              </div>

              {/* Guest Nationality */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Flag size={16} className="text-teal-500" />
                  Guest Nationality
                </label>
                <select
                  value={reservationData.guestNationality}
                  onChange={(e) =>
                    handleReservationInputChange(
                      "guestNationality",
                      e.target.value,
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                >
                  <option value="IN">India (IN)</option>
                  <option value="US">United States (US)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="AU">Australia (AU)</option>
                  <option value="AE">UAE (AE)</option>
                  <option value="SG">Singapore (SG)</option>
                  <option value="MY">Malaysia (MY)</option>
                  <option value="TH">Thailand (TH)</option>
                  <option value="JP">Japan (JP)</option>
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <DollarSign size={16} className="text-teal-500" />
                  Currency
                </label>
                <select
                  value={reservationData.currency}
                  onChange={(e) =>
                    handleReservationInputChange("currency", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                >
                  <option value="INR">Indian Rupee (INR)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="GBP">British Pound (GBP)</option>
                  <option value="AED">UAE Dirham (AED)</option>
                  <option value="SGD">Singapore Dollar (SGD)</option>
                </select>
              </div>

              {/* Max Rates Per Hotel */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Rates Per Hotel
                </label>
                <input
                  type="number"
                  value={reservationData.maxRatesPerHotel}
                  onChange={(e) =>
                    handleReservationInputChange(
                      "maxRatesPerHotel",
                      parseInt(e.target.value),
                    )
                  }
                  min="1"
                  max="20"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum number of room rates to return per hotel
                </p>
              </div>

              {/* Room Mapping Toggle */}
              {/* <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="font-semibold text-gray-700">
                    Room Mapping
                  </label>
                  <p className="text-xs text-gray-500">
                    Enable detailed room type mapping
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleReservationInputChange(
                      "roomMapping",
                      !reservationData.roomMapping,
                    )
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    reservationData.roomMapping ? "bg-teal-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      reservationData.roomMapping
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div> */}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setIsReservationModalOpen(false)}
                className="cursor-pointer mt-3 px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold rounded-md transition-all duration-300"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReservation}
                disabled={isLoading}
                className={`cursor-pointer mt-3 px-6 py-2 text-white text-base font-semibold rounded-md transition-all duration-300 flex items-center justify-center gap-2 ${
                  isLoading
                    ? "bg-teal-800 cursor-not-allowed"
                    : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Checking Availability...
                  </>
                ) : (
                  "Check Availability"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HotelRoomAvailability;
