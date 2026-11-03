import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  STORAGE_KEYS,
  applyTheme,
  resolveInitialTheme,
} from "../utils/theme";
import { tokenService } from "../admin/services/tokenService";
import authService from "../services/authService";

const ThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
  theme: "light",
});

// Best-effort: keep the backend `theme` enum in sync for logged-in users.
// Local state is the source of truth, so failures are intentionally silent.
const syncThemeToServer = (theme) => {
  if (!tokenService.getAccessToken()) return;
  authService.updateProfile({ theme }).catch(() => {});
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(resolveInitialTheme);

  // Keep <html> in sync (no animation on first mount to avoid a flash).
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Cross-tab sync and global theme change / logout listeners.
  useEffect(() => {
    const onStorage = (event) => {
      if (STORAGE_KEYS.includes(event.key) && (event.newValue === "dark" || event.newValue === "light")) {
        setThemeState(event.newValue);
      }
    };
    const onThemeChanged = (event) => {
      const nextTheme = event.detail?.theme;
      if (nextTheme && (nextTheme === "dark" || nextTheme === "light")) {
        setThemeState((current) => (current === nextTheme ? current : nextTheme));
      }
    };
    const onSessionExpired = () => {
      setThemeState((current) => {
        if (current === "light") return current;
        applyTheme("light", { animate: false });
        return "light";
      });
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("maqam:theme-changed", onThemeChanged);
    window.addEventListener("maqam:session-expired", onSessionExpired);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("maqam:theme-changed", onThemeChanged);
      window.removeEventListener("maqam:session-expired", onSessionExpired);
    };
  }, []);

  // User-initiated change: animate + persist + sync with backend.
  const setTheme = useCallback((next, { sync = true } = {}) => {
    if (next !== "dark" && next !== "light") return;
    applyTheme(next, { animate: true });
    setThemeState(next);
    if (sync) syncThemeToServer(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next, { animate: true });
      syncThemeToServer(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === "dark", toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
