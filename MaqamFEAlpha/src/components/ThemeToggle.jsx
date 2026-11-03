import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * Admin CRM-style theme toggle button.
 * Matches the icon button style used in Admin CRM's header:
 * - Rounded-xl icon button with smooth hover and active press micro-interactions.
 * - Sun icon in dark mode and Moon icon in light mode.
 * - Clean border, subtle background, and smooth color transitions.
 */
export default function ThemeToggle({ size = "md", className = "" }) {
  const { isDark, toggleTheme } = useTheme();

  const isSmall = size === "sm";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        inline-flex items-center justify-center rounded-xl
        border transition-all duration-200 cursor-pointer active:scale-95
        border-slate-200 bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900
        dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white
        shadow-2xs
        ${isSmall ? "h-8 w-8 p-1.5" : "h-10 w-10 p-2"}
        ${className}
      `}
    >
      {isDark ? (
        <Sun
          size={isSmall ? 16 : 19}
          className="text-amber-400 transition-transform duration-300 hover:rotate-45"
        />
      ) : (
        <Moon
          size={isSmall ? 16 : 19}
          className="text-slate-700 transition-transform duration-300 hover:-rotate-12 dark:text-slate-300"
        />
      )}
    </button>
  );
}
