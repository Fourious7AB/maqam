import {
  Users,
  BedDouble,
  CreditCard,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react";
import React from "react";

const HotelRoomsListing = ({
  rateComponentData,
  reservationData,
  onClose,
  handleSubmitPreorder,
  isLoading,
}) => {
  const rooms = rateComponentData?.roomTypes || [];
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const getTotalDays = () => {
    const { checkin, checkout } = reservationData || {};
    if (!checkin || !checkout) return "—";
    const start = new Date(checkin);
    const end = new Date(checkout);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return "—";
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff} day${diff === 1 ? "" : "s"}` : "—";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 p-4 sm:p-6 overflow-y-auto font-poppins">
      {/* Dialog Box */}
      <div className="bg-white w-full max-w-full sm:max-w-5xl md:max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between p-6 border-b border-teal-200">
          <div>
            <h2 className="text-2xl font-bold text-teal-800">
              Available Rooms
            </h2>
            <p className="text-gray-500 text-sm">
              Select the perfect room for your stay
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Check-in: {formatDate(reservationData?.checkin)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Check-out: {formatDate(reservationData?.checkout)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Total: {getTotalDays()}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="self-start sm:self-auto p-2 rounded-full bg-red-200 text-red-600 transition cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {rooms.map((room) => {
            const rate = room?.rates?.[0];

            const price = rate?.retailRate?.suggestedSellingPrice?.[0]?.amount;

            const refundable =
              rate?.cancellationPolicies?.refundableTag !== "NRFN";

            return (
              <div
                key={room.roomTypeId}
                className="border border-teal-300 rounded-xl shadow-sm hover:shadow-md transition"
              >
                <div className="grid grid-cols-1 md:gap-4 md:grid-cols-3">
                  {/* Image */}
                  <img
                    src="https://images.unsplash.com/photo-1618773928121-c32242e63f39"
                    className="w-full h-56 md:h-full object-cover rounded-xl "
                  />

                  {/* Room Details */}
                  <div className="p-5 col-span-2 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        {rate?.name}
                      </h3>

                      <div className="flex flex-wrap gap-6 mt-3 text-gray-600">
                        <div className="flex items-center gap-2 bg-teal-100 text-teal-600 px-2 rounded-2xl">
                          <Users size={18} />
                          Max {rate?.maxOccupancy} Guests
                        </div>

                        <div className="flex items-center gap-2 bg-teal-100 text-teal-600 px-2 rounded-2xl">
                          <BedDouble size={18} />
                          {room?.rateType}
                        </div>

                        <div className="flex items-center gap-2 bg-teal-100 text-teal-600 px-2 rounded-2xl">
                          <CreditCard size={18} />
                          {rate?.boardName}
                        </div>
                        <div>
                          {refundable ? (
                            <div className="flex items-center gap-2  bg-teal-100 text-teal-600 px-2 rounded-2xl">
                              <CheckCircle size={18} />
                              Free Cancellation
                            </div>
                          ) : (
                            <div className="flex items-center gap-2  bg-red-100 text-red-600 px-2 rounded-2xl">
                              <XCircle size={18} />
                              Non Refundable
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-5">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          ₹{price?.toLocaleString()}
                        </div>
                        <p className="text-sm text-gray-500">Total price</p>
                      </div>

                      <button
                        onClick={() => handleSubmitPreorder(room.offerId)}
                        disabled={isLoading}
                        className={`w-full md:w-auto cursor-pointer mt-3 px-6 py-2 text-white text-base font-semibold rounded-md transition-all duration-300 flex items-center justify-center gap-2 ${
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
                            Book Now...
                          </>
                        ) : (
                          "Book Now"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HotelRoomsListing;
