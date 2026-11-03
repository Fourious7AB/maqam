import React from "react";
import flightSearchAnimation from "../../assets/flightSearchAnimation.gif";

export default function FlightLoader() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#F4F4F4] select-none overflow-hidden w-screen h-screen p-0 m-0"
      style={{ backgroundColor: "#F4F4F4" }}
      role="status"
      aria-label="Loading flights"
    >
      <img
        src={flightSearchAnimation}
        alt="Loading flights"
        className="w-full h-full object-contain"
        style={{ backgroundColor: "#F4F4F4" }}
      />
    </div>
  );
}
