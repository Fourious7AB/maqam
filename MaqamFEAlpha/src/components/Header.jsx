import { useState } from "react";
import { Menu, X } from "lucide-react";
import { FaRobot } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { GoHomeFill } from "react-icons/go";
import { IoLocationSharp } from "react-icons/io5";
import { RiHotelFill } from "react-icons/ri";
import { BiSolidPlaneAlt } from "react-icons/bi";

export default function Header() {
  const [open, setOpen] = useState(false);

  const menu = [
    { name: "Home", icon: GoHomeFill, href: "/" },
    // { name: "Location", icon: IoLocationSharp, href: "/location" },
    { name: "Hotel", icon: RiHotelFill, href: "/hotel" },
    { name: "Flight", icon: BiSolidPlaneAlt, href: "/flight"},
    // { name: "Ai Tour Planner", icon: FaRobot, href: "/ai-tour-planner" },
  ];

  return (
    <div className="w-full bg-[#ebe6dd] shadow-sm font-poppins">
      <div className="max-w-6xl mx-auto relative flex items-center px-4 py-3">
        {/* Desktop Menu */}
        <div className="hidden md:flex w-full justify-center items-center gap-12">
          {menu.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={index}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-2 text-base font-medium ${
                    isActive
                      ? "text-emerald-600 font-bold"
                      : "text-gray-500 hover:text-emerald-700"
                  }`
                }
              >
                <Icon size={28} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden ml-auto" onClick={() => setOpen(!open)}>
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className=" md:hidden px-4 pb-4 flex flex-col items-center gap-4">
          {menu.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={index}
                to={item.href}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-2 text-base font-medium ${
                    isActive
                      ? "text-emerald-600 font-bold"
                      : "text-gray-500 hover:text-emerald-700"
                  }`
                }
              >
                <Icon size={22} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
