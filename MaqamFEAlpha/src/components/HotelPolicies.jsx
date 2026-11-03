import React from "react";

const HotelPolicies = ({ policy, index, Icon }) => {
  return (
    <div
      key={index}
      className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border-l-4 border-amber-500"
    >
      <div className="flex items-start gap-3">
        <Icon
          className="text-amber-600 flex-shrink-0 mt-1"
          size={20}
        />
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">{policy.name}</h3>
          <p className="text-gray-600 text-sm">{policy.description}</p>
        </div>
      </div>
    </div>
  );
};

export default HotelPolicies;
