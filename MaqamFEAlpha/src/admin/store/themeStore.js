import { create } from 'zustand';
import {
  STORAGE_KEYS,
  applyTheme,
  resolveInitialTheme,
} from '../../utils/theme';

// Admin theme store: same public API as before, now backed by the shared
// theme engine so user/admin sides never diverge.
export const useThemeStore = create((set, get) => {
  const initial = resolveInitialTheme();
  applyTheme(initial);

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (STORAGE_KEYS.includes(e.key) && (e.newValue === 'dark' || e.newValue === 'light')) {
        applyTheme(e.newValue, { persist: false });
        set({ theme: e.newValue });
      }
    });
  }

  return {
    theme: initial,
    toggle: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark';
      applyTheme(next, { animate: true });
      set({ theme: next });
    },
    setTheme: (theme) => {
      if (theme !== 'dark' && theme !== 'light') return;
      applyTheme(theme, { animate: true });
      set({ theme });
    },
  };
});
