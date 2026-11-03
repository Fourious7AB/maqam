import React from "react";

const HotelFacilities = ({ index, Icon, fac }) => {
  return (
    <div
      key={index}
      className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-blue-50 p-3 rounded-xl hover:shadow-md transition-all duration-300 group"
    >
      <div className="bg-teal-100 p-2 rounded-lg group-hover:bg-teal-500 transition-colors">
        <Icon size={18} className="text-teal-600 group-hover:text-white" />
      </div>
      <span className="text-gray-700 font-medium">{fac}</span>
    </div>
  );
};

export default HotelFacilities;
