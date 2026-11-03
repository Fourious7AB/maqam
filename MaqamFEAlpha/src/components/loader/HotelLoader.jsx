import React from "react";
import hotelSearchAnimation from "../../assets/hotelSearchAnimation.gif";

export default function HotelLoader() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#EEEEEE] select-none overflow-hidden w-screen h-screen p-0 m-0"
      style={{ backgroundColor: "#EEEEEE" }}
      role="status"
      aria-label="Loading hotels"
    >
      <img
        src={hotelSearchAnimation}
        alt="Loading hotels"
        className="w-full h-full object-contain"
        style={{ backgroundColor: "#EEEEEE" }}
      />
    </div>
  );
}
