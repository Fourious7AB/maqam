// Single source of truth for theme handling (framework-agnostic).
// Used by ThemeContext (user side) and themeStore (admin side).

export const THEME_KEY = 'maqam_theme';
export const LEGACY_THEME_KEY = 'maqam-admin-theme';
const STORAGE_KEYS = [THEME_KEY, LEGACY_THEME_KEY];

const isTheme = (value) => value === 'light' || value === 'dark';

export function getStoredTheme() {
  if (typeof localStorage === 'undefined') return null;
  try {
    for (const key of STORAGE_KEYS) {
      const saved = localStorage.getItem(key);
      if (isTheme(saved)) return saved;
    }
  } catch {
    /* storage unavailable */
  }
  return null;
}

export function hasActiveSession() {
  if (typeof localStorage === 'undefined') return false;
  try {
    return Boolean(
      localStorage.getItem('maqam_access_token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('AuthToken') ||
      localStorage.getItem('maqam_crm_user') ||
      localStorage.getItem('maqam_auth_user') ||
      localStorage.getItem('user')
    );
  } catch {
    return false;
  }
}

// User-side website default is strictly light.
// Only authenticated users who have selected a theme get their preference applied.
export function resolveInitialTheme() {
  if (!hasActiveSession()) {
    return 'light';
  }
  return getStoredTheme() || 'light';
}

let transitionTimer = null;
let isDispatchingTheme = false;

export function applyTheme(theme, { animate = false, persist = true } = {}) {
  if (typeof document === 'undefined' || !isTheme(theme)) return;
  const root = document.documentElement;
  const currentAttr = root.getAttribute('data-theme');

  // If already at target theme without animation, avoid redundant work and event storms
  if (!animate && currentAttr === theme) {
    return;
  }

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Short-lived class enabling colour transitions only during a toggle, so
  // normal hover/animation timings are not affected the rest of the time.
  if (animate && !reduceMotion) {
    root.classList.add('theme-transition');
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => root.classList.remove('theme-transition'), 400);
  }

  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;

  if (persist && typeof localStorage !== 'undefined') {
    STORAGE_KEYS.forEach((key) => {
      try {
        if (localStorage.getItem(key) !== theme) {
          localStorage.setItem(key, theme);
        }
      } catch {
        /* ignore */
      }
    });
  }

  if (typeof window !== 'undefined' && !isDispatchingTheme) {
    isDispatchingTheme = true;
    try {
      window.dispatchEvent(new CustomEvent('maqam:theme-changed', { detail: { theme } }));
    } catch (err) {
      console.warn('[theme] theme-changed event handler error:', err);
    } finally {
      isDispatchingTheme = false;
    }
  }
}

export { STORAGE_KEYS };
