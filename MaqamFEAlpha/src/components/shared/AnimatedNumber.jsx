import { useEffect, useRef } from "react";
import { animateCounter } from "../../animations/presets";
/**
 * AnimatedNumber Component
 * Smoothly morphs/counts from old number to new number using anime.js
 *
 * @param {number|string} value - The target numeric value
 * @param {string} prefix - Optional currency prefix (e.g. "₹")
 * @param {string} suffix - Optional suffix (e.g. " / adult")
 * @param {string} className - Tailwind/CSS classes
 */
const AnimatedNumber = ({ value, prefix = "", suffix = "", className = "" }) => {
  const spanRef = useRef(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (spanRef.current) {
      animateCounter(spanRef.current, value, {
        startValue: prevValueRef.current,
        prefix,
        suffix,
        duration: 600,
      });
      prevValueRef.current = value;
    }
  }, [value, prefix, suffix]);

  return (
    <span ref={spanRef} className={className}>
      {prefix}
      {Math.round(Number(value) || 0).toLocaleString("en-IN")}
      {suffix}
    </span>
  );
};
export default AnimatedNumber;
