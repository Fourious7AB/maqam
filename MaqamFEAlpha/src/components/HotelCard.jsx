import React from "react";



const HotelCard = ({ hotel }) => {
  return (
    <div className="flex gap-4 items-start bg-[#d9f3f2] border border-teal-400 rounded-xl p-4">
      {/* Image */}
      <img
        src={hotel.image}
        alt="hotel"
        className="w-20 h-20 object-cover rounded-lg border border-emerald-400"
      />

      {/* Content */}
      <div className="flex flex-col">
        {/* Title */}
        <h2 className="text-[16px] font-semibold text-gray-800">
          {hotel.name},{" "}
          <span className="font-normal text-gray-600">
            {hotel.location}
          </span>
        </h2>

        {/* Price */}
        <p className="text-sm text-gray-600 mt-1">
          Starting from{" "}
          <span className="text-teal-600 font-semibold">
            {hotel.price}
          </span>
        </p>

        {/* Features */}
        <ul className="text-xs text-gray-700 mt-2 space-y-1">
          <li>• Halal-certified kitchen</li>
          <li>• Prayer halls on every floor Family suites</li>
          <li>• Walking distance to Masjid al-Haram</li>
        </ul>
      </div>
    </div>
  );
};

export default HotelCard;