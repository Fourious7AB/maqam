import React from "react";

/**
 * AnimatedHamburger
 * An interactive, sleek 3-line hamburger menu button with micro-animations.
 * Morphs seamlessly into a close "X" when open.
 */
const AnimatedHamburger = ({
  isOpen = false,
  onClick,
  className = "",
  barClassName = "",
  ariaLabel = "Toggle navigation menu",
}) => {
  const defaultBarColor = barClassName || "bg-current";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
      className={`
        group relative flex flex-col items-center justify-center
        w-10 h-10 rounded-xl
        border border-white/20
        bg-white/10 hover:bg-white/20
        text-white
        shadow-2xs hover:shadow-xs
        transition-all duration-300 active:scale-95 cursor-pointer
        ${className}
      `}
    >
      <div className="relative w-5 h-4 flex flex-col justify-between items-center pointer-events-none">
        {/* Top bar */}
        <span
          className={`
            h-[2px] rounded-full ${defaultBarColor}
            transition-all duration-300 ease-out origin-center
            ${isOpen ? "w-5 translate-y-[7px] rotate-45" : "w-5 translate-y-0 rotate-0"}
          `}
        />

        {/* Middle bar */}
        <span
          className={`
            h-[2px] rounded-full ${defaultBarColor}
            transition-all duration-300 ease-out origin-center
            ${
              isOpen
                ? "w-0 opacity-0 scale-x-0"
                : "w-3.5 group-hover:w-5 opacity-100 scale-x-100"
            }
          `}
        />

        {/* Bottom bar */}
        <span
          className={`
            h-[2px] rounded-full ${defaultBarColor}
            transition-all duration-300 ease-out origin-center
            ${isOpen ? "w-5 -translate-y-[7px] -rotate-45" : "w-5 translate-y-0 rotate-0"}
          `}
        />
      </div>
    </button>
  );
};

export default AnimatedHamburger;
