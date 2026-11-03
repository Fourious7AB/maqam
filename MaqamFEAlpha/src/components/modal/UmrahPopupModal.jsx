import { X, CalendarDays, ChevronDown } from "lucide-react";

const UmrahPopupModal = ({
  openUmrahPopup,
  open,
  onClose,
  setOpenUmrahPopup,
}) => {
  return (
    <>
      {openUmrahPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setOpenUmrahPopup(false)}
        >
          <div
            className="
              relative
              w-full
              max-w-lg
              rounded-2xl
              bg-white
              p-6
              shadow-2xl
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setOpenUmrahPopup(false)}
              className="
                absolute
                right-4
                top-4
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-full
                bg-gray-100
                text-gray-600
                transition-all
                duration-200
                hover:bg-gray-200
                hover:text-gray-900
                cursor-pointer
              "
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            {/* Header */}
            <div className="mb-6 pr-10">
              <h2 className="text-xl font-bold text-[#062b61]">
                More Umrah Details
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select your travel preferences for the Umrah journey.
              </p>
            </div>

            {/* Service Level */}
            <div className="mb-5">
              <label
                htmlFor="umrahServiceLevel"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Service Level
              </label>

              <div className="relative">
                <select
                  id="umrahServiceLevel"
                  name="serviceLevel"
                  defaultValue=""
                  className="
                    w-full
                    appearance-none
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                    px-4
                    py-3
                    pr-10
                    text-sm
                    font-medium
                    text-gray-700
                    outline-none
                    transition-all
                    duration-200
                    focus:border-[#09A372]
                    focus:bg-white
                    focus:ring-2
                    focus:ring-[#09A372]/20
                    cursor-pointer
                  "
                >
                  <option value="" disabled>
                    Select service level
                  </option>

                  <option value="economy">Economy</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="luxury">Luxury</option>
                </select>

                <ChevronDown
                  size={18}
                  className="
                    pointer-events-none
                    absolute
                    right-4
                    top-1/2
                    -translate-y-1/2
                    text-gray-500
                  "
                />
              </div>
            </div>

            {/* Travel Dates */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Travel Dates
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Travel Start Date */}
                <div className="relative">
                  <CalendarDays
                    size={18}
                    className="
                      pointer-events-none
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-[#09A372]
                    "
                  />

                  <input
                    type="date"
                    name="travelStartDate"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      bg-gray-50
                      py-3
                      pl-11
                      pr-3
                      text-sm
                      font-medium
                      text-gray-700
                      outline-none
                      transition-all
                      duration-200
                      focus:border-[#09A372]
                      focus:bg-white
                      focus:ring-2
                      focus:ring-[#09A372]/20
                    "
                  />

                  <span className="absolute -top-2 left-3 bg-white px-1 text-[11px] text-gray-500">
                    Start Date
                  </span>
                </div>

                {/* Travel End Date */}
                <div className="relative">
                  <CalendarDays
                    size={18}
                    className="
                      pointer-events-none
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-[#09A372]
                    "
                  />

                  <input
                    type="date"
                    name="travelEndDate"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      bg-gray-50
                      py-3
                      pl-11
                      pr-3
                      text-sm
                      font-medium
                      text-gray-700
                      outline-none
                      transition-all
                      duration-200
                      focus:border-[#09A372]
                      focus:bg-white
                      focus:ring-2
                      focus:ring-[#09A372]/20
                    "
                  />

                  <span className="absolute -top-2 left-3 bg-white px-1 text-[11px] text-gray-500">
                    End Date
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={() => setOpenUmrahPopup(false)}
                className="
                  rounded-xl
                  border
                  border-gray-200
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-gray-600
                  transition
                  hover:bg-gray-50
                  cursor-pointer
                "
              >
                Cancel
              </button>

              <button
                type="button"
                className="
                  rounded-xl
                  bg-[#09A372]
                  px-6
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition-all
                  duration-200
                  hover:bg-[#078960]
                  hover:shadow-md
                  cursor-pointer
                "
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UmrahPopupModal;