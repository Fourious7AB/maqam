import React, { useEffect, useRef } from "react";
import anime from "animejs";
import { Clock, Plane } from "lucide-react";
import { prefersReducedMotion } from "../../animations/presets";

/**
 * AnimatedFlightRoute Component
 * Renders an animated flight trajectory with a gliding plane icon and pulse effect.
 */
const AnimatedFlightRoute = ({ durationStr, stopsContent }) => {
  const planeRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    if (!planeRef.current || prefersReducedMotion()) return;

    // Smooth gliding animation for the airplane across the flight corridor
    const anim = anime({
      targets: planeRef.current,
      translateX: ["-28px", "28px"],
      duration: 2200,
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine",
    });

    return () => {
      anim.pause();
      if (planeRef.current) anime.remove(planeRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center px-1 sm:px-3 min-w-[100px] sm:min-w-[140px] max-w-[180px] flex-1 select-none">
      {/* Flight Duration */}
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/90 px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-2xs">
        <Clock className="w-3 h-3 text-slate-500" />
        {durationStr}
      </span>

      {/* Flight Path Track */}
      <div ref={trackRef} className="relative w-full my-2.5 flex items-center justify-center overflow-hidden py-1">
        {/* Subtle glowing trail line */}
        <div className="w-full h-[2px] bg-gradient-to-r from-slate-200 via-teal-400 to-slate-200 rounded-full" />
        
        {/* Animated gliding airplane badge */}
        <div
          ref={planeRef}
          className="absolute p-1 rounded-full bg-white border border-teal-500/80 shadow-xs flex items-center justify-center"
          title="In-flight trajectory"
        >
          <Plane className="w-3 h-3 text-teal-600 rotate-90 transform-gpu" />
        </div>
      </div>

      {/* Stops / Layovers */}
      <div className="text-[11px] font-semibold text-center w-full truncate">
        {stopsContent}
      </div>
    </div>
  );
};

export default AnimatedFlightRoute;
