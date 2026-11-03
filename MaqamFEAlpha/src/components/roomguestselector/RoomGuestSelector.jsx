import { useState } from "react";
import { Minus, Plus, PawPrint } from "lucide-react";

export default function RoomGuestSelector({
  openRoomguestselector,
  setOpenroomguestselector,
  roomCount,
  setRoomCount,
  adultCount,
  setAdultCount,
  childrenCount,
  setChildrenCount,
  childAges,
  setChildAges,
}) {
  const handleIncreaseRoomCount = () => {
    setRoomCount((prev) => (prev < 20 ? prev + 1 : prev));
  };

  const handleDecreaseRoomCount = () => {
    setRoomCount((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const handleIncreaseAdultCount = () => {
    setAdultCount((prev) => (prev < 40 ? prev + 1 : prev));
  };

  const handleDcreaseAdultCount = () => {
    setAdultCount((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const handleIncreaseChildCount = () => {
    setChildrenCount((prev) => (prev < 40 ? prev + 1 : prev));
    setChildAges((prev) => [...prev, 5]); // Default age = 5
  };

  const handleDecreaseChildCount = () => {
    setChildrenCount((prev) => (prev > 0 ? prev - 1 : prev));
    setChildAges((prev) => prev.slice(0, -1));
  };

  const handleAgeChange = (index, age) => {
    const updated = [...childAges];
    updated[index] = Number(age);
    setChildAges(updated);
  };

  return (
    <div className="max-w-xs bg-white shadow-xl">
      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Room */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 text-md">Room</h3>
          </div>

          <div className="flex items-center border w-28 h-8 rounded-xl">
            <button className="w-10 h-5 flex items-center justify-center cursor-pointer">
              <Minus size={16} onClick={handleDecreaseRoomCount} />
            </button>

            <span className="w-10 text-center font-bold text-md">
              {roomCount}
            </span>

            <button className="w-10 h-10 flex items-center justify-center cursor-pointer">
              <Plus size={16} onClick={handleIncreaseRoomCount} />
            </button>
          </div>
        </div>

        {/* Adults */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">Adults</h3>
          </div>

          <div className="flex items-center border rounded-xl w-28 h-8">
            <button className="w-10 h-10 flex items-center justify-center cursor-pointer">
              <Minus size={16} onClick={handleDcreaseAdultCount} />
            </button>

            <span className="w-10 text-center font-bold text-md">
              {adultCount}
            </span>

            <button className="w-10 h-10 flex items-center justify-center cursor-pointer">
              <Plus size={16} onClick={handleIncreaseAdultCount} />
            </button>
          </div>
        </div>

        {/* Children */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">Children</h3>

            <p className="text-sm text-gray-400">0 - 17 Years Old</p>
          </div>

          <div className="flex items-center border rounded-xl w-28 h-8">
            <button className="w-10 h-10 flex items-center justify-center cursor-pointer">
              <Minus size={16} onClick={handleDecreaseChildCount} />
            </button>

            <span className="w-10 text-center font-bold text-lg">
              {childrenCount}
            </span>

            <button className="w-10 h-10 flex items-center justify-center cursor-pointer">
              <Plus size={16} onClick={handleIncreaseChildCount} />
            </button>
          </div>
        </div>

        {/* Info */}
        <p className="text-sm text-gray-500 leading-relaxed">
          Please provide right number of children along with their right age for
          best options and prices.
        </p>

        {childrenCount > 0 && (
          <>
            <hr className="my-4" />

            <h3 className="font-semibold text-gray-700 mb-3">
              Age of Children
            </h3>

            <div className="space-y-3  h-[100px] overflow-y-auto">
              {childAges.map((age, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium">Child {index + 1}</span>

                  <select
                    value={age}
                    onChange={(e) => handleAgeChange(index, e.target.value)}
                    className="border rounded-lg px-3 py-2 w-28"
                  >
                    {Array.from({ length: 18 }, (_, i) => (
                      <option key={i} value={i}>
                        {i} yrs
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}

        <hr />
        {/* Pets */}
        <div className="border rounded-xl p-2 flex justify-between items-start">
          <div className="flex gap-4">
            <input type="checkbox" className="mt-1 w-5 h-5 rounded" />

            <div>
              <h4 className="font-semibold text-gray-800">
                Are you travelling with pets?
              </h4>

              {/* <p className="text-sm text-gray-500 mt-1">
                Selecting this option will show only pet-friendly properties.
                Please review the pet policies & applicable fees, if any.
              </p> */}
            </div>
          </div>

          <PawPrint size={34} className="text-gray-500 shrink-0" />
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t bg-gray-50 p-2 flex justify-end ">
        <button
          onClick={() => setOpenroomguestselector(false)}
          className="
          cursor-pointer
          bg-gradient-to-r
          from-sky-400
          to-blue-600
          hover:from-sky-500
          hover:to-blue-700
          text-white
          font-bold
          px-5
          py-1
          rounded-full
          shadow-lg
          transition-all
        "
        >
          APPLY
        </button>
      </div>
    </div>
  );
}
